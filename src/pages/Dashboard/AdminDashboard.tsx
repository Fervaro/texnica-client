import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { packingControlsApi, fabricShipmentsApi, fabricInventoriesApi, fabricReceivingsApi } from '../../utils/api';
import { usePackingFieldConfigs } from '../../hooks/packingControls/usePackingFieldConfigs';
import { visiblePackingFields, PACKING_FIELD_PROP } from '../../utils/packingFields';

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

interface PkRow {
  id: number;
  fgpoId: number;
  fgpoNumber: string;
  style: string;
  color: string;
  size: string;
  qcPassedQty: number;
  receivedByPackingQty: number;
  foldedQty: number;
  polybaggedQty: number;
  packedQty: number;
  pcsPerCarton: number;
  readyToShipQty: number;
  pendingPacking: number;
}

const qtyFor = (p: PkRow, fieldNo: number): number =>
  Number(p[PACKING_FIELD_PROP[fieldNo] as keyof PkRow]) || 0;

const mapPk = (p: any): PkRow => ({
  id: p.id ?? p.ID ?? 0,
  fgpoId: p.fgpoId ?? p.FGPOId ?? 0,
  fgpoNumber: p.fgpoNumber ?? p.FGPONumber ?? '',
  style: p.style ?? p.Style ?? '',
  color: p.color ?? p.Color ?? '',
  size: p.size ?? p.Size ?? '',
  qcPassedQty: p.qcPassedQty ?? p.QcPassedQty ?? 0,
  receivedByPackingQty: p.receivedByPackingQty ?? p.ReceivedByPackingQty ?? 0,
  foldedQty: p.foldedQty ?? p.FoldedQty ?? 0,
  polybaggedQty: p.polybaggedQty ?? p.PolybaggedQty ?? 0,
  packedQty: p.packedQty ?? p.PackedQty ?? 0,
  pcsPerCarton: p.pcsPerCarton ?? p.PcsPerCarton ?? 0,
  readyToShipQty: p.readyToShipQty ?? p.ReadyToShipQty ?? 0,
  pendingPacking: p.pendingPacking ?? p.PendingPacking ?? 0,
});

/** Dashboard para Super Admin y Administrador TPCS: Warehouse + Control de Tela. */
const AdminDashboard: React.FC = () => {
  const [packingItems, setPackingItems] = useState<PkRow[]>([]);
  const [shipTotals, setShipTotals] = useState({ shipped: 0, received: 0, pending: 0 });
  const [invTotals, setInvTotals] = useState({ physical: 0, reserved: 0, available: 0 });
  const [recvReceived, setRecvReceived] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { configs: fieldConfigs } = usePackingFieldConfigs();
  const visibleFields = useMemo(() => visiblePackingFields(fieldConfigs), [fieldConfigs]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [pkRes, shipRes, invRes, recvRes] = await Promise.all([
          packingControlsApi.getAll(),
          fabricShipmentsApi.getTotals(),
          fabricInventoriesApi.getTotals(),
          fabricReceivingsApi.getTotals(),
        ]);
        setPackingItems((pkRes.data ?? []).map(mapPk));
        const t = shipRes.data ?? {};
        setShipTotals({
          shipped: num(t.shippedYards ?? t.ShippedYards),
          received: num(t.receivedYards ?? t.ReceivedYards),
          pending: num(t.pendingYards ?? t.PendingYards),
        });
        const it = invRes.data ?? {};
        setInvTotals({
          physical: num(it.physicalYards ?? it.PhysicalYards),
          reserved: num(it.reservedYards ?? it.ReservedYards),
          available: num(it.availableYards ?? it.AvailableYards),
        });
        const rt = recvRes.data ?? {};
        setRecvReceived(num(rt.receivedYards ?? rt.ReceivedYards));
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalPacked = packingItems.reduce((s, p) => s + p.packedQty, 0);
  const totalReady = packingItems.reduce((s, p) => s + p.readyToShipQty, 0);
  const totalPending = packingItems.reduce((s, p) => s + p.pendingPacking, 0);

  // Total de cajas: agrupa por estilo/color/talla y divide piezas entre piezas por caja.
  const totalBoxes = useMemo(() => {
    const map = new Map<string, { pieces: number; perBox: number }>();
    packingItems.forEach((p) => {
      const key = `${p.style}|${p.color}|${p.size}`;
      const cur = map.get(key);
      if (cur) {
        cur.pieces += p.packedQty;
        if (p.pcsPerCarton > 0) cur.perBox = p.pcsPerCarton;
      } else {
        map.set(key, { pieces: p.packedQty, perBox: p.pcsPerCarton });
      }
    });
    return Array.from(map.values()).reduce(
      (s, r) => s + (r.perBox > 0 ? Math.ceil(r.pieces / r.perBox) : 0),
      0,
    );
  }, [packingItems]);

  const fieldTotals: Record<number, number> = {};
  visibleFields.forEach((f) => {
    fieldTotals[f.fieldNo] = packingItems.reduce((s, p) => s + qtyFor(p, f.fieldNo), 0);
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      {/* ── Warehouse Overview ── */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
        Warehouse Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Control de empaque — estado de empaque y listo para embarque
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Packed</Typography>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{totalPacked.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'success.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShippingIcon sx={{ fontSize: 40, color: 'success.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Ready to Ship</Typography>
              <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>{totalReady.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'warning.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarehouseIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pending Packing</Typography>
              <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>{totalPending.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'info.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Inventory2Icon sx={{ fontSize: 40, color: 'info.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total de cajas</Typography>
              <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>{totalBoxes.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {visibleFields.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          {visibleFields.map((f) => (
            <Paper key={f.fieldNo} elevation={2} sx={{ p: 1.5, px: 2.5, borderTop: 3, borderColor: 'info.main', minWidth: 170 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Inventory2Icon sx={{ fontSize: 24, color: 'info.main' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{f.label}</Typography>
                  <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 'bold' }}>{(fieldTotals[f.fieldNo] ?? 0).toLocaleString()}</Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* ── Control de Tela ── */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        <Inventory2Icon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
        Control de Tela
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Entradas a bodega según las recepciones de tela registradas
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShippingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Yardas en Tránsito</Typography>
              <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{shipTotals.shipped.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Recibido</Typography>
              <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{recvReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'success.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Inventory2Icon sx={{ fontSize: 40, color: 'success.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Disponible</Typography>
              <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 'bold' }}>{invTotals.available.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'warning.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Inventory2Icon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pendiente de registrar</Typography>
              <Typography variant="h5" sx={{ color: 'warning.main', fontWeight: 'bold' }}>{shipTotals.pending.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
