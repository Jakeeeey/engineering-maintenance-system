import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MaintenanceWorkOrder } from "../types";

interface WorkOrdersTableProps {
  workOrders: MaintenanceWorkOrder[];
  isLoading: boolean;
  onUpdateStatus: (id: string, statusId: number) => void;
  isUpdating: boolean;
}

export function WorkOrdersTable({ workOrders, isLoading, onUpdateStatus, isUpdating }: WorkOrdersTableProps) {
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading work orders...</div>;
  }

  if (workOrders.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No work orders found.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>RFID</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Schedule ID</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Generated At</TableHead>
            <TableHead>Completed At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map((wo) => {
            return (
              <TableRow key={wo.id}>
                <TableCell>{wo.id}</TableCell>
                <TableCell>{wo.rfidCode || "N/A"}</TableCell>
                <TableCell>{wo.itemName ?? "N/A"}</TableCell>
                <TableCell>{wo.classification ?? "N/A"}</TableCell>
                <TableCell>{wo.location ?? "Unassigned"}</TableCell>
                <TableCell>{wo.scheduleId || "N/A"}</TableCell>
                <TableCell>{wo.description || "N/A"}</TableCell>
                <TableCell>{new Date(wo.generatedAt).toLocaleString()}</TableCell>
                <TableCell>{wo.completedAt ? new Date(wo.completedAt).toLocaleString() : "N/A"}</TableCell>
                <TableCell>
                  {wo.statusId === 3 ? (
                    <span className="text-green-600 font-medium">Completed</span>
                  ) : wo.statusId === 4 ? (
                    <span className="text-red-500 font-medium">Cancelled</span>
                  ) : wo.statusId === 2 ? (
                    <span className="text-blue-500 font-medium">In Progress</span>
                  ) : (
                    <span className="text-orange-500 font-medium">Pending</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(wo.statusId === 1 || !wo.statusId) && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onUpdateStatus(wo.id.toString(), 2)} disabled={isUpdating}>
                        Start Maintenance
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(wo.id.toString(), 4)} disabled={isUpdating}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {wo.statusId === 2 && (
                    <Button size="sm" onClick={() => onUpdateStatus(wo.id.toString(), 3)} disabled={isUpdating}>
                      Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
