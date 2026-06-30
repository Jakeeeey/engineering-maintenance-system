import { NextRequest, NextResponse } from "next/server";
import { directusFetch, jsonError } from "../../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { ownerName } = await request.json();

    if (!ownerName) {
      return NextResponse.json({ error: "Owner name is required" }, { status: 400 });
    }

    // 1. Fetch current active owners
    const currentOwnersResponse = await directusFetch<{ data: Record<string, unknown>[] }>(
      `/items/asset_owners?filter[asset_id][_eq]=${id}&filter[is_current_owner][_eq]=1`
    );

    // 2. If active owner(s) exist, loop through and PATCH each to revoke
    if (currentOwnersResponse.data && currentOwnersResponse.data.length > 0) {
      for (const owner of currentOwnersResponse.data) {
        await directusFetch(`/items/asset_owners/${owner.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            is_current_owner: 0,
            revoked_at: new Date().toISOString(),
          }),
        });
      }
    }

    // 3. POST new owner
    await directusFetch("/items/asset_owners", {
      method: "POST",
      body: JSON.stringify({
        asset_id: id,
        owner_name: ownerName,
        is_current_owner: 1,
      }),
    });

    // 4. Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
