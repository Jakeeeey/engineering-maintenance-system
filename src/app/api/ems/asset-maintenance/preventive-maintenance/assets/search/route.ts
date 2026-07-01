import { NextResponse } from "next/server";
import { directusFetch, DirectusList, jsonError } from "../../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    let filterString = "";
    
    if (!query || query.trim() === "") {
      filterString = "&limit=10";
    } else {
      const isNumeric = query.trim() !== "" && !isNaN(Number(query));
      if (isNumeric) {
        filterString = `&filter[_or][0][id][_eq]=${query}&filter[_or][1][item_id][item_name][_icontains]=${query}&limit=10`;
      } else {
        filterString = `&filter[item_id][item_name][_icontains]=${query}&limit=10`;
      }
    }

    const path = `items/assets_and_equipment?fields=*,item_id.*,item_id.item_classification.classification_name${filterString}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await directusFetch<DirectusList<Record<string, any>>>(path);
    const data = (response.data || []).map((asset) => {
      const itemName = asset.item_id?.item_name || "Unknown Item";
      const classification = asset.item_id?.item_classification?.classification_name || "Unknown Classification";
      
      return {
        id: asset.id,
        itemName,
        classification,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error, "Failed to search assets");
  }
}
