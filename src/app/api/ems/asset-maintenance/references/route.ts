import { NextRequest, NextResponse } from "next/server";
import { directusFetch, jsonError } from "../equipment-registry/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let endpoint = "";

    if (type === "items") {
      endpoint = "/items/items?fields=*,item_type.*,item_classification.*";
    } else if (type === "item_types") {
      endpoint = "/items/item_types";
    } else {
      return NextResponse.json({ error: "Invalid or missing reference type" }, { status: 400 });
    }

    const response = await directusFetch<{ data: unknown[] }>(endpoint);

    return NextResponse.json({ data: response.data });
  } catch (error) {
    return jsonError(error);
  }
}
