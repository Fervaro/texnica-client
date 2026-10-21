// Movimientos físicos de inventario por rollo + saldos calculados

export interface FabricMovement {
  id: number;
  rollReceivingId: number;
  rollNumber: string;
  movementType: string;
  quantity: number;
  unitOfMeasure?: string;
  movementDate: string;
  referenceType?: string;
  referenceNumber?: string;
  idempotencyKey: string;
  isReversalOfId?: number;
  comments?: string;
  dataOwner?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateFabricMovementInput {
  rollReceivingId: number;
  movementType: string;
  quantity: number;
  unitOfMeasure?: string;
  movementDate?: string;
  referenceType?: string;
  referenceNumber?: string;
  idempotencyKey: string;
  isReversalOfId?: number;
  comments?: string;
}

export interface RollBalance {
  rollReceivingId: number;
  rollNumber: string;
  supplierRollNumber?: string;
  lotNumber?: string;
  fabricPOId: number | null;
  fabricPONumber: string;
  fgpoId: number;
  fgpoNumber: string;
  unitOfMeasure?: string;
  receivedQuantity: number;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}
