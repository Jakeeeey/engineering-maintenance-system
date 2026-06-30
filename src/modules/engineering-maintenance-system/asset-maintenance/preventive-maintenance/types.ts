export interface MaintenanceSchedule {
  id: number;
  assetId: number;
  timeIntervalValue: number | null;
  timeIntervalUnit: string | null;
  usageIntervalValue: number | null;
  usageIntervalUnit: string | null;
  nextDueDate: string | null;
  nextDueUsage: number | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceWorkOrder {
  id: number;
  assetId: number;
  scheduleId: number | null;
  description: string | null;
  statusId: number | null;
  assignedTechnician: number | null;
  generatedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface UsageMeterLog {
  id: number;
  assetId: number;
  meterValue: number;
  unit: string;
  recordedBy: number | null;
  recordedAt: string;
}

export interface WorkOrderStatus {
  id: number;
  statusName: string;
}
