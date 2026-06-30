import { NextRequest, NextResponse } from "next/server";
import { DIRECTUS_URL, DIRECTUS_TOKEN, jsonError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    if (!DIRECTUS_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }
    if (!DIRECTUS_TOKEN) {
      throw new Error("DIRECTUS_STATIC_TOKEN is not configured");
    }

    const res = await fetch(`${DIRECTUS_URL}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: formData,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Failed to parse response" };
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
