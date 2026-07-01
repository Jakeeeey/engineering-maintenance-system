import { MaintenanceSchedule, MaintenanceWorkOrder } from "../types";

const BASE_URL = "/api/ems/asset-maintenance/preventive-maintenance";

export class PreventiveMaintenanceApi {
  static async getSchedules(): Promise<MaintenanceSchedule[]> {
    const res = await fetch(`${BASE_URL}/schedules`);
    if (!res.ok) {
      throw new Error("Failed to fetch schedules");
    }
    const json = await res.json();
    return json.data;
  }

  static async createSchedule(payload: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
    const res = await fetch(`${BASE_URL}/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Failed to create schedule");
    }
    const json = await res.json();
    return json.data;
  }

  static async updateSchedule(id: number, payload: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
    const res = await fetch(`${BASE_URL}/schedules`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) {
      throw new Error("Failed to update schedule");
    }
    const json = await res.json();
    return json.data;
  }

  static async logUsage(assetId: string, meterValue: number, unit: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/usage-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assetId: parseInt(assetId, 10),
        meterValue,
        unit,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to log usage");
    }
  }

  static async getWorkOrders(): Promise<MaintenanceWorkOrder[]> {
    const res = await fetch(`${BASE_URL}/work-orders`);
    if (!res.ok) {
      throw new Error("Failed to fetch work orders");
    }
    const json = await res.json();
    return json.data;
  }

  static async completeWorkOrder(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/work-orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: parseInt(id, 10) }),
    });
    if (!res.ok) {
      throw new Error(`Failed to complete work order ${id}`);
    }
  }
}
