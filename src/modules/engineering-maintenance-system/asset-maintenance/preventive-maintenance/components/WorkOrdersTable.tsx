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
  onComplete: (id: string) => void;
  isCompleting: boolean;
}

export function WorkOrdersTable({ workOrders, isLoading, onComplete, isCompleting }: WorkOrdersTableProps) {
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
            <TableHead>Asset ID</TableHead>
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
            const isCompleted = wo.statusId === 3 || wo.completedAt !== null;
            
            return (
              <TableRow key={wo.id}>
                <TableCell>{wo.id}</TableCell>
                <TableCell>{wo.assetId}</TableCell>
                <TableCell>{wo.itemName ?? "N/A"}</TableCell>
                <TableCell>{wo.classification ?? "N/A"}</TableCell>
                <TableCell>{wo.location ?? "Unassigned"}</TableCell>
                <TableCell>{wo.scheduleId || "N/A"}</TableCell>
                <TableCell>{wo.description || "N/A"}</TableCell>
                <TableCell>{new Date(wo.generatedAt).toLocaleString()}</TableCell>
                <TableCell>{wo.completedAt ? new Date(wo.completedAt).toLocaleString() : "N/A"}</TableCell>
                <TableCell>
                  {isCompleted ? (
                    <span className="text-green-600 font-medium">Completed</span>
                  ) : (
                    <span className="text-orange-500 font-medium">Pending</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!isCompleted && (
                    <Button 
                      size="sm" 
                      onClick={() => onComplete(wo.id.toString())} 
                      disabled={isCompleting}
                    >
                      Mark Complete
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
