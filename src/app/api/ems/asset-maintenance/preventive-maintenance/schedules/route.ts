import { NextResponse } from "next/server";
import { directusFetch, DirectusList, DirectusItem, jsonError } from "../_utils";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    // Added fields query for Sub-Step B
    let path = "items/maintenance_schedules?sort=-created_at&fields=*,asset_id.*,asset_id.item_id.item_name,asset_id.item_id.item_classification.classification_name";
    if (assetId) {
      path += `&filter[asset_id][_eq]=${assetId}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await directusFetch<DirectusList<Record<string, any>>>(path);
    const rawSchedules = response.data || [];
    const assetIds = Array.from(new Set(rawSchedules.map(item => typeof item.asset_id === 'object' ? item.asset_id?.id : item.asset_id))).filter(Boolean);

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

    const data = rawSchedules.map((item) => {
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
    });

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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Missing schedule ID" }, { status: 400 });
    }

    // Convert to snake_case
    const payload: Record<string, unknown> = {};
    if (updates.timeIntervalValue !== undefined) payload.time_interval_value = updates.timeIntervalValue;
    if (updates.timeIntervalUnit !== undefined) payload.time_interval_unit = updates.timeIntervalUnit;
    if (updates.usageIntervalValue !== undefined) payload.usage_interval_value = updates.usageIntervalValue;
    if (updates.usageIntervalUnit !== undefined) payload.usage_interval_unit = updates.usageIntervalUnit;
    if (updates.nextDueDate !== undefined) payload.next_due_date = updates.nextDueDate;
    if (updates.nextDueUsage !== undefined) payload.next_due_usage = updates.nextDueUsage;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    // Use the user's session token to enforce RBAC
    const authHeader = request.headers.get("Authorization");
    const init: RequestInit = { headers: {} };
    if (authHeader) {
      init.headers = { Authorization: authHeader };
    } else {
      const cookieStore = await cookies();
      const token = cookieStore.get("vos_access_token")?.value;
      if (token) {
        init.headers = { Authorization: `Bearer ${token}` };
      }
    }

    const response = await directusFetch<DirectusItem<Record<string, unknown>>>(`items/maintenance_schedules/${id}`, {
      method: "PATCH",
      ...init,
      body: JSON.stringify(payload),
    });

    if (!response.data) {
      throw new Error("Failed to update schedule");
    }

    const item = response.data;
    const schedule = {
      id: item.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assetId: typeof item.asset_id === 'object' ? (item.asset_id as any).id : item.asset_id,
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

    return NextResponse.json({ data: schedule });
  } catch (error) {
    return jsonError(error, "Failed to update schedule");
  }
}
