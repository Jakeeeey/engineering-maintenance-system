import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MaintenanceSchedule } from "../types";

interface SchedulesTableProps {
  schedules: MaintenanceSchedule[];
  isLoading: boolean;
}

export function SchedulesTable({ schedules, isLoading }: SchedulesTableProps) {
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading schedules...</div>;
  }

  if (schedules.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No active maintenance schedules found.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Asset ID</TableHead>
            <TableHead>Time Interval</TableHead>
            <TableHead>Usage Interval</TableHead>
            <TableHead>Next Due Date</TableHead>
            <TableHead>Next Due Usage</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>{schedule.id}</TableCell>
              <TableCell>{schedule.assetId}</TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
