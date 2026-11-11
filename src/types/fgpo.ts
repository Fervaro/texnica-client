// FGPO Master (orden del cliente)

export interface Fgpo {
  id: number;
  fgpoNumber: string;
  temporaryNumber?: string;
  status?: string;
  customerId: number;
  customerName: string;
  style?: string;
  color?: string;
  orderQuantity: number;
  deliveryDate: string;
  inTransitQty: number;
  receivedQty: number;
  totalShippedQty: number;
  shipmentVariance: number;
  pendingToShip: number;
  overshipmentQty: number;
  producedQty: number;
  productionVariance: number;
  pendingProduction: number;
  overproductionQty: number;
  dataOwner?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFgpoInput {
  fgpoNumber: string;
  customerId: number;
  style?: string;
  color?: string;
  orderQuantity: number;
  deliveryDate: string;
  status?: string;
  remarks?: string;
}

/** Línea de tiempo de procesos de una FGPO. */
export interface FgpoTimelineStep {
  step: string;
  status: 'done' | 'active' | 'pending' | 'not_applicable';
  date?: string | null;
  detail?: string | null;
}

export interface FgpoTimeline {
  fgpoId: number;
  fgpoNumber: string;
  customerProvidedFabric: boolean;
  steps: FgpoTimelineStep[];
}
