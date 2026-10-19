import { useResource } from '../useResource';
import { fabricReservationsApi } from '../../utils/api';
import { FabricReservation } from '../../types';

const mapFabricReservation = (raw: any): FabricReservation => ({
  id: raw.id ?? raw.ID ?? 0,
  reservationDate: raw.reservationDate ?? raw.ReservationDate ?? '',
  fabricPOId: raw.fabricPOId ?? raw.FabricPOId ?? 0,
  fabricPONumber: raw.fabricPONumber ?? raw.FabricPONumber ?? '',
  fgpoId: raw.fgpoId ?? raw.FGPOId ?? 0,
  fgpoNumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
  customerName: raw.customerName ?? raw.CustomerName ?? '',
  style: raw.style ?? raw.Style ?? '',
  color: raw.color ?? raw.Color ?? '',
  componentId: raw.componentId ?? raw.ComponentId ?? undefined,
  componentCode: raw.componentCode ?? raw.ComponentCode ?? '',
  lotId: raw.lotId ?? raw.LotId ?? undefined,
  lotNumber: raw.lotNumber ?? raw.LotNumber ?? '',
  reservedQuantity: raw.reservedQuantity ?? raw.ReservedQuantity ?? 0,
  uom: raw.uom ?? raw.UOM ?? '',
  releasedQuantity: raw.releasedQuantity ?? raw.ReleasedQuantity ?? 0,
  remainingReservation: raw.remainingReservation ?? raw.RemainingReservation ?? 0,
  status: raw.status ?? raw.Status ?? '',
  reservedByUserId: raw.reservedByUserId ?? raw.ReservedByUserId ?? undefined,
  reservedByName: raw.reservedByName ?? raw.ReservedByName ?? '',
  approvedByUserId: raw.approvedByUserId ?? raw.ApprovedByUserId ?? undefined,
  approvedByName: raw.approvedByName ?? raw.ApprovedByName ?? '',
  lastUpdated: raw.lastUpdated ?? raw.LastUpdated ?? '',
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
  rolls: (raw.rolls ?? raw.Rolls ?? []).map((l: any) => ({
    id: l.id ?? l.ID ?? 0,
    fabricReservationId: l.fabricReservationId ?? l.FabricReservationId ?? 0,
    rollReceivingId: l.rollReceivingId ?? l.RollReceivingId ?? 0,
    rollNumber: l.rollNumber ?? l.RollNumber ?? '',
    supplierRollNumber: l.supplierRollNumber ?? l.SupplierRollNumber,
    lotNumber: l.lotNumber ?? l.LotNumber,
    reservedQuantity: l.reservedQuantity ?? l.ReservedQuantity ?? 0,
    releasedQuantity: l.releasedQuantity ?? l.ReleasedQuantity ?? 0,
    status: l.status ?? l.Status,
  })),
  hasRollAssignment: raw.hasRollAssignment ?? raw.HasRollAssignment ?? false,
});

/** Hook de Fabric Reservation: consume /api/fabric-reservations */
export const useFabricReservations = () =>
  useResource<FabricReservation>(fabricReservationsApi, mapFabricReservation);
