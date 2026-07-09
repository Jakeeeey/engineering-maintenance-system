import { NextResponse } from "next/server";
import { directusFetch, DirectusList, jsonError } from "../../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const idQuery = searchParams.get("id");
    const requireSchedule = searchParams.get("requireSchedule") === "true";

    // Fix for Initial Asset Fetch: Fetch exactly by ID, bypassing filters
    if (idQuery) {
      if (requireSchedule) {
        const path = `items/maintenance_schedules?filter[is_active][_eq]=true&filter[asset_id][_eq]=${idQuery}&fields=usage_interval_unit,asset_id.*,asset_id.item_id.*,asset_id.item_id.item_classification.classification_name,asset_id.rfid_code`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await directusFetch<{ data: any[] }>(path);
        if (response.data && response.data.length > 0) {
          const schedule = response.data[0];
          const asset = schedule.asset_id;
          return NextResponse.json({
            data: [{
              id: asset.id,
              rfidCode: asset.rfid_code || "N/A",
              itemName: asset.item_id?.item_name || "Unknown Item",
              classification: asset.item_id?.item_classification?.classification_name || "Unknown Classification",
              usageUnit: schedule.usage_interval_unit,
            }]
          });
        }
      } else {
        const path = `items/assets_and_equipment/${idQuery}?fields=*,item_id.*,item_id.item_classification.classification_name,rfid_code`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await directusFetch<{ data: any }>(path);
        if (response.data) {
          const asset = response.data;
          return NextResponse.json({
            data: [{
              id: asset.id,
              rfidCode: asset.rfid_code || "N/A",
              itemName: asset.item_id?.item_name || "Unknown Item",
              classification: asset.item_id?.item_classification?.classification_name || "Unknown Classification",
            }]
          });
        }
      }
      return NextResponse.json({ data: [] });
    }

    let filterString = "";
    let path = "";

    if (requireSchedule) {
      // Query maintenance_schedules instead, expanding the asset_id to get equipment details
      if (!query || query.trim() === "") {
        filterString = "&limit=20"; // slightly higher limit in case of duplicates
      } else {
        filterString = `&filter[_or][0][asset_id][rfid_code][_icontains]=${query}&filter[_or][1][asset_id][item_id][item_name][_icontains]=${query}&limit=20`;
      }
      path = `items/maintenance_schedules?filter[is_active][_eq]=true&fields=usage_interval_unit,asset_id.*,asset_id.item_id.*,asset_id.item_id.item_classification.classification_name,asset_id.rfid_code${filterString}`;
    } else {
      // Standard search across all assets
      if (!query || query.trim() === "") {
        filterString = "&limit=10";
      } else {
        filterString = `&filter[_or][0][rfid_code][_icontains]=${query}&filter[_or][1][item_id][item_name][_icontains]=${query}&limit=10`;
      }
      path = `items/assets_and_equipment?fields=*,item_id.*,item_id.item_classification.classification_name,rfid_code${filterString}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await directusFetch<DirectusList<Record<string, any>>>(path);
    
    // Extract raw asset objects based on the queried table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawAssets: any[] = [];
    if (requireSchedule) {
      rawAssets = (response.data || []).map(schedule => {
        if (schedule.asset_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (schedule.asset_id as any).usageUnit = schedule.usage_interval_unit;
        }
        return schedule.asset_id;
      }).filter(Boolean);
    } else {
      rawAssets = response.data || [];
    }

    const mappedData = rawAssets.map((asset) => {
      const itemName = asset.item_id?.item_name || "Unknown Item";
      const classification = asset.item_id?.item_classification?.classification_name || "Unknown Classification";
      
      return {
        id: asset.id,
        rfidCode: asset.rfid_code || "N/A",
        itemName,
        classification,
        usageUnit: asset.usageUnit || undefined,
      };
    });

    // Deduplicate by asset ID (needed if an asset has multiple active schedules)
    // Smart prioritization deduplication loop:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueMap = new Map<number, any>();
    for (const item of mappedData) {
      const existing = uniqueMap.get(item.id);
      // If not in map yet, OR if existing has no unit but the current one does, save it
      if (!existing || (!existing.usageUnit && item.usageUnit)) {
        uniqueMap.set(item.id, item);
      }
    }
    const uniqueData = Array.from(uniqueMap.values()).slice(0, 10);

    return NextResponse.json({ data: uniqueData });
  } catch (error) {
    return jsonError(error, "Failed to search assets");
  }
}
