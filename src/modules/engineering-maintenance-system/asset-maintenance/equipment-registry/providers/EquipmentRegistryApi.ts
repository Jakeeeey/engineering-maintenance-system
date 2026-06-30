import { Asset, EquipmentRegistryFilters } from "../types";

const BASE_URL = "/api/ems/asset-maintenance/equipment-registry";

export class EquipmentRegistryApi {
  static async getEquipments(filters?: EquipmentRegistryFilters): Promise<Asset[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.condition) params.append("condition", filters.condition);
    if (filters?.employee) params.append("employee", filters.employee);

    const qs = params.toString();
    const url = `${BASE_URL}${qs ? `?${qs}` : ""}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch equipments");
    }
    const json = await res.json();
    return json.data;
  }

  static async getEquipmentDetails(id: string): Promise<Asset> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch equipment details for ${id}`);
    }
    const json = await res.json();
    return json.data;
  }

  static async createEquipment(payload: Partial<Asset>): Promise<Asset> {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Failed to create equipment");
    }
    const json = await res.json();
    return json.data;
  }

  static async updateEquipment(id: string, payload: Partial<Asset>): Promise<Asset> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to update equipment for ${id}`);
    }
    const json = await res.json();
    return json.data;
  }

  static async updateCondition(id: string, condition: string, remarks?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ condition, remarks }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update condition for ${id}`);
    }
  }

  static async assignOwner(id: string, ownerName: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}/assign-owner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ownerName }),
    });
    if (!res.ok) {
      throw new Error(`Failed to assign owner to ${id}`);
    }
  }

  static async getReferences(type: string): Promise<Record<string, unknown>[]> {
    const res = await fetch(`/api/ems/asset-maintenance/references?type=${type}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch references of type ${type}`);
    }
    const json = await res.json();
    return json.data || [];
  }
}
