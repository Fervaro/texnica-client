import { useResource } from '../useResource';
import { shipmentControlsApi } from '../../utils/api';
import { ShipmentControl } from '../../types';

const mapShipmentControl = (raw: any): ShipmentControl => ({
  id: raw.id ?? raw.ID ?? 0,
  shipmentNumber: raw.shipmentNumber ?? raw.ShipmentNumber ?? '',
  plannedLoadingDate: raw.plannedLoadingDate ?? raw.PlannedLoadingDate ?? '',
  actualLoadingDate: raw.actualLoadingDate ?? raw.ActualLoadingDate ?? '',
  etd: raw.etd ?? raw.ETD ?? '',
  eta: raw.eta ?? raw.ETA ?? '',
  fgpoId: raw.fgpoId ?? raw.FGPOId ?? 0,
  fgpoNumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
  customerName: raw.customerName ?? raw.CustomerName ?? '',
  style: raw.style ?? raw.Style ?? '',
  color: raw.color ?? raw.Color ?? '',
  size: raw.size ?? raw.Size ?? '',
  plannedQty: raw.plannedQty ?? raw.PlannedQty ?? 0,
  actualLoadedQty: raw.actualLoadedQty ?? raw.ActualLoadedQty ?? 0,
  inTransitQty: raw.inTransitQty ?? raw.InTransitQty ?? 0,
  customerReceivedQty: raw.customerReceivedQty ?? raw.CustomerReceivedQty ?? 0,
  totalShippedQty: raw.totalShippedQty ?? raw.TotalShippedQty ?? 0,
  shipmentVariance: raw.shipmentVariance ?? raw.ShipmentVariance ?? 0,
  pendingToShip: raw.pendingToShip ?? raw.PendingToShip ?? 0,
  overshipmentQty: raw.overshipmentQty ?? raw.OvershipmentQty ?? 0,
  containerType: raw.containerType ?? raw.ContainerType ?? '',
  containerNumber: raw.containerNumber ?? raw.ContainerNumber ?? '',
  bookingNumber: raw.bookingNumber ?? raw.BookingNumber ?? '',
  destination: raw.destination ?? raw.Destination ?? '',
  shipmentStatus: raw.shipmentStatus ?? raw.ShipmentStatus ?? '',
  packingList: raw.packingList ?? raw.PackingList ?? '',
  invoiceNumber: raw.invoiceNumber ?? raw.InvoiceNumber ?? '',
  loadPlan: raw.loadPlan ?? raw.LoadPlan ?? '',
  dataOwnerId: raw.dataOwnerId ?? raw.DataOwnerId ?? undefined,
  dataOwnerName: raw.dataOwnerName ?? raw.DataOwnerName ?? '',
  lastUpdated: raw.lastUpdated ?? raw.LastUpdated ?? '',
  remarks: raw.remarks ?? raw.Remarks ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
  fgpoCount: raw.fgpoCount ?? raw.FgpoCount ?? 0,
  lines: (raw.lines ?? raw.Lines ?? []).map((l: any) => ({
    id: l.id ?? l.ID ?? 0,
    fgpoId: l.fgpoId ?? l.FGPOId ?? 0,
    fgpoNumber: l.fgpoNumber ?? l.FGPONumber ?? '',
    style: l.style ?? l.Style ?? '',
    color: l.color ?? l.Color ?? '',
    size: l.size ?? l.Size ?? '',
    boxCode: l.boxCode ?? l.BoxCode ?? '',
    boxesToShip: l.boxesToShip ?? l.BoxesToShip ?? 0,
    pcsPerCarton: l.pcsPerCarton ?? l.PcsPerCarton ?? 0,
    pieces: l.pieces ?? l.Pieces ?? 0,
  })),
});

/** Hook de Shipment Control: consume /api/shipment-controls */
export const useShipmentControls = () =>
  useResource<ShipmentControl>(shipmentControlsApi, mapShipmentControl);
