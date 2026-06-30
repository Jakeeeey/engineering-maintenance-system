import { useState, useEffect, useCallback } from "react";
import { EquipmentRegistryApi } from "../providers/EquipmentRegistryApi";
import { Asset, EquipmentRegistryFilters } from "../types";

export function useGetEquipments(filters?: EquipmentRegistryFilters) {
  const [data, setData] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await EquipmentRegistryApi.getEquipments(filters);
      setData(result);
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}

export function useGetEquipmentDetails(id: string) {
  const [data, setData] = useState<Asset | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await EquipmentRegistryApi.getEquipmentDetails(id);
      setData(result);
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}

export function useCreateEquipment() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (payload: Partial<Asset>) => {
    setIsPending(true);
    try {
      return await EquipmentRegistryApi.createEquipment(payload);
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useUpdateEquipment() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (args: { id: string; payload: Partial<Asset> }) => {
    setIsPending(true);
    try {
      return await EquipmentRegistryApi.updateEquipment(args.id, args.payload);
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useUpdateCondition() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (args: { id: string; condition: string; remarks?: string }) => {
    setIsPending(true);
    try {
      return await EquipmentRegistryApi.updateCondition(args.id, args.condition, args.remarks);
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useAssignOwner() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (args: { id: string; ownerName: string }) => {
    setIsPending(true);
    try {
      return await EquipmentRegistryApi.assignOwner(args.id, args.ownerName);
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
}

export function useGetReferences(type: string) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    if (!type) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await EquipmentRegistryApi.getReferences(type);
      setData(result);
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}
