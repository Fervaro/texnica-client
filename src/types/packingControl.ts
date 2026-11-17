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
  fqQty: number;
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
  isIrrBox?: boolean;
  isFqBox?: boolean;
  fqStyle?: string;
  fqColor?: string;
  irrFieldNo?: number | null;
  irrCategoryLabel?: string;
  irrBoxLines?: PackingIrrBoxLine[];
  fqBoxLines?: PackingFqBoxLine[];
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

export interface PackingIrrBoxLine {
  sourcePackingControlId: number;
  fieldNo: number;
  size?: string;
  quantity: number;
}

export interface PackingFqBoxLine {
  sourcePackingControlId: number;
  size?: string;
  quantity: number;
}

export interface PackingFqSizeOption { size: string; availableQty: number; }
export interface PackingFqVariantOption {
  style: string;
  color: string;
  pcsPerCarton: number;
  sizes: PackingFqSizeOption[];
}
export interface PackingFqBoxOptions { fgpoId: number; variants: PackingFqVariantOption[]; }
export interface CreatePackingFqBoxInput {
  packingDate: string;
  fgpoId: number;
  style: string;
  color: string;
  pcsPerCarton?: number | null;
  responsiblePersonId?: number | null;
  remarks?: string | null;
  lines: { size: string; quantity: number }[];
}

export interface PackingIrrCategoryOption { fieldNo: number; label: string; }
export interface PackingIrrSizeOption { fieldNo: number; size: string; availableQty: number; }
export interface PackingIrrVariantOption {
  style: string;
  color: string;
  pcsPerCarton: number;
  sizes: PackingIrrSizeOption[];
}
export interface PackingIrrBoxOptions {
  fgpoId: number;
  categories: PackingIrrCategoryOption[];
  variants: PackingIrrVariantOption[];
}
export interface CreatePackingIrrBoxInput {
  packingDate: string;
  fgpoId: number;
  fieldNo: number;
  style: string;
  color: string;
  pcsPerCarton?: number | null;
  responsiblePersonId?: number | null;
  remarks?: string | null;
  lines: { size: string; quantity: number }[];
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
  fqQty?: number;
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
