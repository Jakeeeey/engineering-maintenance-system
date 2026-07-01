"use client";

import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useUpdateSchedule } from "../hooks/usePreventiveMaintenance";
import { MaintenanceSchedule } from "../types";

const numberStringOptional = z.string().optional().refine(
  (val) => !val || !isNaN(Number(val)),
  { message: "Must be a valid number" }
);

const formSchema = z.object({
  timeIntervalValue: numberStringOptional,
  timeIntervalUnit: z.string().optional(),
  nextDueDate: z.string().optional(),
  usageIntervalValue: numberStringOptional,
  usageIntervalUnit: z.string().optional(),
  nextDueUsage: numberStringOptional,
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditScheduleModalProps {
  isOpen: boolean;
  schedule: MaintenanceSchedule;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditScheduleModal({ isOpen, schedule, onClose, onSuccess }: EditScheduleModalProps) {
  const { mutateAsync: updateSchedule, isPending } = useUpdateSchedule(onSuccess);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      timeIntervalValue: schedule.timeIntervalValue?.toString() || "",
      timeIntervalUnit: schedule.timeIntervalUnit || "",
      nextDueDate: schedule.nextDueDate ? schedule.nextDueDate.split("T")[0] : "",
      usageIntervalValue: schedule.usageIntervalValue?.toString() || "",
      usageIntervalUnit: schedule.usageIntervalUnit || "",
      nextDueUsage: schedule.nextDueUsage?.toString() || "",
      isActive: schedule.isActive,
    },
  });

  useEffect(() => {
    if (isOpen && schedule) {
      form.reset({
        timeIntervalValue: schedule.timeIntervalValue?.toString() || "",
        timeIntervalUnit: schedule.timeIntervalUnit || "",
        nextDueDate: schedule.nextDueDate ? schedule.nextDueDate.split("T")[0] : "",
        usageIntervalValue: schedule.usageIntervalValue?.toString() || "",
        usageIntervalUnit: schedule.usageIntervalUnit || "",
        nextDueUsage: schedule.nextDueUsage?.toString() || "",
        isActive: schedule.isActive,
      });
    }
  }, [isOpen, schedule, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: Record<string, unknown> = {
        isActive: values.isActive,
      };

      if (values.timeIntervalValue) {
        payload.timeIntervalValue = Number(values.timeIntervalValue);
        payload.timeIntervalUnit = values.timeIntervalUnit || "Days";
        if (values.nextDueDate) {
          payload.nextDueDate = values.nextDueDate;
        }
      } else {
        payload.timeIntervalValue = null;
        payload.timeIntervalUnit = null;
        payload.nextDueDate = null;
      }

      if (values.usageIntervalValue) {
        payload.usageIntervalValue = Number(values.usageIntervalValue);
        payload.usageIntervalUnit = values.usageIntervalUnit || "Hours";
        if (values.nextDueUsage) {
          payload.nextDueUsage = Number(values.nextDueUsage);
        }
      } else {
        payload.usageIntervalValue = null;
        payload.usageIntervalUnit = null;
        payload.nextDueUsage = null;
      }

      await updateSchedule({ id: schedule.id, payload });
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to update schedule", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Schedule #{schedule.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit time-based or usage-based maintenance triggers.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <DialogDescription>
                      Is this schedule currently active?
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                      <Input type="number" step="0.01" placeholder="Target meter reading" {...field} />
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
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
