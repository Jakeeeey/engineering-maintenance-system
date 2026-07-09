"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCreateEquipment, useGetReferences } from "../hooks/useEquipmentRegistry";

const formSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  itemClassification: z.string().min(1, "Classification is required"),
  itemType: z.string().min(1, "Type is required"),
  serial: z.string().min(1, "Serial number is required"),
  barcode: z.string().min(1, "Barcode is required"),
  rfidCode: z.string().min(1, "RFID Code is required"),
  lifeSpan: z.string().min(1, "Expected life span is required"),
  dateAcquired: z.string().min(1, "Acquisition date is required"),
  employee: z.string().min(1, "Initial owner name is required"),
  condition: z.string().min(1, "Condition is required"),
  location: z.string().min(1, "Location is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddEquipmentModal({ isOpen, onClose, onSuccess }: AddEquipmentModalProps) {
  const { mutateAsync: createEquipment, isPending } = useCreateEquipment();

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
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: "",
      itemClassification: "",
      itemType: "",
      serial: "",
      barcode: "",
      rfidCode: "",
      lifeSpan: "",
      dateAcquired: "",
      employee: "",
      condition: "Good",
      location: "",
    },
  });

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setImageFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file: File, type: "image" | "document") => {
    const formData = new FormData();
    formData.append("file", file); // Directus expects "file"
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

  const onSubmit = async (values: FormValues) => {
    if (itemNameInput !== values.itemName) {
      form.setError("itemName", { type: "manual", message: "Unregistered input. Please select from the list or register." });
      return;
    }
    if (itemClassificationInput !== values.itemClassification) {
      form.setError("itemClassification", { type: "manual", message: "Unregistered input. Please select from the list or register." });
      return;
    }
    if (itemTypeInput !== values.itemType) {
      form.setError("itemType", { type: "manual", message: "Unregistered input. Please select from the list or register." });
      return;
    }

    try {
      setIsUploading(true);
      let imageId = undefined;
      if (imageFile) {
        imageId = await uploadFile(imageFile, "image");
      }

      const docIds = [];
      for (const doc of documentFiles) {
        const docId = await uploadFile(doc, "document");
        if (docId) docIds.push(docId);
      }

      const payload: Record<string, unknown> = {
        ...values,
        lifeSpan: Number(values.lifeSpan),
        itemImage: imageId,
        documents: docIds.length > 0 ? docIds : undefined,
        isActive: true,
      };

      await createEquipment(payload);
      form.reset();
      setImageFile(null);
      setDocumentFiles([]);
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
        if (hasSerial) form.setError("serial", { type: "manual", message: "Serial number already exists." });
        if (hasBarcode) form.setError("barcode", { type: "manual", message: "Barcode already exists." });
        if (hasRfid) form.setError("rfidCode", { type: "manual", message: "RFID code already exists." });
      } else {
        console.error("Failed to create equipment", error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={setPortalNode} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription className="sr-only">
            Fill out the form below to proceed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-2 pb-8">
            {/* SECTION 0: IMAGE */}
            <div className="space-y-4">
              <Separator />
              <div
                className={cn(
                  "border border-dashed rounded-lg p-4 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/50",
                  imageFile ? "border-primary/50" : "border-muted"
                )}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                {imageFile ? (
                  <div className="relative w-full aspect-video max-h-48 overflow-hidden rounded-md flex items-center justify-center bg-background">
                    <Image
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      width={400}
                      height={200}
                      className="object-contain h-full"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="p-4">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or WebP (max. 5MB)
                      </p>
                    </div>
                  </>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                            form.setValue("itemClassification", String(c));
                            setItemClassificationInput(String(c));
                            form.setValue("itemType", String(t));
                            setItemTypeInput(String(t));
                          }
                        }
                      }}
                    >
                      <FormControl>
                        <ComboboxInput
                          placeholder="Type or select an item"
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
                                form.setError("itemName", { type: "manual", message: "Already exists. Please select it from the list." });
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
              <FormField
                control={form.control}
                name="employee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                          placeholder="e.g. Electronics"
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
                                form.setError("itemClassification", { type: "manual", message: "Already exists. Please select it from the list." });
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
                control={form.control}
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
                          placeholder="e.g. Laptop"
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
                                form.setError("itemType", { type: "manual", message: "Already exists. Please select it from the list." });
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rfidCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFID Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter RFID code" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter serial number" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter barcode" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lifeSpan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Life Span (Months)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 60" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location" autoComplete="off" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateAcquired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Acquired</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a condition" />
                        </SelectTrigger>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <FormLabel>Documents/Manuals/Warranty</FormLabel>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setDocumentFiles(Array.from(e.target.files));
                    }
                  }}
                />
                {documentFiles.length > 0 && (
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                    {documentFiles.map((file, i) => <li key={i}>{file.name}</li>)}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending || isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isUploading}>
                {isPending || isUploading ? "Saving..." : "Save Equipment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
