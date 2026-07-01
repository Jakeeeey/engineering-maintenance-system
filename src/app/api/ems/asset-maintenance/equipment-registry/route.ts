import { NextRequest, NextResponse } from "next/server";
import { directusFetch, DirectusList, jsonError } from "./_utils";
import { Asset } from "@/modules/engineering-maintenance-system/asset-maintenance/equipment-registry/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapToCamelCase(item: Record<string, unknown>): Asset {
  const itemIdObj = item.item_id as Record<string, unknown> | undefined;

  const currentOwnerName = item.current_owner_name as string | undefined;
  const employeeName = currentOwnerName || (item.employee as string) || "Unassigned";

  const latestRemark = item.latest_remark as string | undefined;
  const latestRemarkBy = item.latest_remark_by as string | undefined;

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
    latestRemark,
    latestRemarkBy,
    documents: item.documents as { id: string; name: string; url: string }[] | undefined,
    asset_location: item.asset_location as { location: string }[] | undefined,
    createdAt: item.date_created as string,
    updatedAt: item.date_updated as string,
  };
}

function mapToSnakeCase(item: Partial<Asset>): Record<string, unknown> {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const condition = searchParams.get("condition");
    const employee = searchParams.get("employee");

    const queryParams = new URLSearchParams();
    if (search) queryParams.set("search", search);
    if (condition) queryParams.set("filter[condition][_eq]", condition);
    if (employee) queryParams.set("filter[employee][_eq]", employee);

    // Sort by recent by default
    queryParams.set("sort", "-date_created");
    queryParams.set("fields", "*,item_id.item_name,item_id.item_type.*,item_id.item_classification.*");

    const qs = queryParams.toString();
    const endpoint = `/items/assets_and_equipment${qs ? `?${qs}` : ""}`;

    const response = await directusFetch<DirectusList<Record<string, unknown>>>(endpoint);
    const rawAssets = response.data || [];

    if (rawAssets.length > 0) {
      const assetIds = rawAssets.map(a => a.id).filter(Boolean);
      if (assetIds.length > 0) {
        try {
          const locationRes = await directusFetch<DirectusList<Record<string, unknown>>>(
            `/items/asset_location?filter[asset_id][_in]=${assetIds.join(",")}&filter[is_current_location][_eq]=1&fields=asset_id,location&limit=-1`
          );
          
          const locationsMap = new Map<string, string>();
          if (locationRes.data) {
            for (const loc of locationRes.data) {
               if (loc.asset_id && loc.location) {
                 locationsMap.set(String(loc.asset_id), String(loc.location));
               }
            }
          }
          
          for (const asset of rawAssets) {
             const mappedLocation = locationsMap.get(String(asset.id));
             if (mappedLocation) {
               asset.asset_location = [{ location: mappedLocation }];
             }
          }
        } catch (err) {
          console.warn("Failed to fetch asset locations", err);
        }

        try {
          const ownersRes = await directusFetch<DirectusList<Record<string, unknown>>>(
            `/items/asset_owners?filter[asset_id][_in]=${assetIds.join(",")}&filter[is_current_owner][_eq]=true`
          );
          
          const ownersMap = new Map<string, string>();
          if (ownersRes.data) {
            for (const owner of ownersRes.data) {
               if (owner.asset_id && owner.owner_name) {
                 ownersMap.set(String(owner.asset_id), String(owner.owner_name));
               }
            }
          }
          
          for (const asset of rawAssets) {
             const ownerName = ownersMap.get(String(asset.id));
             if (ownerName) {
               asset.current_owner_name = ownerName;
             }
          }
        } catch (err) {
          console.warn("Failed to fetch asset owners", err);
        }

        try {
          const historyRes = await directusFetch<DirectusList<Record<string, unknown>>>(
            `/items/asset_history_log?filter[asset_id][_in]=${assetIds.join(",")}&sort=-changed_at&fields=asset_id,remarks,changed_by`
          );

          const historyMap = new Map<string, Record<string, unknown>>();
          const userIds: number[] = [];

          if (historyRes.data) {
             for (const log of historyRes.data) {
               if (log.asset_id && !historyMap.has(String(log.asset_id))) {
                 historyMap.set(String(log.asset_id), log);
                 if (log.changed_by) {
                   userIds.push(Number(log.changed_by));
                 }
               }
             }
          }

          const userMap = new Map<number, string>();
          if (userIds.length > 0) {
            const uniqueUserIds = Array.from(new Set(userIds));
            const usersRes = await directusFetch<DirectusList<Record<string, unknown>>>(
              `/items/user?filter[user_id][_in]=${uniqueUserIds.join(",")}&fields=user_id,user_fname,user_lname`
            );
            
            if (usersRes.data) {
              for (const u of usersRes.data) {
                if (u.user_id) {
                  userMap.set(Number(u.user_id), `${u.user_fname || ""} ${u.user_lname || ""}`.trim());
                }
              }
            }
          }

          for (const asset of rawAssets) {
             const log = historyMap.get(String(asset.id));
             if (log) {
               asset.latest_remark = log.remarks;
               const fullName = userMap.get(Number(log.changed_by));
               asset.latest_remark_by = fullName || "Unknown User";
             }
          }
        } catch (err) {
          console.warn("Failed to fetch asset history", err);
        }

        try {
          const docsRes = await directusFetch<DirectusList<Record<string, unknown>>>(
            `/items/asset_documents?filter[asset_id][_in]=${assetIds.join(",")}&fields=asset_id,file_path`
          );

          const fileIds: string[] = [];
          if (docsRes.data) {
            for (const doc of docsRes.data) {
              if (doc.file_path) fileIds.push(String(doc.file_path));
            }
          }
          const uniqueFileIds = Array.from(new Set(fileIds));

          const filesMap = new Map<string, string>();
          if (uniqueFileIds.length > 0) {
            const filesRes = await directusFetch<DirectusList<Record<string, unknown>>>(
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

          const docsMap = new Map<string, { id: string; name: string; url: string }[]>();
          if (docsRes.data) {
            for (const doc of docsRes.data) {
              if (doc.asset_id && doc.file_path) {
                const assetIdStr = String(doc.asset_id);
                const fileId = String(doc.file_path);
                const fileName = filesMap.get(fileId) || "Unknown Document";
                
                if (!docsMap.has(assetIdStr)) {
                  docsMap.set(assetIdStr, []);
                }
                docsMap.get(assetIdStr)?.push({
                  id: fileId,
                  name: fileName,
                  url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${fileId}`
                });
              }
            }
          }

          for (const asset of rawAssets) {
             const docs = docsMap.get(String(asset.id));
             if (docs) {
               asset.documents = docs;
             }
          }
        } catch (err) {
          console.warn("Failed to fetch asset documents", err);
        }
      }
    }

    const data = rawAssets.map(mapToCamelCase);

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let classificationId = null;
    if (body.itemClassification) {
      const classRes = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/item_classification?filter[classification_name][_eq]=${encodeURIComponent(body.itemClassification as string)}`);
      if (classRes.data && classRes.data.length > 0) {
        classificationId = classRes.data[0].id;
      } else {
        const newClass = await directusFetch<{ data: Record<string, unknown> }>("/items/item_classification", {
          method: "POST",
          body: JSON.stringify({ classification_name: body.itemClassification })
        });
        classificationId = newClass.data.id;
      }
    }

    let typeId = null;
    if (body.itemType) {
      const typeRes = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/item_type?filter[type_name][_eq]=${encodeURIComponent(body.itemType as string)}`);
      if (typeRes.data && typeRes.data.length > 0) {
        typeId = typeRes.data[0].id;
      } else {
        const newType = await directusFetch<{ data: Record<string, unknown> }>("/items/item_type", {
          method: "POST",
          body: JSON.stringify({ type_name: body.itemType })
        });
        typeId = newType.data.id;
      }
    }

    let finalItemId = body.itemId;
    if (!finalItemId && body.itemName) {
      const itemRes = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/items?filter[item_name][_eq]=${encodeURIComponent(body.itemName as string)}`);
      if (itemRes.data && itemRes.data.length > 0) {
        finalItemId = itemRes.data[0].id;
      } else {
        const newItem = await directusFetch<{ data: Record<string, unknown> }>("/items/items", {
          method: "POST",
          body: JSON.stringify({ 
            item_name: body.itemName,
            item_classification: classificationId,
            item_type: typeId
          })
        });
        finalItemId = newItem.data.id;
      }
    }

    body.itemId = finalItemId;
    const payload = mapToSnakeCase(body);

    const response = await directusFetch<{ data: Record<string, unknown> }>("/items/assets_and_equipment", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (body.employee) {
      await directusFetch("/items/asset_owners", {
        method: "POST",
        body: JSON.stringify({
          asset_id: response.data.id,
          owner_name: body.employee,
          is_current_owner: 1,
        }),
      });
    }

    if (typeof body.location === 'string' && body.location.trim() !== '') {
      await directusFetch("/items/asset_location", {
        method: "POST",
        body: JSON.stringify({
          asset_id: response.data.id,
          location: body.location.trim(),
          assigned_by: 133, // Default user id for now, matches employee upload
          is_current_location: 1
        }),
      });
    }

    if (body.documents && Array.isArray(body.documents)) {
      for (const docId of body.documents) {
        await directusFetch("/items/asset_documents", {
          method: "POST",
          body: JSON.stringify({
            asset_id: response.data.id,
            file_path: docId,
            uploaded_by: 133 // Replace with dynamic user id if available
          })
        });
      }
    }

    return NextResponse.json({ data: mapToCamelCase(response.data) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
