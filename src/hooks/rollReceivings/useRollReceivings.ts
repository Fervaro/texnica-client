import { useResource } from '../useResource';
import { rollReceivingsApi } from '../../utils/api';
import { RollReceiving } from '../../types';

const mapRollReceiving = (raw: any): RollReceiving => ({
  id: raw.id ?? raw.ID ?? 0,
  receivingId: raw.receivingId ?? raw.ReceivingId ?? 0,
  receivingNumber: raw.receivingNumber ?? raw.ReceivingNumber ?? '',
  fabricPOId: raw.fabricPOId ?? raw.FabricPOId ?? 0,
  fabricPONumber: raw.fabricPONumber ?? raw.FabricPONumber ?? '',
  fgpoId: raw.fgpoId ?? raw.FGPOId ?? 0,
  fgpoNumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
  customerName: raw.customerName ?? raw.CustomerName ?? '',
  supplier: raw.supplier ?? raw.Supplier ?? '',
  lotNumber: raw.lotNumber ?? raw.LotNumber ?? '',
  lotId: raw.lotId ?? raw.LotId,
  shipmentLotId: raw.shipmentLotId ?? raw.ShipmentLotId,
  shipmentLotNumber: raw.shipmentLotNumber ?? raw.ShipmentLotNumber ?? '',
  rollNumber: raw.rollNumber ?? raw.RollNumber ?? '',
  supplierRollNumber: raw.supplierRollNumber ?? raw.SupplierRollNumber ?? '',
  color: raw.color ?? raw.Color ?? '',
  grossWeight: raw.grossWeight ?? raw.GrossWeight ?? 0,
  netWeight: raw.netWeight ?? raw.NetWeight ?? 0,
  actualYardage: raw.actualYardage ?? raw.ActualYardage ?? 0,
  actualWidth: raw.actualWidth ?? raw.ActualWidth ?? 0,
  actualGSM: raw.actualGSM ?? raw.ActualGSM ?? 0,
  shadeGroup: raw.shadeGroup ?? raw.ShadeGroup ?? '',
  damagedQty: raw.damagedQty ?? raw.DamagedQty ?? 0,
  condition: raw.condition ?? raw.Condition ?? '',
  warehouseLocation: raw.warehouseLocation ?? raw.WarehouseLocation ?? '',
  receivedDate: raw.receivedDate ?? raw.ReceivedDate ?? '',
  dataOwner: raw.dataOwner ?? raw.DataOwner ?? '',
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

/** Hook de Roll Receiving: consume /api/roll-receivings */
export const useRollReceivings = () =>
  useResource<RollReceiving>(rollReceivingsApi, mapRollReceiving);
