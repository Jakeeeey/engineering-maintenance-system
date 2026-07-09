"use client";

import { useState } from "react";
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
import { useLogUsage } from "../hooks/usePreventiveMaintenance";
import { AssetCombobox } from "./AssetCombobox";

const formSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  meterValue: z.string().min(1, "Meter value is required"),
  unit: z.string().min(1, "Unit is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface LogUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LogUsageModal({ isOpen, onClose, onSuccess }: LogUsageModalProps) {
  const { mutateAsync: logUsage, isPending } = useLogUsage(onSuccess);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: "",
      meterValue: "",
      unit: "Hours",
    },
  });

  const unit = useWatch({
    control: form.control,
    name: "unit",
    defaultValue: "Hours",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await logUsage({
        assetId: values.assetId,
        meterValue: Number(values.meterValue),
        unit: values.unit,
      });
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to log usage", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        ref={setPortalNode}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Log Usage Meter</DialogTitle>
          <DialogDescription className="sr-only">
            Log the current usage of the asset.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RFID Code</FormLabel>
                  <FormControl>
                    <AssetCombobox
                      value={field.value}
                      onChange={field.onChange}
                      portalContainer={portalNode}
                      requireSchedule={true}
                      emptyMessage="Equipment doesn't have any Maintenance Schedule Set or is Currently Inactive."
                      onSelectUnit={(unit) => form.setValue("unit", unit || "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="meterValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Meter Value</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input type="number" placeholder="e.g. 5200" step="0.01" {...field} className="flex-1" />
                      <span className="text-muted-foreground whitespace-nowrap font-medium min-w-[80px]">
                        / {unit || "Unit"}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Logging..." : "Log Usage"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
