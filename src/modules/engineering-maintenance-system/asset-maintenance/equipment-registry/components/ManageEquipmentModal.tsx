"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Asset } from "../types";
import { useUpdateEquipment, useUpdateCondition, useAssignOwner, useGetReferences } from "../hooks/useEquipmentRegistry";

const detailsSchema = z.object({
  itemName: z.string().min(1, "Item Name is required"),
  itemClassification: z.string().min(1, "Classification is required"),
  itemType: z.string().min(1, "Type is required"),
  serial: z.string().min(1, "Serial number is required"),
  barcode: z.string().min(1, "Barcode is required"),
  rfidCode: z.string().min(1, "RFID Code is required"),
  lifeSpan: z.string().min(1, "Life span must be at least 1"),
  dateAcquired: z.string().min(1, "Date acquired is required"),
  location: z.string().min(1, "Location is required"),
  isActive: z.boolean(),
});

const conditionSchema = z.object({
  condition: z.string().min(1, "Condition is required"),
  remarks: z.string().min(1, "Remarks are required to log this change"),
});

const ownershipSchema = z.object({
  ownerName: z.string().min(1, "New owner name is required"),
});

type DetailsValues = z.infer<typeof detailsSchema>;
type ConditionValues = z.infer<typeof conditionSchema>;
type OwnershipValues = z.infer<typeof ownershipSchema>;

interface ManageEquipmentModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ManageEquipmentModal({ asset, isOpen, onClose, onSuccess }: ManageEquipmentModalProps) {
  const { mutateAsync: updateEquipment, isPending: isUpdatingDetails } = useUpdateEquipment();
  const { mutateAsync: updateCondition, isPending: isUpdatingCondition } = useUpdateCondition();
  const { mutateAsync: assignOwner, isPending: isAssigningOwner } = useAssignOwner();

  const { data: items = [] } = useGetReferences("items");
  const { data: itemClassifications = [] } = useGetReferences("item_classification");
  const { data: itemTypes = [] } = useGetReferences("item_type");

  const [itemNameInput, setItemNameInput] = useState("");
  const [itemClassificationInput, setItemClassificationInput] = useState("");
  const [itemTypeInput, setItemTypeInput] = useState("");

  const [itemNameOpen, setItemNameOpen] = useState(false);
  const [itemClassificationOpen, setItemClassificationOpen] = useState(false);
  const [itemTypeOpen, setItemTypeOpen] = useState(false);

  const filteredItems = (items || []).filter((i: Record<string, unknown>) =>
    String(i.item_name).toLowerCase().includes(itemNameInput.toLowerCase())
  );
  const filteredClassifications = (itemClassifications || []).filter((c: Record<string, unknown>) =>
    String(c.classification_name).toLowerCase().includes(itemClassificationInput.toLowerCase())
  );
  const filteredTypes = (itemTypes || []).filter((t: Record<string, unknown>) =>
    String(t.type_name).toLowerCase().includes(itemTypeInput.toLowerCase())
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newDocumentFiles, setNewDocumentFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Forms
  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { itemName: "", itemClassification: "", itemType: "", serial: "", barcode: "", rfidCode: "", lifeSpan: "", dateAcquired: "", location: "", isActive: true },
  });

  const conditionForm = useForm<ConditionValues>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { condition: "Good", remarks: "" },
  });

  const ownershipForm = useForm<OwnershipValues>({
    resolver: zodResolver(ownershipSchema),
    defaultValues: { ownerName: "" },
  });

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  const selectedCondition = useWatch({ control: conditionForm.control, name: "condition" });

  useEffect(() => {
    if (asset) {
      detailsForm.reset({
        itemName: asset.itemName || "",
        itemClassification: asset.itemClassification || "",
        itemType: asset.itemType || "",
        serial: asset.serial || "",
        barcode: asset.barcode || "",
        rfidCode: asset.rfidCode || "",
        lifeSpan: asset.lifeSpan?.toString() || "",
        dateAcquired: asset.dateAcquired ? asset.dateAcquired.split("T")[0] : "",
        location: asset.asset_location?.[0]?.location || "",
        isActive: asset.isActive ?? true,
      });
      setItemNameInput(asset.itemName || "");
      setItemClassificationInput(asset.itemClassification || "");
      setItemTypeInput(asset.itemType || "");

      conditionForm.reset({ condition: asset.condition || "Good", remarks: "" });
      ownershipForm.reset({ ownerName: asset.employee || "" });
      setImageFile(null);
      setNewDocumentFiles([]);
    }
  }, [asset, detailsForm, conditionForm, ownershipForm]);

  const uploadFile = async (file: File, type: "image" | "document") => {
    const formData = new FormData();
    formData.append("file", file);
    const endpoint = type === "image"
      ? "/api/ems/asset-maintenance/equipment-registry/asset-image-upload"
      : "/api/ems/asset-maintenance/equipment-registry/asset-document-upload";
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.data?.id;
  };

  const onDetailsSubmit = async (values: DetailsValues) => {
    if (!asset) return;
    if (itemNameInput !== values.itemName) {
      detailsForm.setError("itemName", { type: "manual", message: "Unregistered input. Please select from the list or register." });
      return;
    }
    if (itemClassificationInput !== values.itemClassification) {
      detailsForm.setError("itemClassification", { type: "manual", message: "Unregistered input. Please select from the list or register." });
      return;
    }
    if (itemTypeInput !== values.itemType) {
      detailsForm.setError("itemType", { type: "manual", message: "Unregistered input. Please select from the list or register." });
      return;
    }
    try {
      setIsUploading(true);
      let imageId = asset.itemImage;
      if (imageFile) {
        imageId = await uploadFile(imageFile, "image");
      }

      const docIds = [];
      for (const doc of newDocumentFiles) {
        const docId = await uploadFile(doc, "document");
        if (docId) docIds.push(docId);
      }

      await updateEquipment({
        id: asset.id,
        payload: {
          itemName: values.itemName,
          itemClassification: values.itemClassification,
          itemType: values.itemType,
          serial: values.serial,
          barcode: values.barcode,
          rfidCode: values.rfidCode,
          lifeSpan: Number(values.lifeSpan),
          dateAcquired: values.dateAcquired,
          location: values.location,
          isActive: values.isActive,
          itemImage: imageId,
          newDocuments: docIds.length > 0 ? docIds : undefined,
        }
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      const err = error as { isDuplicateError?: boolean; duplicates?: { serial?: string; barcode?: string; rfidCode?: string }[] } | null;
      if (err?.isDuplicateError) {
        const duplicates = err.duplicates || [];
        let hasSerial = false, hasBarcode = false, hasRfid = false;
        for (const d of duplicates) {
          if (d.serial === values.serial) hasSerial = true;
          if (d.barcode === values.barcode) hasBarcode = true;
          if (d.rfidCode === values.rfidCode) hasRfid = true;
        }
        if (hasSerial) detailsForm.setError("serial", { type: "manual", message: "Serial number already exists." });
        if (hasBarcode) detailsForm.setError("barcode", { type: "manual", message: "Barcode already exists." });
        if (hasRfid) detailsForm.setError("rfidCode", { type: "manual", message: "RFID code already exists." });
      } else {
        console.error("Failed to update equipment details", error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const onConditionSubmit = async (values: ConditionValues) => {
    if (!asset) return;
    try {
      await updateCondition({ id: asset.id, condition: values.condition, remarks: values.remarks });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update condition", error);
    }
  };

  const onOwnershipSubmit = async (values: OwnershipValues) => {
    if (!asset) return;
    try {
      await assignOwner({ id: asset.id, ownerName: values.ownerName });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to reassign owner", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={setPortalNode} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Equipment: {asset?.itemName}</DialogTitle>
          <DialogDescription>
            Update details, condition, or ownership for this asset.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="condition">Condition</TabsTrigger>
            <TabsTrigger value="ownership">Ownership</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Form {...detailsForm}>
              <form onSubmit={detailsForm.handleSubmit(onDetailsSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={detailsForm.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <Combobox
                        open={itemNameOpen}
                        onOpenChange={setItemNameOpen}
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val);
                          setItemNameInput(val || "");
                          if (val) {
                            const matched = items.find((i: Record<string, unknown>) => i.item_name === val);
                            if (matched) {
                              const c = (matched.item_classification as Record<string, unknown>)?.classification_name || "";
                              const t = (matched.item_type as Record<string, unknown>)?.type_name || "";
                              detailsForm.setValue("itemClassification", String(c));
                              setItemClassificationInput(String(c));
                              detailsForm.setValue("itemType", String(t));
                              setItemTypeInput(String(t));
                            }
                          }
                        }}
                      >
                        <FormControl>
                          <ComboboxInput
                            placeholder="Type to search or add new item..."
                            onChange={(e) => setItemNameInput(e.target.value)}
                          />
                        </FormControl>
                        <ComboboxContent className="flex flex-col overflow-hidden" portalContainer={portalNode}>
                          <ComboboxList className="overflow-y-auto" style={{ maxHeight: "200px" }}>
                            {filteredItems.length > 0 ? (
                              filteredItems.map((i: Record<string, unknown>) => (
                                <ComboboxItem key={String(i.id)} value={String(i.item_name)}>
                                  {String(i.item_name)}
                                </ComboboxItem>
                              ))
                            ) : (
                              <div className="p-3 text-sm text-muted-foreground text-center">No matches found.</div>
                            )}
                          </ComboboxList>
                          <div className="bg-background p-2 border-t mt-auto">
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full justify-start"
                              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={() => {
                                if (!itemNameInput) return;
                                const exists = items.find((i: Record<string, unknown>) =>
                                  String(i.item_name).toLowerCase() === itemNameInput.toLowerCase()
                                );
                                if (exists) {
                                  detailsForm.setError("itemName", { type: "manual", message: "Already exists. Please select it from the list." });
                                  return;
                                }
                                field.onChange(itemNameInput);
                                setItemNameOpen(false);
                              }}
                            >
                              Use new name
                            </Button>
                          </div>
                        </ComboboxContent>
                      </Combobox>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={detailsForm.control}
                    name="itemClassification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classification</FormLabel>
                        <Combobox
                          open={itemClassificationOpen}
                          onOpenChange={setItemClassificationOpen}
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setItemClassificationInput(val || "");
                          }}
                        >
                          <FormControl>
                            <ComboboxInput
                              placeholder="e.g. Heavy Machinery"
                              onChange={(e) => setItemClassificationInput(e.target.value)}
                            />
                          </FormControl>
                          <ComboboxContent className="flex flex-col overflow-hidden" portalContainer={portalNode}>
                            <ComboboxList className="overflow-y-auto" style={{ maxHeight: "200px" }}>
                              {filteredClassifications.length > 0 ? (
                                filteredClassifications.map((c: Record<string, unknown>) => (
                                  <ComboboxItem key={String(c.id)} value={String(c.classification_name)}>
                                    {String(c.classification_name)}
                                  </ComboboxItem>
                                ))
                              ) : (
                                <div className="p-3 text-sm text-muted-foreground text-center">No matches found.</div>
                              )}
                            </ComboboxList>
                            <div className="bg-background p-2 border-t mt-auto">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-start"
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={() => {
                                  if (!itemClassificationInput) return;
                                  const exists = itemClassifications.find((c: Record<string, unknown>) =>
                                    String(c.classification_name).toLowerCase() === itemClassificationInput.toLowerCase()
                                  );
                                  if (exists) {
                                    detailsForm.setError("itemClassification", { type: "manual", message: "Already exists. Please select it from the list." });
                                    return;
                                  }
                                  field.onChange(itemClassificationInput);
                                  setItemClassificationOpen(false);
                                }}
                              >
                                Use new classification
                              </Button>
                            </div>
                          </ComboboxContent>
                        </Combobox>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="itemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Combobox
                          open={itemTypeOpen}
                          onOpenChange={setItemTypeOpen}
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setItemTypeInput(val || "");
                          }}
                        >
                          <FormControl>
                            <ComboboxInput
                              placeholder="e.g. Generator"
                              onChange={(e) => setItemTypeInput(e.target.value)}
                            />
                          </FormControl>
                          <ComboboxContent className="flex flex-col overflow-hidden" portalContainer={portalNode}>
                            <ComboboxList className="overflow-y-auto" style={{ maxHeight: "200px" }}>
                              {filteredTypes.length > 0 ? (
                                filteredTypes.map((t: Record<string, unknown>) => (
                                  <ComboboxItem key={String(t.id)} value={String(t.type_name)}>
                                    {String(t.type_name)}
                                  </ComboboxItem>
                                ))
                              ) : (
                                <div className="p-3 text-sm text-muted-foreground text-center">No matches found.</div>
                              )}
                            </ComboboxList>
                            <div className="bg-background p-2 border-t mt-auto">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-start"
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={() => {
                                  if (!itemTypeInput) return;
                                  const exists = itemTypes.find((t: Record<string, unknown>) =>
                                    String(t.type_name).toLowerCase() === itemTypeInput.toLowerCase()
                                  );
                                  if (exists) {
                                    detailsForm.setError("itemType", { type: "manual", message: "Already exists. Please select it from the list." });
                                    return;
                                  }
                                  field.onChange(itemTypeInput);
                                  setItemTypeOpen(false);
                                }}
                              >
                                Use new type
                              </Button>
                            </div>
                          </ComboboxContent>
                        </Combobox>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="rfidCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFID Code</FormLabel>
                        <FormControl><Input placeholder="Enter RFID code" autoComplete="off" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="serial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl><Input placeholder="Serial No." autoComplete="off" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl><Input placeholder="Enter barcode" autoComplete="off" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="lifeSpan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Life Span (Months)</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl><Input placeholder="Enter location" autoComplete="off" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="dateAcquired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Acquired</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={detailsForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-muted-foreground">Set whether this equipment is currently active and in use.</div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Update Image (Optional)</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="space-y-2 py-2">
                  <FormLabel>Upload Additional Documents</FormLabel>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setNewDocumentFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  {newDocumentFiles.length > 0 && (
                    <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                      {newDocumentFiles.map((file, i) => <li key={i}>{file.name}</li>)}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isUpdatingDetails || isUploading}>Cancel</Button>
                  <Button type="submit" disabled={isUpdatingDetails || isUploading}>
                    {isUpdatingDetails || isUploading ? "Saving..." : "Save Details"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="condition">
            <Form {...conditionForm}>
              <form onSubmit={conditionForm.handleSubmit(onConditionSubmit)} className="space-y-4 pt-4">
                <div className="mb-4 text-sm text-muted-foreground">
                  Current Condition: <strong>{asset?.condition || "Unknown"}</strong>
                </div>
                <FormField
                  control={conditionForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Condition</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper">
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Bad">Bad</SelectItem>
                          <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                          <SelectItem value="Discontinued">Discontinued</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedCondition === "Discontinued" && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Marking this asset as Discontinued may require you to pause or cancel any active Preventive Maintenance schedules for it.
                    </AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={conditionForm.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks / Reason</FormLabel>
                      <FormControl><Textarea placeholder="Why is the condition changing?" className="resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isUpdatingCondition}>Cancel</Button>
                  <Button type="submit" disabled={isUpdatingCondition}>
                    {isUpdatingCondition ? "Updating..." : "Update Condition"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="ownership">
            <Form {...ownershipForm}>
              <form onSubmit={ownershipForm.handleSubmit(onOwnershipSubmit)} className="space-y-4 pt-4">
                <div className="mb-4 text-sm text-muted-foreground">
                  Current Owner: <strong>{asset?.employee || "Unassigned"}</strong>
                </div>
                <FormField
                  control={ownershipForm.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Owner Name</FormLabel>
                      <FormControl><Input placeholder="Employee, Department, or Project" autoComplete="off" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isAssigningOwner}>Cancel</Button>
                  <Button type="submit" disabled={isAssigningOwner}>
                    {isAssigningOwner ? "Assigning..." : "Reassign Owner"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
