"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useDebounce } from "../hooks/useDebounce";

interface AssetResult {
  id: number;
  itemName: string;
  classification: string;
  rfidCode?: string;
  usageUnit?: string;
}

interface AssetComboboxProps {
  value: string;
  onChange: (value: string) => void;
  portalContainer?: HTMLElement | null;
  requireSchedule?: boolean;
  emptyMessage?: string;
  onSelectUnit?: (unit: string) => void;
}

export function AssetCombobox({ 
  value, 
  onChange, 
  portalContainer,
  requireSchedule = false,
  emptyMessage = "No asset found.",
  onSelectUnit
}: AssetComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 300);
  const [results, setResults] = useState<AssetResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track selected asset details to show when popover is closed
  const [selectedAsset, setSelectedAsset] = useState<AssetResult | null>(null);

  useEffect(() => {
    async function fetchAssets() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ems/asset-maintenance/preventive-maintenance/assets/search?q=${encodeURIComponent(debouncedSearch)}&requireSchedule=${requireSchedule}`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data || []);
        }
      } catch (error) {
        console.error("Failed to search assets", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssets();
  }, [debouncedSearch, requireSchedule]);

  useEffect(() => {
    async function fetchInitialAsset() {
      if (value && !selectedAsset) {
        try {
          const res = await fetch(`/api/ems/asset-maintenance/preventive-maintenance/assets/search?id=${encodeURIComponent(value)}&requireSchedule=${requireSchedule}`);
          if (res.ok) {
            const json = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const found = json.data?.find((a: any) => a.id.toString() === value);
            if (found) {
              setSelectedAsset(found);
              setSearch(found.rfidCode && found.rfidCode !== "N/A" ? found.rfidCode : found.itemName);
              if (onSelectUnit && found.usageUnit) {
                onSelectUnit(found.usageUnit);
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch initial asset", error);
        }
      }
    }
    fetchInitialAsset();
  }, [value, selectedAsset, requireSchedule, onSelectUnit]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative w-full">
          <Input
            placeholder="Type RFID or Name to search..."
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              if (val === "") {
                onChange(""); // Clear parent form state when empty
                setSelectedAsset(null);
              }
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="w-full pr-8"
          />
          <ChevronsUpDown className="absolute right-2 top-3 h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverAnchor>
      <PopoverContent 
        className="p-0 flex flex-col overflow-hidden" 
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent Popover from stealing focus from Input
        portalContainer={portalContainer}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>
              {isLoading ? "Searching..." : emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {results.map((asset) => (
                <CommandItem
                  key={asset.id}
                  value={asset.id.toString()}
                  onSelect={() => {
                    const stringId = asset.id.toString();
                    const nextVal = stringId === value ? "" : stringId;
                    onChange(nextVal);
                    setSelectedAsset(asset);
                    // Set the input search text to the RFID upon selection
                    setSearch(asset.rfidCode && asset.rfidCode !== "N/A" ? asset.rfidCode : asset.itemName);
                    if (onSelectUnit) {
                      onSelectUnit(nextVal === "" ? "" : (asset.usageUnit || ""));
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === asset.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    RFID: {asset.rfidCode} - {asset.itemName} ({asset.classification})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
