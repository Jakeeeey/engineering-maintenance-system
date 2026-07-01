import { NextResponse } from "next/server";
import { directusFetch, DirectusList, DirectusItem, jsonError } from "../_utils";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    // 1. Fetch active, time-based schedules that are past due
    const now = new Date().toISOString();
    const schedulesPath = `items/maintenance_schedules?filter[is_active][_eq]=true&filter[next_due_date][_lte]=${now}`;
    const schedulesResponse = await directusFetch<DirectusList<Record<string, unknown>>>(schedulesPath);
    const dueSchedules = schedulesResponse.data || [];

    const serviceToken = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

    // 2. Evaluate each past-due schedule
    for (const schedule of dueSchedules) {
      const scheduleId = schedule.id;
      const schedAssetId = schedule.asset_id;

      // Check if a pending work order already exists for this schedule (status_id = 1)
      const existingWOPath = `items/maintenance_work_orders?filter[schedule_id][_eq]=${scheduleId}&filter[status_id][_eq]=1`;
      const existingWOResponse = await directusFetch<DirectusList<Record<string, unknown>>>(existingWOPath);

      if (!existingWOResponse.data || existingWOResponse.data.length === 0) {
        // Concurrency prevention: Only insert if no pending work order exists
        try {
          await directusFetch("items/maintenance_work_orders", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceToken}`
            },
            body: JSON.stringify({
              schedule_id: scheduleId,
              asset_id: schedAssetId,
              status_id: 1, // Pending
              description: "Automated PM Task - Time Threshold Reached",
            })
          });
        } catch (error) {
          // Gracefully handle unique constraint errors or race conditions
          console.error(`Error generating automated work order for schedule ${scheduleId}:`, error);
        }
      }
    }

    // 3. Fetch and return updated list of work orders
    let path = "items/maintenance_work_orders?sort=-generated_at&fields=*,asset_id.*,asset_id.item_id.item_name,asset_id.item_id.item_classification.classification_name";
    if (assetId) {
      path += `&filter[asset_id][_eq]=${assetId}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await directusFetch<DirectusList<Record<string, any>>>(path);
    const rawWorkOrders = response.data || [];
    const assetIds = Array.from(new Set(rawWorkOrders.map(item => typeof item.asset_id === 'object' ? item.asset_id?.id : item.asset_id))).filter(Boolean);

    const locationsMap = new Map<string, string>();
    if (assetIds.length > 0) {
      try {
        const locationRes = await directusFetch<DirectusList<Record<string, unknown>>>(
          `/items/asset_location?filter[asset_id][_in]=${assetIds.join(",")}&filter[is_current_location][_eq]=1&fields=asset_id,location&limit=-1`
        );
        if (locationRes.data) {
          for (const loc of locationRes.data) {
             if (loc.asset_id && loc.location) {
               locationsMap.set(String(loc.asset_id), String(loc.location));
             }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch asset locations", err);
      }
    }

    const data = rawWorkOrders.map((item) => {
      // Map deep relational values for Sub-Step B
      const assetData = typeof item.asset_id === 'object' ? item.asset_id : null;
      
      const assetIdVal = typeof item.asset_id === 'object' ? item.asset_id?.id : item.asset_id;
      const mappedLocation = assetIdVal ? locationsMap.get(String(assetIdVal)) : undefined;
      if (assetData && mappedLocation) {
        assetData.asset_location = [{ location: mappedLocation }];
      }
      const itemName = assetData?.item_id?.item_name || "Unknown Item";
      const classification = assetData?.item_id?.item_classification?.classification_name || "Unknown Classification";
      const location = assetData?.asset_location?.[0]?.location || "Unassigned";

      return {
        id: item.id,
        assetId: typeof item.asset_id === 'object' ? item.asset_id.id : item.asset_id,
        itemName,
        classification,
        location,
        scheduleId: item.schedule_id,
        description: item.description,
        statusId: item.status_id,
        assignedTechnician: item.assigned_technician,
        generatedAt: item.generated_at,
        completedAt: item.completed_at,
        updatedAt: item.updated_at,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error, "Failed to fetch work orders");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Missing work order ID" }, { status: 400 });
    }

    const serviceToken = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

    // 1. Fetch existing work order to get schedule_id
    const existingWOResponse = await directusFetch<DirectusItem<Record<string, unknown>>>(`items/maintenance_work_orders/${id}`);
    const existingWO = existingWOResponse.data;

    if (!existingWO) {
      throw new Error("Work order not found");
    }

    const scheduleId = existingWO.schedule_id as string;
    const completedAtDate = new Date();
    const completedAtISO = completedAtDate.toISOString();

    // 2. Fetch and update the parent schedule BEFORE updating the work order
    if (scheduleId) {
      const scheduleResponse = await directusFetch<DirectusItem<Record<string, unknown>>>(`items/maintenance_schedules/${scheduleId}`);
      const schedule = scheduleResponse.data;

      if (schedule) {
        const scheduleUpdatePayload: Record<string, unknown> = {};

        // Time-Based Advancement
        if (schedule.time_interval_value && schedule.time_interval_unit) {
          const value = schedule.time_interval_value as number;
          const unit = (schedule.time_interval_unit as string).toLowerCase();
          
          let nextDueDate = completedAtDate;
          
          switch (unit) {
            case 'days':
            case 'day':
              nextDueDate = addDays(completedAtDate, value);
              break;
            case 'weeks':
            case 'week':
              nextDueDate = addWeeks(completedAtDate, value);
              break;
            case 'months':
            case 'month':
              nextDueDate = addMonths(completedAtDate, value);
              break;
            case 'years':
            case 'year':
              nextDueDate = addYears(completedAtDate, value);
              break;
            default:
              console.warn(`Unknown time interval unit: ${unit}`);
              // Fallback to adding days
              nextDueDate = addDays(completedAtDate, value);
              break;
          }
          
          scheduleUpdatePayload.next_due_date = nextDueDate.toISOString();
        }

        // Usage-Based Advancement
        if (schedule.usage_interval_value !== null && schedule.usage_interval_value !== undefined && schedule.next_due_usage !== null && schedule.next_due_usage !== undefined) {
          const intervalValue = parseFloat(String(schedule.usage_interval_value));
          const currentNextUsage = parseFloat(String(schedule.next_due_usage));
          
          if (!isNaN(intervalValue) && !isNaN(currentNextUsage)) {
            scheduleUpdatePayload.next_due_usage = Number((currentNextUsage + intervalValue).toFixed(2));
          }
        }

        // 3. Patch the schedule first using the service token
        if (Object.keys(scheduleUpdatePayload).length > 0) {
          await directusFetch(`items/maintenance_schedules/${scheduleId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${serviceToken}`
            },
            body: JSON.stringify(scheduleUpdatePayload),
          });
        }
      }
    }

    // 4. Update the Work Order to Completed (status_id = 3)
    const woPayload = {
      status_id: 3, // Completed
      completed_at: completedAtISO
    };

    const response = await directusFetch<DirectusItem<Record<string, unknown>>>(`items/maintenance_work_orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(woPayload),
    });

    if (!response.data) {
      throw new Error("Failed to update work order");
    }

    const item = response.data;
    const workOrder = {
      id: item.id,
      assetId: item.asset_id,
      scheduleId: item.schedule_id,
      description: item.description,
      statusId: item.status_id,
      assignedTechnician: item.assigned_technician,
      generatedAt: item.generated_at,
      completedAt: item.completed_at,
      updatedAt: item.updated_at,
    };

    return NextResponse.json({ data: workOrder });
  } catch (error) {
    console.error("Failed to complete work order:", error);
    return jsonError(error, "Failed to complete work order");
  }
}
