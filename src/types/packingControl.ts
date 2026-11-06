// Packing Control (control de empaque)

export interface PackingControl {
  id: number;
  packingDate: string;
  fgpoId: number;
  boxTypeId?: number | null;
  boxCode?: string;
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
  /** Cajas ya asignadas a embarques activos. */
  shippedBoxes?: number;
  /** Cajas disponibles para enviar: producidas − ya asignadas. */
  availableCartons?: number;
  readyToShipQty: number;
  packingVariance: number;
  pendingPacking: number;
  overpackedQty: number;
  responsiblePersonId?: number;
  responsiblePersonName?: string;
  lastUpdated?: string;
  remarks?: string;
  isMix?: boolean;
  mixLines?: PackingMixLine[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** Desglose de una caja Mix (talla + cantidad). */
export interface PackingMixLine {
  size?: string;
  quantity: number;
}

/** Opciones del diálogo de Mix: capacidad de la caja y pending por talla. */
export interface PackingMixOptions {
  fgpoId: number;
  pcsPerCarton: number;
  sizes: { size?: string; pendingPacking: number }[];
}

export interface CreatePackingMixInput {
  packingDate: string;
  fgpoId: number;
  responsiblePersonId?: number | null;
  remarks?: string | null;
  lines: { size?: string; quantity: number }[];
}

export interface CreatePackingControlInput {
  packingDate: string;
  fgpoId: number;
  boxTypeId?: number | null;
  qcPassedQty: number;
  receivedByPackingQty: number;
  foldedQty: number;
  polybaggedQty: number;
  pendingPacking: number;
  packedQty: number;
  pcsPerCarton: number;
  responsiblePersonId?: number | null;
  lastUpdated?: string | null;
  remarks?: string | null;
}

/** Configuración por cliente de las etiquetas de los 4 campos de cantidad. */
export interface PackingFieldConfig {
  id: number;
  fieldNo: number;
  label: string;
  visible: boolean;
}
