"use client";

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
import { useCreateSchedule } from "../hooks/usePreventiveMaintenance";

const formSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  timeIntervalValue: z.string().optional(),
  timeIntervalUnit: z.string().optional(),
  nextDueDate: z.string().optional(),
  usageIntervalValue: z.string().optional(),
  usageIntervalUnit: z.string().optional(),
  nextDueUsage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddScheduleModal({ isOpen, onClose, onSuccess }: AddScheduleModalProps) {
  const { mutateAsync: createSchedule, isPending } = useCreateSchedule(onSuccess);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetId: "",
      timeIntervalValue: "",
      timeIntervalUnit: "",
      nextDueDate: "",
      usageIntervalValue: "",
      usageIntervalUnit: "",
      nextDueUsage: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Allow concurrent time and usage intervals, but user must provide at least one
      const payload: Record<string, unknown> = {
        assetId: Number(values.assetId),
        isActive: true,
      };

      if (values.timeIntervalValue) {
        payload.timeIntervalValue = Number(values.timeIntervalValue);
        payload.timeIntervalUnit = values.timeIntervalUnit || "Days";
        if (values.nextDueDate) {
          payload.nextDueDate = values.nextDueDate;
        }
      }

      if (values.usageIntervalValue) {
        payload.usageIntervalValue = Number(values.usageIntervalValue);
        payload.usageIntervalUnit = values.usageIntervalUnit || "Hours";
        if (values.nextDueUsage) {
          payload.nextDueUsage = Number(values.nextDueUsage);
        }
      }

      await createSchedule(payload);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to create schedule", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Maintenance Schedule</DialogTitle>
          <DialogDescription className="sr-only">
            Define time-based or usage-based maintenance triggers.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset ID</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Asset ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-md p-3 space-y-3">
              <h4 className="font-semibold text-sm">Time-Based Trigger</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="timeIntervalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval Value</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timeIntervalUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Months" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="nextDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border rounded-md p-3 space-y-3">
              <h4 className="font-semibold text-sm">Usage-Based Trigger</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="usageIntervalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval Value</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 5000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usageIntervalUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kilometers" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="nextDueUsage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Due Usage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Target meter reading" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
