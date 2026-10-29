import { useResource } from '../useResource';
import { fabricShipmentsApi } from '../../utils/api';
import { FabricShipment } from '../../types';

const mapFabricShipment = (raw: any): FabricShipment => ({
  id: raw.id ?? raw.ID ?? 0,
  shipmentNumber: raw.shipmentNumber ?? raw.ShipmentNumber ?? '',
  fabricPONumber: raw.fabricPONumber ?? raw.FabricPONumber ?? null,
  fgpoNumber: raw.fgpoNumber ?? raw.FGPONumber ?? null,
  supplier: raw.supplier ?? raw.Supplier ?? null,
  rollQty: raw.rollQty ?? raw.RollQty ?? 0,
  shippedQuantity: raw.shippedQuantity ?? raw.ShippedQuantity ?? 0,
  shippedRolls: raw.shippedRolls ?? raw.ShippedRolls ?? 0,
  uom: raw.uom ?? raw.UOM ?? '',
  shippedWeight: raw.shippedWeight ?? raw.ShippedWeight ?? 0,
  packingList: raw.packingList ?? raw.PackingList ?? '',
  invoiceNumber: raw.invoiceNumber ?? raw.InvoiceNumber ?? '',
  containerAWB: raw.containerAWB ?? raw.ContainerAWB ?? '',
  shippingMethod: raw.shippingMethod ?? raw.ShippingMethod ?? '',
  etd: raw.etd ?? raw.ETD ?? '',
  eta: raw.eta ?? raw.ETA ?? '',
  shipmentStatus: raw.shipmentStatus ?? raw.ShipmentStatus ?? '',
  deliveredToTexnicaDate: raw.deliveredToTexnicaDate ?? raw.DeliveredToTexnicaDate ?? '',
  inTransitQuantity: raw.inTransitQuantity ?? raw.InTransitQuantity ?? 0,
  remainingToDeliver: raw.remainingToDeliver ?? raw.RemainingToDeliver ?? 0,
  dataOwner: raw.dataOwner ?? raw.DataOwner ?? '',
  remarks: raw.remarks ?? raw.Remarks ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

/** Hook de Fabric Shipment: consume /api/fabric-shipments */
export const useFabricShipments = () =>
  useResource<FabricShipment>(fabricShipmentsApi, mapFabricShipment);
