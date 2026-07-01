export interface Asset {
  id: string;
  itemId: number;
  itemName?: string;
  serial: string;
  barcode?: string;
  rfidCode?: string;
  lifeSpan: number;
  costPerItem: number;
  dateAcquired: string;
  employee: string;
  condition: string;
  isActive: boolean;
  itemImage?: string;
  itemClassification?: string;
  itemType?: string;
  documents?: { id: string; name: string; url: string }[] | string[];
  newDocuments?: string[];
  currentOwner?: string;
  isActiveWarning?: number;
  latestRemark?: string;
  latestRemarkBy?: string;
  createdAt: string;
  updatedAt: string;
  location?: string;
  asset_location?: { location: string }[];
}

export interface AssetOwner {
  id: string;
  name: string;
  department: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  changeType: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  changeDate: string;
  notes?: string;
}

export interface AssetCondition {
  id: number;
  name: string;
  description: string;
  colorCode: string;
}

export interface EquipmentRegistryFilters {
  search?: string;
  condition?: string;
  employee?: string;
}
