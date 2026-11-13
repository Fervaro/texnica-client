// Shipment Control (control de embarques)

export interface ShipmentControl {
  id: number;
  shipmentNumber: string;
  plannedLoadingDate?: string;
  actualLoadingDate?: string;
  etd?: string;
  eta?: string;
  fgpoId: number;
  fgpoNumber: string;
  customerName: string;
  style?: string;
  color?: string;
  size?: string;
  plannedQty: number;
  actualLoadedQty: number;
  inTransitQty: number;
  customerReceivedQty: number;
  totalShippedQty: number;
  shipmentVariance: number;
  pendingToShip: number;
  overshipmentQty: number;
  containerType?: string;
  containerNumber?: string;
  bookingNumber?: string;
  destination?: string;
  shipmentStatus?: string;
  packingList?: string;
  invoiceNumber?: string;
  loadPlan?: string;
  dataOwnerId?: number;
  dataOwnerName?: string;
  isClosed?: boolean;
  closedAt?: string;
  closedById?: number;
  closedByName?: string;
  lastUpdated?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lines?: ShipmentControlLine[];
  fgpoCount?: number;
}

/** Línea de un embarque: cajas a enviar de un FGPO + talla/caja. */
export interface ShipmentControlLine {
  id?: number;
  fgpoId: number;
  fgpoNumber?: string;
  style?: string;
  color?: string;
  size?: string;
  boxCode?: string;
  boxesToShip: number;
  pcsPerCarton: number;
  pieces?: number;
}

export interface CreateShipmentControlLineInput {
  fgpoId: number;
  packingControlId?: number | null;
  style?: string;
  color?: string;
  size?: string;
  boxCode?: string;
  boxesToShip: number;
  pcsPerCarton: number;
}

export interface CreateShipmentControlInput {
  shipmentNumber: string;
  plannedLoadingDate?: string | null;
  actualLoadingDate?: string | null;
  etd?: string | null;
  eta?: string | null;
  fgpoId: number;
  plannedQty: number;
  actualLoadedQty: number;
  inTransitQty: number;
  customerReceivedQty: number;
  totalShippedQty: number;
  containerType?: string | null;
  containerNumber?: string | null;
  bookingNumber?: string | null;
  destination?: string | null;
  shipmentStatus?: string | null;
  packingList?: string | null;
  invoiceNumber?: string | null;
  loadPlan?: string | null;
  dataOwnerId?: number | null;
  lastUpdated?: string | null;
  remarks?: string | null;
  lines?: CreateShipmentControlLineInput[];
}
