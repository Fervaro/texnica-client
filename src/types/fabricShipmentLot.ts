// Fabric Shipment Lot (lotes de un embarque)

export interface FabricShipmentLot {
  id: number;
  fabricShipmentId: number;
  shipmentNumber: string;
  lineNumber?: number | null;
  lotNumber: string;
  styleId?: number | null;
  styleCode?: string;
  colorId?: number | null;
  colorName?: string;
  fabricDescription?: string | null;
  width?: number | null;
  gsm?: number | null;
  shippedRolls: number;
  shippedYards: number;
  // Valores provisionales en Fase 1 (sin relación con rollos físicos todavía).
  receivedRolls: number;
  receivedYards: number;
  balanceRolls: number;
  balanceYards: number;
  dataOwnerName?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFabricShipmentLotInput {
  fabricShipmentId: number;
  lineNumber?: number | null;
  lotNumber: string;
  styleId?: number | null;
  colorId?: number | null;
  fabricDescription?: string | null;
  width?: number | null;
  gsm?: number | null;
  shippedRolls: number;
  shippedYards: number;
}

export interface UpdateFabricShipmentLotInput {
  lineNumber?: number | null;
  lotNumber: string;
  styleId?: number | null;
  colorId?: number | null;
  fabricDescription?: string | null;
  width?: number | null;
  gsm?: number | null;
  shippedRolls: number;
  shippedYards: number;
}
