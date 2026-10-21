// Fabric Shipment

export interface FabricShipment {
  id: number;
  shipmentNumber: string;
  fabricPOId: number | null;
  fabricPONumber: string;
  fgpoId: number;
  fgpoNumber: string;
  customerName: string;
  supplier?: string;
  lotNumber?: string;
  lotId?: number | null;
  rollQty: number;
  shippedQuantity: number;
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
  fabricPOId: number | null;
  fgpoId: number;
  supplier?: string;
  lotNumber?: string;
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
