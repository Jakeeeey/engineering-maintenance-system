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
  barcode: z.string().optional(),
  rfidCode: z.string().optional(),
  costPerItem: z.string().min(1, "Cost must be a positive number"),
  lifeSpan: z.string().min(1, "Life span must be at least 1"),
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
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newDocumentFiles, setNewDocumentFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Forms
  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { itemName: "", itemClassification: "", itemType: "", serial: "", barcode: "", rfidCode: "", costPerItem: "", lifeSpan: "", isActive: true },
  });

  const conditionForm = useForm<ConditionValues>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { condition: "Good", remarks: "" },
  });

  const ownershipForm = useForm<OwnershipValues>({
    resolver: zodResolver(ownershipSchema),
    defaultValues: { ownerName: "" },
  });

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
        costPerItem: asset.costPerItem?.toString() || "",
        lifeSpan: asset.lifeSpan?.toString() || "",
        isActive: asset.isActive ?? true,
      });
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
          costPerItem: Number(values.costPerItem),
          lifeSpan: Number(values.lifeSpan),
          isActive: values.isActive,
          itemImage: imageId,
          newDocuments: docIds.length > 0 ? docIds : undefined,
        }
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update equipment details", error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <FormControl>
                        <Input 
                          placeholder="Type to search or add new item..." 
                          list="manage-items-list"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const matched = items.find((i: Record<string, unknown>) => String(i.item_name).toLowerCase() === e.target.value.toLowerCase());
                            if (matched) {
                              const c = (matched.item_classification as Record<string, unknown>)?.classification_name || "";
                              const t = (matched.item_type as Record<string, unknown>)?.type_name || "";
                              detailsForm.setValue("itemClassification", String(c));
                              detailsForm.setValue("itemType", String(t));
                            }
                          }}
                        />
                      </FormControl>
                      <datalist id="manage-items-list">
                        {items.map((i: Record<string, unknown>) => (
                          <option key={String(i.id)} value={String(i.item_name)} />
                        ))}
                      </datalist>
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
                        <FormControl><Input placeholder="e.g. Heavy Machinery" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="e.g. Generator" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="Serial No." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode (Optional)</FormLabel>
                        <FormControl><Input placeholder="Enter barcode" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="rfidCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFID Code (Optional)</FormLabel>
                        <FormControl><Input placeholder="Enter RFID code" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={detailsForm.control}
                    name="costPerItem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Per Item</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} /></FormControl>
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
                        <SelectContent>
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
                      <FormControl><Input placeholder="Employee, Department, or Project" {...field} /></FormControl>
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
