// Fabric Shipment

export interface FabricShipment {
  id: number;
  shipmentNumber: string;
  fabricPONumber?: string | null;
  fgpoNumber?: string | null;
  supplier?: string | null;
  rollQty: number;
  shippedQuantity: number;
  shippedRolls: number;
  uom?: string;
  shippedWeight: number;
  packingList?: string;
  invoiceNumber?: string;
  containerAWB?: string;
  shippingMethod?: string;
  etd: string;
  eta: string;
  shipmentStatus?: string;
  deliveredToTexnicaDate?: string;
  inTransitQuantity: number;
  remainingToDeliver: number;
  dataOwner?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFabricShipmentInput {
  shipmentNumber: string;
  fabricPONumber?: string | null;
  fgpoNumber?: string | null;
  supplier?: string | null;
  rollQty: number;
  uom?: string;
  shippedWeight: number;
  packingList?: string;
  invoiceNumber?: string;
  containerAWB?: string;
  shippingMethod?: string;
  etd: string;
  eta: string;
  shipmentStatus?: string;
  deliveredToTexnicaDate?: string;
  dataOwner?: string;
  remarks?: string;
}

// Fila de la vista "Control de Tela" (mezcla embarque + recepción por FGPO)
export interface FabricControlTela {
  fgpoNumber: string;
  color?: string | null;
  fabricDescription?: string | null;
  shippedYards: number;
  receivedYards: number;
  pendingYards: number;
  receivedRolls: number;
  status?: string | null;
  date: string;
}
