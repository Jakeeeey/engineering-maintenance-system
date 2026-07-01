import { NextResponse } from "next/server";
import { directusFetch, DirectusItem, DirectusList, jsonError } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Convert to snake_case
    const payload = {
      asset_id: body.assetId,
      meter_value: body.meterValue,
      unit: body.unit,
    };

    const response = await directusFetch<DirectusItem<Record<string, unknown>>>("items/usage_meter_logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.data) {
      throw new Error("Failed to create usage meter log");
    }

    const item = response.data;
    const assetId = item.asset_id as string;
    const meterValue = item.meter_value as number;

    const log = {
      id: item.id,
      assetId: item.asset_id,
      meterValue: item.meter_value,
      unit: item.unit,
      recordedBy: item.recorded_by,
      recordedAt: item.recorded_at,
    };

    // --- EVENT-DRIVEN GENERATION (USAGE-BASED CHECKS) ---
    try {
      const serviceToken = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

      // 1. Fetch active schedules attached to asset_id where next_due_usage is not null
      const schedulesPath = `items/maintenance_schedules?filter[is_active][_eq]=true&filter[asset_id][_eq]=${assetId}&filter[next_due_usage][_nnull]=true`;
      const schedulesResponse = await directusFetch<DirectusList<Record<string, unknown>>>(schedulesPath);
      const activeSchedules = schedulesResponse.data || [];

      // 2. Evaluate logged meter_value against each schedule's next_due_usage
      const currentMeter = parseFloat(String(meterValue));
      
      for (const schedule of activeSchedules) {
        const scheduleId = schedule.id;
        const targetUsage = parseFloat(String(schedule.next_due_usage));

        if (!isNaN(currentMeter) && !isNaN(targetUsage) && currentMeter >= targetUsage) {
          // 3. Check if a pending work order already exists for this specific schedule (status_id = 1)
          const existingWOPath = `items/maintenance_work_orders?filter[schedule_id][_eq]=${scheduleId}&filter[status_id][_eq]=1`;
          const existingWOResponse = await directusFetch<DirectusList<Record<string, unknown>>>(existingWOPath);

          if (!existingWOResponse.data || existingWOResponse.data.length === 0) {
            // 4. Concurrency prevention: Insert immediately if no pending work order exists
            try {
              await directusFetch("items/maintenance_work_orders", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serviceToken}`
                },
                body: JSON.stringify({
                  schedule_id: scheduleId,
                  asset_id: assetId,
                  status_id: 1, // Pending
                  description: "Automated PM Task - Usage Limit Reached",
                })
              });
            } catch (postError) {
              console.error(`Error generating automated work order for schedule ${scheduleId}:`, postError);
            }
          }
        }
      }
    } catch (automationError) {
      // Catch automation errors so they don't break the log creation response
      console.error("Usage-based PM automation failed:", automationError);
    }

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to log usage");
  }
}
