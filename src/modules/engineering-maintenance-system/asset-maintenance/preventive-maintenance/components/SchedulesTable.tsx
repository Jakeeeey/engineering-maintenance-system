import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MaintenanceSchedule } from "../types";

interface SchedulesTableProps {
  schedules: MaintenanceSchedule[];
  isLoading: boolean;
  onEdit?: (schedule: MaintenanceSchedule) => void;
  roleName?: string;
}

export function SchedulesTable({ schedules, isLoading, onEdit, roleName }: SchedulesTableProps) {
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading schedules...</div>;
  }

  if (schedules.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No active maintenance schedules found.</div>;
  }

  // Sub-Step A: Hide "Edit" button if Viewer or Technician
  const canEdit = roleName !== "Viewer" && roleName !== "Technician" && onEdit;

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
            <TableHead>Time Interval</TableHead>
            <TableHead>Usage Interval</TableHead>
            <TableHead>Next Due Date</TableHead>
            <TableHead>Next Due Usage</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>{schedule.id}</TableCell>
              <TableCell>{schedule.assetId}</TableCell>
              <TableCell>{schedule.itemName ?? "N/A"}</TableCell>
              <TableCell>{schedule.classification ?? "N/A"}</TableCell>
              <TableCell>{schedule.location ?? "Unassigned"}</TableCell>
              <TableCell>
                {schedule.timeIntervalValue && schedule.timeIntervalUnit
                  ? `${schedule.timeIntervalValue} ${schedule.timeIntervalUnit}`
                  : "N/A"}
              </TableCell>
              <TableCell>
                {schedule.usageIntervalValue && schedule.usageIntervalUnit
                  ? `${schedule.usageIntervalValue} ${schedule.usageIntervalUnit}`
                  : "N/A"}
              </TableCell>
              <TableCell>
                {schedule.nextDueDate ? new Date(schedule.nextDueDate).toLocaleDateString() : "N/A"}
              </TableCell>
              <TableCell>{schedule.nextDueUsage ?? "N/A"}</TableCell>
              <TableCell>
                {schedule.isActive ? (
                  <span className="text-green-600 font-medium">Active</span>
                ) : (
                  <span className="text-gray-500">Inactive</span>
                )}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(schedule)}>
                    Edit
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
