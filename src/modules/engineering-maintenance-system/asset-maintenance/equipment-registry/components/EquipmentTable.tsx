"use client";

import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Asset } from "../types";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";

interface EquipmentTableProps {
  data?: Asset[];
  isLoading: boolean;
  onOpenManageEquipment: (asset: Asset) => void;
  onViewDetails?: (asset: Asset) => void;
}

export function EquipmentTable({
  data,
  isLoading,
  onOpenManageEquipment,
  onViewDetails,
}: EquipmentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  if (isLoading) {
    return <div className="p-4 text-center">Loading equipment...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-4 text-center">No equipment found.</div>;
  }

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getConditionBadgeColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "good":
        return "bg-green-100 text-green-800 hover:bg-green-100/80";
      case "bad":
        return "bg-red-100 text-red-800 hover:bg-red-100/80";
      case "under maintenance":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80";
      case "discontinued":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100/80";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Asset ID</TableHead>
            <TableHead>Name / Classification</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Barcode / RFID</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Current Owner</TableHead>
            <TableHead>Date Acquired</TableHead>
            <TableHead>Cost / Lifespan</TableHead>
            <TableHead>Active Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((asset) => {
            const imageUrl = asset.itemImage ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${asset.itemImage}` : null;
            return (
              <TableRow key={asset.id}>
                <TableCell>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={asset.itemName || "Asset"} className="w-10 h-10 object-cover rounded-md" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">N/A</div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{asset.id}</TableCell>
                <TableCell>
                  <div>{asset.itemName}</div>
                  {asset.itemClassification && <div className="text-xs text-gray-500">{asset.itemClassification}</div>}
                </TableCell>
                <TableCell>{asset.serial}</TableCell>
                <TableCell>
                  {asset.barcode && <div className="text-xs">BC: {asset.barcode}</div>}
                  {asset.rfidCode && <div className="text-xs">RFID: {asset.rfidCode}</div>}
                  {!asset.barcode && !asset.rfidCode && <span className="text-gray-400">None</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getConditionBadgeColor(asset.condition)}>
                    {asset.condition || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell>{asset.currentOwner || "Unassigned"}</TableCell>
                <TableCell>{formatDate(asset.dateAcquired)}</TableCell>
                <TableCell>
                  <div>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(asset.costPerItem || 0)}</div>
                  <div className="text-xs text-gray-500">{asset.lifeSpan} mo</div>
                </TableCell>
                <TableCell>
                  {asset.isActive ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => onViewDetails && onViewDetails(asset)}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onOpenManageEquipment(asset)}>
                        Manage Equipment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between px-2 py-4 border-t">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${rowsPerPage}`}
              onValueChange={(value) => {
                setRowsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={`${rowsPerPage}`} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
