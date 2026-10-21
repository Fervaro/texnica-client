// Fabric Receiving (recepción de tela)

export interface FabricReceiving {
  id: number;
  receivingNumber: string;
  receivingDate: string;
  shipmentNumber?: string;
  fabricPOId: number | null;
  fabricPONumber: string;
  fgpoId: number;
  fgpoNumber: string;
  customerName: string;
  supplier?: string;
  packingListQty: number;
  actualReceivedQty: number;
  receivingVariance: number;
  receivingShortage: number;
  receivingOverQty: number;
  expectedRolls: number;
  receivedRolls: number;
  missingRolls: number;
  receivingStatus?: string;
  warehouseLocation?: string;
  receivedBy?: string;
  dataOwner?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFabricReceivingInput {
  receivingNumber: string;
  receivingDate: string;
  shipmentNumber?: string;
  fabricPOId: number | null;
  fgpoId: number;
  supplier?: string;
  packingListQty: number;
  actualReceivedQty: number;
  expectedRolls: number;
  receivedRolls: number;
  receivingStatus?: string;
  warehouseLocation?: string;
  receivedBy?: string;
  dataOwner?: string;
  remarks?: string;
}
