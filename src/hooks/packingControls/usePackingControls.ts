import { useResource } from '../useResource';
import { packingControlsApi } from '../../utils/api';
import { PackingControl } from '../../types';

const mapPackingControl = (raw: any): PackingControl => ({
  id: raw.id ?? raw.ID ?? 0,
  packingDate: raw.packingDate ?? raw.PackingDate ?? '',
  fgpoId: raw.fgpoId ?? raw.FGPOId ?? 0,
  boxTypeId: raw.boxTypeId ?? raw.BoxTypeId ?? undefined,
  boxCode: raw.boxCode ?? raw.BoxCode ?? '',
  fgpoNumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
  customerName: raw.customerName ?? raw.CustomerName ?? '',
  style: raw.style ?? raw.Style ?? '',
  color: raw.color ?? raw.Color ?? '',
  size: raw.size ?? raw.Size ?? '',
  qcPassedQty: raw.qcPassedQty ?? raw.QcPassedQty ?? 0,
  receivedByPackingQty: raw.receivedByPackingQty ?? raw.ReceivedByPackingQty ?? 0,
  foldedQty: raw.foldedQty ?? raw.FoldedQty ?? 0,
  polybaggedQty: raw.polybaggedQty ?? raw.PolybaggedQty ?? 0,
  packedQty: raw.packedQty ?? raw.PackedQty ?? 0,
  fullCartons: raw.fullCartons ?? raw.FullCartons ?? 0,
  partialCartons: raw.partialCartons ?? raw.PartialCartons ?? 0,
  pcsPerCarton: raw.pcsPerCarton ?? raw.PcsPerCarton ?? 0,
  readyToShipQty: raw.readyToShipQty ?? raw.ReadyToShipQty ?? 0,
  packingVariance: raw.packingVariance ?? raw.PackingVariance ?? 0,
  pendingPacking: raw.pendingPacking ?? raw.PendingPacking ?? 0,
  overpackedQty: raw.overpackedQty ?? raw.OverpackedQty ?? 0,
  responsiblePersonId: raw.responsiblePersonId ?? raw.ResponsiblePersonId ?? undefined,
  responsiblePersonName: raw.responsiblePersonName ?? raw.ResponsiblePersonName ?? '',
  lastUpdated: raw.lastUpdated ?? raw.LastUpdated ?? '',
  remarks: raw.remarks ?? raw.Remarks ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

/** Hook de Packing Control: consume /api/packing-controls */
export const usePackingControls = () =>
  useResource<PackingControl>(packingControlsApi, mapPackingControl);
