"use client";

import { useState } from "react";
import { EquipmentFilters } from "./components/EquipmentFilters";
import { EquipmentTable } from "./components/EquipmentTable";
import { AddEquipmentModal } from "./components/AddEquipmentModal";
import { ManageEquipmentModal } from "./components/ManageEquipmentModal";
import { ViewEquipmentDetailsModal } from "./components/ViewEquipmentDetailsModal";
import { useGetEquipments } from "./hooks/useEquipmentRegistry";
import { Asset, EquipmentRegistryFilters } from "./types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function EquipmentRegistryModule() {
  const [filters, setFilters] = useState<EquipmentRegistryFilters>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAssetForManage, setSelectedAssetForManage] = useState<Asset | null>(null);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<Asset | null>(null);

  const { data: equipments, isLoading, isError, refetch } = useGetEquipments(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Equipment Registry</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Equipment
        </Button>
      </div>

      <EquipmentFilters
        filters={filters}
        onFilterChange={setFilters}
      />

      {isError ? (
        <div className="p-4 text-center text-red-500 border rounded-md">
          Failed to load equipment data. Please try again later.
        </div>
      ) : (
        <EquipmentTable
          data={equipments}
          isLoading={isLoading}
          onOpenManageEquipment={(asset) => setSelectedAssetForManage(asset)}
          onViewDetails={(asset) => setSelectedAssetForDetails(asset)}
        />
      )}

      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refetch}
      />

      <ManageEquipmentModal
        asset={selectedAssetForManage}
        isOpen={!!selectedAssetForManage}
        onClose={() => setSelectedAssetForManage(null)}
        onSuccess={refetch}
      />

      <ViewEquipmentDetailsModal
        asset={selectedAssetForDetails}
        isOpen={!!selectedAssetForDetails}
        onClose={() => setSelectedAssetForDetails(null)}
      />
    </div>
  );
}
