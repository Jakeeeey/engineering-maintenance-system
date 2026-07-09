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
      endpoint = "/items/items?fields=id,item_name,item_type.id,item_type.type_name,item_classification.id,item_classification.classification_name";
    } else if (type === "item_type") {
      endpoint = "/items/item_type";
    } else if (type === "item_classification") {
      endpoint = "/items/item_classification";
    } else {
      return NextResponse.json({ error: "Invalid or missing reference type" }, { status: 400 });
    }

    const response = await directusFetch<{ data: unknown[] }>(endpoint);

    return NextResponse.json({ data: response.data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    let endpoint = "";
    if (type === "items") {
      endpoint = "/items/items";
    } else if (type === "item_type") {
      endpoint = "/items/item_type";
    } else if (type === "item_classification") {
      endpoint = "/items/item_classification";
    } else {
      return NextResponse.json({ error: "Invalid or missing reference type" }, { status: 400 });
    }

    const response = await directusFetch<{ data: unknown }>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return NextResponse.json({ data: response.data });
  } catch (error) {
    return jsonError(error);
  }
}
