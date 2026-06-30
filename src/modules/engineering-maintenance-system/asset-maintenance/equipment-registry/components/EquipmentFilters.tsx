"use client";

import { Input } from "@/components/ui/input";
import { EquipmentRegistryFilters } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EquipmentFiltersProps {
  filters: EquipmentRegistryFilters;
  onFilterChange: (filters: EquipmentRegistryFilters) => void;
}

export function EquipmentFilters({ filters, onFilterChange }: EquipmentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div className="flex-1 w-full sm:max-w-sm relative">
        <Input
          id="search"
          placeholder="Search by name or serial..."
          value={filters.search || ""}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <Select 
          value={filters.condition || "all"} 
          onValueChange={(val) => onFilterChange({ 
            ...filters, 
            condition: val === "all" ? undefined : val 
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Conditions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Bad">Bad</SelectItem>
            <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
            <SelectItem value="Discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
