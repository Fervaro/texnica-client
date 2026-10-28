// Packing Control (control de empaque)

export interface PackingControl {
  id: number;
  packingDate: string;
  fgpoId: number;
  fgpoNumber: string;
  customerName: string;
  style?: string;
  color?: string;
  size?: string;
  qcPassedQty: number;
  receivedByPackingQty: number;
  foldedQty: number;
  polybaggedQty: number;
  packedQty: number;
  fullCartons: number;
  partialCartons: number;
  pcsPerCarton: number;
  readyToShipQty: number;
  packingVariance: number;
  pendingPacking: number;
  overpackedQty: number;
  responsiblePersonId?: number;
  responsiblePersonName?: string;
  lastUpdated?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePackingControlInput {
  packingDate: string;
  fgpoId: number;
  qcPassedQty: number;
  receivedByPackingQty: number;
  foldedQty: number;
  polybaggedQty: number;
  packedQty: number;
  pcsPerCarton: number;
  responsiblePersonId?: number | null;
  lastUpdated?: string | null;
  remarks?: string | null;
}
