import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "../hooks/useDebounce";

interface AssetResult {
  id: number;
  itemName: string;
  classification: string;
}

interface AssetComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssetCombobox({ value, onChange }: AssetComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [results, setResults] = useState<AssetResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track selected asset details to show when popover is closed
  const [selectedAsset, setSelectedAsset] = useState<AssetResult | null>(null);

  useEffect(() => {
    async function fetchAssets() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ems/asset-maintenance/preventive-maintenance/assets/search?q=${encodeURIComponent(debouncedSearch)}`);
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
  }, [debouncedSearch]);

  useEffect(() => {
    async function fetchInitialAsset() {
      if (value && !selectedAsset) {
        try {
          const res = await fetch(`/api/ems/asset-maintenance/preventive-maintenance/assets/search?q=${encodeURIComponent(value)}`);
          if (res.ok) {
            const json = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const found = json.data?.find((a: any) => a.id.toString() === value);
            if (found) {
              setSelectedAsset(found);
            }
          }
        } catch (error) {
          console.error("Failed to fetch initial asset", error);
        }
      }
    }
    fetchInitialAsset();
  }, [value, selectedAsset]);

  // Optionally fetch details for initial value if needed, but for simplicity
  // we'll just show the ID if we don't have the full details yet.
  
  const displayValue = selectedAsset 
    ? `Asset ID: ${selectedAsset.id} - ${selectedAsset.itemName} (${selectedAsset.classification})`
    : value 
      ? `Asset ID: ${value}` 
      : "Select asset...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 flex flex-col" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by ID or Name..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Searching..." : "No asset found."}
            </CommandEmpty>
            <CommandGroup>
              {results.map((asset) => (
                <CommandItem
                  key={asset.id}
                  value={asset.id.toString()}
                  onSelect={() => {
                    const stringId = asset.id.toString();
                    onChange(stringId === value ? "" : stringId);
                    setSelectedAsset(asset);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === asset.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Asset ID: {asset.id} - {asset.itemName} ({asset.classification})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
