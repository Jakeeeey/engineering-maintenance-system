import { NextResponse } from "next/server";
import { directusFetch, DirectusList, DirectusItem, jsonError } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    let path = "items/maintenance_work_orders?sort=-generated_at";
    if (assetId) {
      path += `&filter[asset_id][_eq]=${assetId}`;
    }

    const response = await directusFetch<DirectusList<Record<string, unknown>>>(path);
    const data = (response.data || []).map((item) => ({
      id: item.id,
      assetId: item.asset_id,
      scheduleId: item.schedule_id,
      description: item.description,
      statusId: item.status_id,
      assignedTechnician: item.assigned_technician,
      generatedAt: item.generated_at,
      completedAt: item.completed_at,
      updatedAt: item.updated_at,
    }));

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

    // Usually status_id 3 is "Completed" (1: Pending, 2: In Progress, 3: Completed, 4: Cancelled)
    const payload = {
      status_id: 3, // Completed
      completed_at: new Date().toISOString()
    };

    const response = await directusFetch<DirectusItem<Record<string, unknown>>>(`items/maintenance_work_orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
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
    return jsonError(error, "Failed to complete work order");
  }
}
