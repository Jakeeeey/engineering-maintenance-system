import { NextRequest, NextResponse } from "next/server";
import { directusFetch, jsonError } from "../_utils";
import { Asset } from "@/modules/engineering-maintenance-system/asset-maintenance/equipment-registry/types";
import { decodeJwtPayload } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapToCamelCase(item: Record<string, unknown>): Asset {
  const itemIdObj = item.item_id as Record<string, unknown> | undefined;

  const owners = item.asset_owners as Array<Record<string, unknown>> | undefined;
  const currentOwner = owners?.find(o => o.is_current_owner === 1 || o.is_current_owner === true);
  const employeeName = currentOwner ? currentOwner.owner_name : (item.employee as string || "Unassigned");

  return {
    id: item.id as string,
    itemId: (itemIdObj?.id || item.item_id) as number,
    itemName: (itemIdObj?.item_name as string) || "Unknown",
    itemImage: (item.item_image as string) || undefined,
    itemClassification: (itemIdObj?.item_classification as Record<string, unknown>)?.classification_name as string || "Unknown",
    itemType: (itemIdObj?.item_type as Record<string, unknown>)?.type_name as string || "Unknown",
    serial: item.serial as string,
    barcode: item.barcode as string | undefined,
    rfidCode: item.rfid_code as string | undefined,
    lifeSpan: item.life_span as number,
    costPerItem: item.cost_per_item as number,
    dateAcquired: item.date_acquired as string,
    employee: employeeName as string,
    currentOwner: employeeName as string,
    condition: item.condition as string,
    isActive: Boolean(item.is_active),
    isActiveWarning: Number(item.is_active_warning || 0),
    documents: item.documents as { id: string; name: string; url: string }[] | undefined,
    createdAt: item.date_created as string,
    updatedAt: item.date_updated as string,
  };
}

function mapToSnakeCase(item: Partial<Asset> & Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (item.itemId !== undefined) result.item_id = item.itemId;
  if (item.serial !== undefined) result.serial = item.serial;
  if (item.barcode !== undefined) result.barcode = item.barcode;
  if (item.rfidCode !== undefined) result.rfid_code = item.rfidCode;
  if (item.lifeSpan !== undefined) result.life_span = item.lifeSpan;
  if (item.costPerItem !== undefined) result.cost_per_item = item.costPerItem;
  if (item.dateAcquired !== undefined) result.date_acquired = item.dateAcquired;
  if (item.condition !== undefined) result.condition = item.condition;
  if (item.isActive !== undefined) result.is_active = item.isActive ? 1 : 0;
  if (item.itemImage !== undefined) result.item_image = item.itemImage;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await directusFetch<{ data: Record<string, unknown> }>(`/items/assets_and_equipment/${id}?fields=*,item_id.id,item_id.item_name,item_id.item_classification.classification_name,item_id.item_type.type_name,asset_owners.*`);

    if (!response.data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const docsRes = await directusFetch<{ data: Record<string, unknown>[] }>(
        `/items/asset_documents?filter[asset_id][_eq]=${id}&fields=asset_id,file_path`
      );
      if (docsRes.data && docsRes.data.length > 0) {
        const fileIds: string[] = [];
        for (const doc of docsRes.data) {
          if (doc.file_path) fileIds.push(String(doc.file_path));
        }
        
        const uniqueFileIds = Array.from(new Set(fileIds));
        const filesMap = new Map<string, string>();
        if (uniqueFileIds.length > 0) {
          const filesRes = await directusFetch<{ data: Record<string, unknown>[] }>(
            `/files?filter[id][_in]=${uniqueFileIds.join(",")}&fields=id,filename_download`
          );
          if (filesRes.data) {
            for (const f of filesRes.data) {
              if (f.id && f.filename_download) {
                filesMap.set(String(f.id), String(f.filename_download));
              }
            }
          }
        }

        response.data.documents = docsRes.data.map(doc => {
          const fileId = String(doc.file_path);
          const fileName = filesMap.get(fileId) || "Unknown Document";
          return {
            id: fileId,
            name: fileName,
            url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${fileId}`
          };
        });
      }
    } catch (e) {
      console.warn("Failed to fetch documents", e);
    }

    return NextResponse.json({ data: mapToCamelCase(response.data) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = mapToSnakeCase(body);

    // 1. Fetch current asset to check for condition and item changes
    const currentAssetRes = await directusFetch<{ data: Record<string, unknown> }>(`/items/assets_and_equipment/${id}?fields=*,item_id.id,item_id.item_name,item_id.item_classification.classification_name,item_id.item_type.type_name`);
    const currentAsset = currentAssetRes.data;

    const token = request.cookies.get("vos_access_token")?.value;
    let currentUserId: number | null = null;
    if (token) {
      const decoded = decodeJwtPayload(token);
      const email = (decoded as Record<string, string>)?.email || (decoded as Record<string, string>)?.sub;
      if (email) {
        const userRes = await directusFetch<{ data: { user_id: number }[] }>(
          `/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&limit=1`
        );
        if (userRes.data && userRes.data.length > 0) {
          currentUserId = userRes.data[0].user_id;
        }
      }
    }

    // 2. Handle Condition changes and insert into history log
    if (body.condition && currentAsset.condition !== body.condition) {
      const conditionsRes = await directusFetch<{ data: { id: number, condition_name: string }[] }>("/items/asset_conditions");
      const prevCond = conditionsRes.data?.find(c => c.condition_name === currentAsset.condition);
      const newCond = conditionsRes.data?.find(c => c.condition_name === body.condition);

      await directusFetch("/items/asset_history_log", {
        method: "POST",
        body: JSON.stringify({
          asset_id: id,
          previous_condition_id: prevCond ? prevCond.id : null,
          new_condition_id: newCond ? newCond.id : null,
          remarks: body.remarks || "Condition updated via Manage Equipment",
          changed_by: currentUserId || 133,
        })
      });
    }

    // 3. Handle Item changes (itemName, itemClassification, itemType)
    // We update the associated `items` directly
    const itemIdObj = currentAsset.item_id as Record<string, unknown> | undefined;
    if (itemIdObj && itemIdObj.id) {
      const itemsUpdatePayload: Record<string, unknown> = {};
      if (body.itemName !== undefined && body.itemName !== itemIdObj.item_name) {
        itemsUpdatePayload.item_name = body.itemName;
      }
      
      if (body.itemClassification !== undefined) {
        // Resolve classification ID
        const classRes = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/item_classification?filter[classification_name][_eq]=${encodeURIComponent(body.itemClassification)}`);
        if (classRes.data && classRes.data.length > 0) {
          itemsUpdatePayload.item_classification = classRes.data[0].id;
        } else if (body.itemClassification) {
          const newClass = await directusFetch<{ data: Record<string, unknown> }>("/items/item_classification", {
            method: "POST",
            body: JSON.stringify({ classification_name: body.itemClassification })
          });
          itemsUpdatePayload.item_classification = newClass.data.id;
        }
      }

      if (body.itemType !== undefined) {
        // Resolve type ID
        const typeRes = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/item_type?filter[type_name][_eq]=${encodeURIComponent(body.itemType)}`);
        if (typeRes.data && typeRes.data.length > 0) {
          itemsUpdatePayload.item_type = typeRes.data[0].id;
        } else if (body.itemType) {
          const newType = await directusFetch<{ data: Record<string, unknown> }>("/items/item_type", {
            method: "POST",
            body: JSON.stringify({ type_name: body.itemType })
          });
          itemsUpdatePayload.item_type = newType.data.id;
        }
      }

      if (Object.keys(itemsUpdatePayload).length > 0) {
        await directusFetch(`/items/items/${itemIdObj.id}`, {
          method: "PATCH",
          body: JSON.stringify(itemsUpdatePayload),
        });
      }
    }

    // 4. Handle appended documents
    if (body.newDocuments && Array.isArray(body.newDocuments)) {
      for (const docId of body.newDocuments) {
        await directusFetch("/items/asset_documents", {
          method: "POST",
          body: JSON.stringify({
            asset_id: id,
            file_path: docId,
            uploaded_by: currentUserId || 133
          })
        });
      }
    }

    // 5. Handle Location changes
    if (body.location !== undefined) {
      const activeLocRes = await directusFetch<{ data: { id: number, location: string }[] }>(
        `/items/asset_location?filter[asset_id][_eq]=${id}&filter[is_current_location][_eq]=1`
      );
      const activeLoc = activeLocRes.data?.[0];
      
      const newLoc = typeof body.location === 'string' ? body.location.trim() : "";

      if (!activeLoc) {
        if (newLoc !== "") {
          await directusFetch("/items/asset_location", {
            method: "POST",
            body: JSON.stringify({
              asset_id: id,
              location: newLoc,
              assigned_by: currentUserId || 133,
              is_current_location: 1
            })
          });
        }
      } else {
        if (activeLoc.location !== newLoc) {
          await directusFetch(`/items/asset_location/${activeLoc.id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_current_location: 0 })
          });

          if (newLoc !== "") {
            await directusFetch("/items/asset_location", {
              method: "POST",
              body: JSON.stringify({
                asset_id: id,
                location: newLoc,
                assigned_by: currentUserId || 133,
                is_current_location: 1
              })
            });
          }
        }
      }
    }

    // 6. Update the actual asset
    const response = await directusFetch<{ data: Record<string, unknown> }>(`/items/assets_and_equipment/${id}?fields=*,item_id.id,item_id.item_name,item_id.item_classification.classification_name,item_id.item_type.type_name,asset_owners.*`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    return NextResponse.json({ data: mapToCamelCase(response.data) });
  } catch (error) {
    return jsonError(error);
  }
}
