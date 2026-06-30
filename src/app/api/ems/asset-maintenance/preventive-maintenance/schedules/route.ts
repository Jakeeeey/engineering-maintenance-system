import { NextResponse } from "next/server";
import { directusFetch, DirectusList, DirectusItem, jsonError } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    let path = "items/maintenance_schedules?sort=-created_at";
    if (assetId) {
      path += `&filter[asset_id][_eq]=${assetId}`;
    }

    const response = await directusFetch<DirectusList<Record<string, unknown>>>(path);
    const data = (response.data || []).map((item) => ({
      id: item.id,
      assetId: item.asset_id,
      timeIntervalValue: item.time_interval_value,
      timeIntervalUnit: item.time_interval_unit,
      usageIntervalValue: item.usage_interval_value,
      usageIntervalUnit: item.usage_interval_unit,
      nextDueDate: item.next_due_date,
      nextDueUsage: item.next_due_usage,
      isActive: item.is_active === 1 || item.is_active === true,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error, "Failed to fetch schedules");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Convert to snake_case
    const payload = {
      asset_id: body.assetId,
      time_interval_value: body.timeIntervalValue ?? null,
      time_interval_unit: body.timeIntervalUnit ?? null,
      usage_interval_value: body.usageIntervalValue ?? null,
      usage_interval_unit: body.usageIntervalUnit ?? null,
      next_due_date: body.nextDueDate ?? null,
      next_due_usage: body.nextDueUsage ?? null,
      is_active: body.isActive ?? true,
    };

    const response = await directusFetch<DirectusItem<Record<string, unknown>>>("items/maintenance_schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.data) {
      throw new Error("Failed to create schedule");
    }

    const item = response.data;
    const schedule = {
      id: item.id,
      assetId: item.asset_id,
      timeIntervalValue: item.time_interval_value,
      timeIntervalUnit: item.time_interval_unit,
      usageIntervalValue: item.usage_interval_value,
      usageIntervalUnit: item.usage_interval_unit,
      nextDueDate: item.next_due_date,
      nextDueUsage: item.next_due_usage,
      isActive: item.is_active === 1 || item.is_active === true,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create schedule");
  }
}
