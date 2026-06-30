import { NextResponse } from "next/server";
import { directusFetch, DirectusItem, jsonError } from "../_utils";

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
    const log = {
      id: item.id,
      assetId: item.asset_id,
      meterValue: item.meter_value,
      unit: item.unit,
      recordedBy: item.recorded_by,
      recordedAt: item.recorded_at,
    };

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to log usage");
  }
}
