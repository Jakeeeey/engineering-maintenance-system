import { useState, useEffect, useCallback } from "react";
import { PreventiveMaintenanceApi } from "../providers/PreventiveMaintenanceApi";
import { MaintenanceSchedule, MaintenanceWorkOrder } from "../types";

export function useGetSchedules() {
  const [data, setData] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await PreventiveMaintenanceApi.getSchedules();
      setData(result);
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}

export function useCreateSchedule(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (payload: Partial<MaintenanceSchedule>) => {
    setIsPending(true);
    try {
      const res = await PreventiveMaintenanceApi.createSchedule(payload);
      onSuccess?.();
      return res;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useUpdateSchedule(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async ({ id, payload }: { id: number; payload: Partial<MaintenanceSchedule> }) => {
    setIsPending(true);
    try {
      const res = await PreventiveMaintenanceApi.updateSchedule(id, payload);
      onSuccess?.();
      return res;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useLogUsage(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (args: { assetId: string; meterValue: number; unit: string }) => {
    setIsPending(true);
    try {
      const res = await PreventiveMaintenanceApi.logUsage(args.assetId, args.meterValue, args.unit);
      onSuccess?.();
      return res;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useGetWorkOrders() {
  const [data, setData] = useState<MaintenanceWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await PreventiveMaintenanceApi.getWorkOrders();
      setData(result);
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}

export function useCompleteWorkOrder(onSuccess?: () => void) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (args: { id: string }) => {
    setIsPending(true);
    try {
      const res = await PreventiveMaintenanceApi.completeWorkOrder(args.id);
      onSuccess?.();
      return res;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}
