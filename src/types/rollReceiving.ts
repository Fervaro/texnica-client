// Roll Receiving (rollos recibidos dentro de un Fabric Receiving)

export interface RollReceiving {
  id: number;
  receivingId: number;
  receivingNumber: string;
  fabricPOId: number | null;
  fabricPONumber: string;
  fgpoId: number;
  fgpoNumber: string;
  customerName: string;
  supplier?: string;
  lotNumber?: string;
  lotId?: number;
  shipmentLotId?: number;
  shipmentLotNumber?: string;
  fabricDescription?: string;
  shippedYards?: number;
  receivingStatus?: string;
  rollNumber?: string;
  supplierRollNumber?: string;
  color?: string;
  grossWeight: number;
  netWeight: number;
  actualYardage: number;
  actualWidth: number;
  actualGSM: number;
  shadeGroup?: string;
  damagedQty: number;
  condition?: string;
  warehouseLocation?: string;
  receivedDate: string;
  dataOwner?: string;
  comments?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRollReceivingInput {
  receivingId: number;
  lotNumber?: string;
  rollNumber?: string;
  supplierRollNumber?: string;
  grossWeight: number;
  netWeight: number;
  actualYardage: number;
  actualWidth: number;
  actualGSM: number;
  shadeGroup?: string;
  damagedQty: number;
  condition?: string;
  warehouseLocation?: string;
  receivedDate: string;
  dataOwner?: string;
  comments?: string;
}

/** Resultado del alta masiva de rollos (endpoint /roll-receivings/bulk). */
export interface RollReceivingBulkResult {
  total: number;
  created: number;
  createdIds: number[];
}
