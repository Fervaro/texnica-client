// Fabric PO — Header / Lines

/**
 * Buyer del formato oficial de Fabric Purchase Order: es la EMPRESA COMPRADORA
 * (Texnica Internacional S.A.), no un usuario del sistema.
 *
 * No se almacena en la base de datos: es un valor fijo de presentación. Se define
 * aquí, en un único lugar, para que el formulario (New/Edit), la previsualización
 * y la vista de detalle muestren siempre exactamente el mismo texto.
 */
export const BUYER_NAME = 'Texnica Internacional S.A.';

/** Una línea de la Fabric PO: un renglón del documento oficial. */
export interface FabricPOLine {
  id: number;
  fabricPOId: number;
  lineNumber: number;
  fgpoId: number;
  fgpoNumber?: string;
  /** Origen de la línea. Null sólo en registros históricos/migrados. */
  fabricRequirementId?: number;
  style?: string;
  color?: string;
  componentId?: number;
  componentCode?: string;
  /** Alias del documento oficial para componentCode. */
  category?: string;
  fabricName?: string;
  yarn?: string;
  composition?: string;
  requiredWidth?: string;
  gsm: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  /** Línea emitida en modo sobrecompra (supera el pendiente del requerimiento). */
  allowOverPurchase?: boolean;
  approval?: string;
  remarks?: string;
  uom?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FabricPOFgpoItem {
  fgpoId: number;
  fgpoNumber: string;
  customerName: string;
  style?: string;
  color?: string;
  allocatedQuantity: number;
}

export interface FabricPO {
  id: number;
  fabricPONumber: string;
  fgpos: FabricPOFgpoItem[];
  lines: FabricPOLine[];

  // Resúmenes calculados por el backend para el listado
  lineCount: number;
  fgpoCount: number;
  componentSummary?: string;
  /** Precio común de todas las líneas; null cuando hay precios distintos. */
  commonUnitPrice?: number | null;

  supplierId?: number;
  supplierName?: string;
  supplier?: string;
  fabricMill?: string;
  componentId?: number;
  componentCode?: string;
  fabricComponent?: string;

  orderedQuantity: number;
  uom?: string;
  unitPrice: number;
  poAmount: number;
  orderDate: string;
  requiredCompletion: string;
  plannedExport?: string;
  plannedArrival?: string;
  poStatus?: string;

  currency?: string;
  incoterm?: string;
  customerId?: number;
  customerName?: string;
  preparedBy?: string;
  checkedBy?: string;
  program?: string;
  paymentTerms?: string;

  purchaseOwnerUserId?: number;
  purchaseOwnerName?: string;
  purchaseOwner?: string;
  approvedByUserId?: number;
  approvedByName?: string;
  approvedBy?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** Fabric Requirement disponible para comprar (tabla de selección de New Fabric PO). */
export interface FabricRequirementAvailability {
  fabricRequirementId: number;
  fgpoId: number;
  fgpoNumber: string;
  customerName?: string;
  style?: string;
  color?: string;
  componentId?: number;
  componentCode?: string;
  category?: string;
  uom?: string;
  fabricName?: string;
  yarn?: string;
  composition?: string;
  requiredWidth?: string;
  gsm: number;
  requiredToPurchase: number;
  alreadyOrdered: number;
  remainingToPurchase: number;
  requiredDate: string;
}

/** Línea que se envía al backend. amount y totales NO se envían como autoridad. */
export interface FabricPOLineInput {
  fgpoId: number;
  fabricRequirementId: number;
  componentId?: number | null;
  style?: string | null;
  color?: string | null;
  fabricName?: string | null;
  yarn?: string | null;
  composition?: string | null;
  requiredWidth?: string | null;
  gsm?: number | null;
  quantity: number;
  unitPrice: number;
  /** Caso especial: permite comprar más que el Remaining (sobrecompra). */
  allowOverPurchase?: boolean;
  approval?: string | null;
  remarks?: string | null;
}

export interface CreateFabricPOInput {
  fabricPONumber: string;
  lines: FabricPOLineInput[];
  supplierId?: number | null;
  fabricMill?: string | null;
  uom?: string;
  orderDate: string;
  requiredCompletion: string;
  plannedExport?: string | null;
  plannedArrival?: string | null;
  poStatus?: string | null;
  currency?: string | null;
  incoterm?: string | null;
  customerId?: number | null;
  preparedBy?: string | null;
  checkedBy?: string | null;
  program?: string | null;
  paymentTerms?: string | null;
  // purchaseOwnerUserId NO se envia: lo asigna el backend con el usuario autenticado
  // que crea la PO. Buyer se muestra siempre como BUYER_NAME (empresa compradora).
  approvedByUserId?: number | null;
  remarks?: string | null;
}
