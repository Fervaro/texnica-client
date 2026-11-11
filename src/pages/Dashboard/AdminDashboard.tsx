import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert,
  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import { packingControlsApi, fabricShipmentsApi, fabricInventoriesApi, fabricReceivingsApi, shipmentControlsApi, fgpoApi } from '../../utils/api';
import { usePackingFieldConfigs } from '../../hooks/packingControls/usePackingFieldConfigs';
import { visiblePackingFields, PACKING_FIELD_PROP } from '../../utils/packingFields';
import { FgpoTimeline } from '../../types';

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
  const [shippedBoxes, setShippedBoxes] = useState(0);
  const [shippedPieces, setShippedPieces] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Búsqueda de FGPO + línea de tiempo
  const [fgpoSearch, setFgpoSearch] = useState('');
  const [fgpoResults, setFgpoResults] = useState<{ id: number; fgpoNumber: string; style?: string; color?: string }[]>([]);
  const [fgpoSearching, setFgpoSearching] = useState(false);
  const [timeline, setTimeline] = useState<FgpoTimeline | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  const handleFgpoSearch = async (query?: string) => {
    const q = (query ?? fgpoSearch).trim().toLowerCase();
    setFgpoSearching(true);
    try {
      const res = await fgpoApi.getAll();
      const list = (Array.isArray(res.data) ? res.data : (res.data?.items ?? [])) as any[];
      const matched = q
        ? list.filter((f: any) => (f.fgpoNumber ?? f.FGPONumber ?? '').toLowerCase().includes(q))
        : list;
      setFgpoResults(matched
        .slice(0, 5)
        .map((f: any) => ({
          id: f.id ?? f.ID ?? 0,
          fgpoNumber: f.fgpoNumber ?? f.FGPONumber ?? '',
          style: f.style ?? f.Style ?? '',
          color: f.color ?? f.Color ?? '',
        })));
    } catch {
      setFgpoResults([]);
    } finally {
      setFgpoSearching(false);
    }
  };

  const openTimeline = async (id: number) => {
    setTimelineOpen(true);
    setTimeline(null);
    setTimelineError('');
    setTimelineLoading(true);
    try {
      const res = await fgpoApi.getTimeline(id);
      setTimeline(res.data ?? res);
    } catch (err: any) {
      setTimelineError(err?.response?.data?.message || err?.message || 'Could not load timeline.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const { configs: fieldConfigs } = usePackingFieldConfigs();
  const visibleFields = useMemo(() => visiblePackingFields(fieldConfigs), [fieldConfigs]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [pkRes, shipRes, invRes, recvRes, shipCtrlRes] = await Promise.all([
          packingControlsApi.getAll(),
          fabricShipmentsApi.getTotals(),
          fabricInventoriesApi.getTotals(),
          fabricReceivingsApi.getTotals(),
          shipmentControlsApi.getAll().catch(() => ({ data: [] })),
        ]);
        setPackingItems((pkRes.data ?? []).map(mapPk));
        const shipments = (shipCtrlRes.data ?? []) as any[];
        let boxes = 0, pieces = 0;
        shipments.forEach((sc: any) => {
          const lines = sc.lines ?? sc.Lines ?? [];
          const lineBoxes = lines.reduce((a: number, l: any) => a + (l.boxesToShip ?? l.BoxesToShip ?? 0), 0);
          const linePieces = lines.reduce((a: number, l: any) =>
            a + (l.pieces ?? l.Pieces ?? (l.boxesToShip ?? l.BoxesToShip ?? 0) * (l.pcsPerCarton ?? l.PcsPerCarton ?? 0)), 0);
          boxes += lineBoxes;
          pieces += lines.length > 0 ? linePieces : (sc.totalShippedQty ?? sc.TotalShippedQty ?? 0);
        });
        setShippedBoxes(boxes);
        setShippedPieces(pieces);
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

  const pendingShipPieces = Math.max(0, totalReady - shippedPieces);
  const pendingShipBoxes = Math.max(0, totalBoxes - shippedBoxes);

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
      {/* ── Búsqueda de FGPO + línea de tiempo ── */}
      <Paper elevation={1} sx={{ p: 1.5, mb: 2, borderTop: 3, borderColor: 'primary.main' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Search FGPO</Typography>
        <Box component="form" onSubmit={e => { e.preventDefault(); handleFgpoSearch(); }} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small" fullWidth
            placeholder="Search by FGPO number..."
            value={fgpoSearch}
            onChange={e => { setFgpoSearch(e.target.value); handleFgpoSearch(e.target.value); }}
            onFocus={() => { if (fgpoResults.length === 0) handleFgpoSearch(''); }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          <Button size="small" variant="contained" type="submit" disabled={fgpoSearching}>Search</Button>
        </Box>
        {fgpoResults.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, maxHeight: 160, overflow: 'auto' }}>
            {fgpoResults.map(f => (
              <Chip
                key={f.id}
                size="small"
                label={`${f.fgpoNumber}${f.style ? ` · ${f.style}` : ''}${f.color ? ` / ${f.color}` : ''}`}
                onClick={() => openTimeline(f.id)}
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* ── Warehouse Overview ── */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
        Warehouse Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Packing control — packing status and ready to ship
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
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Boxes</Typography>
              <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>{totalBoxes.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Segunda fila: enviado y pendiente por enviar (piezas y cajas) */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: '#0d9488', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SendIcon sx={{ fontSize: 40, color: '#0d9488' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Shipped</Typography>
              <Typography variant="h4" sx={{ color: '#0d9488', fontWeight: 'bold' }}>{shippedPieces.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: '#0d9488', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Inventory2Icon sx={{ fontSize: 40, color: '#0d9488' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Box Shipped</Typography>
              <Typography variant="h4" sx={{ color: '#0d9488', fontWeight: 'bold' }}>{shippedBoxes.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: '#6b7280', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarehouseIcon sx={{ fontSize: 40, color: '#6b7280' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pending Ship</Typography>
              <Typography variant="h4" sx={{ color: '#6b7280', fontWeight: 'bold' }}>{pendingShipPieces.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: '#6b7280', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 40, color: '#6b7280' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pending Ship Box</Typography>
              <Typography variant="h4" sx={{ color: '#6b7280', fontWeight: 'bold' }}>{pendingShipBoxes.toLocaleString()}</Typography>
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
        Fabric Control
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Warehouse entries based on recorded fabric receipts
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShippingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Yards In Transit</Typography>
              <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{shipTotals.shipped.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Received</Typography>
              <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{recvReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'success.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Inventory2Icon sx={{ fontSize: 40, color: 'success.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Available</Typography>
              <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 'bold' }}>{invTotals.available.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'warning.main', flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Inventory2Icon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pending to record</Typography>
              <Typography variant="h5" sx={{ color: 'warning.main', fontWeight: 'bold' }}>{shipTotals.pending.toLocaleString(undefined, { maximumFractionDigits: 2 })} <Typography component="span" variant="body2">yd</Typography></Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* ── Línea de tiempo de la FGPO ── */}
      <Dialog open={timelineOpen} onClose={() => setTimelineOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Process Timeline{timeline ? ` — ${timeline.fgpoNumber}` : ''}
        </DialogTitle>
        <DialogContent>
          {timelineLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : timelineError ? (
            <Alert severity="error">{timelineError}</Alert>
          ) : timeline ? (
            <>
              {timeline.customerProvidedFabric && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Customer-provided fabric — supply steps skipped.
                </Alert>
              )}
              <Box sx={{ position: 'relative', pl: 3 }}>
                {timeline.steps.map((s, i) => {
                  const color =
                    s.status === 'done' ? 'success.main'
                    : s.status === 'active' ? 'primary.main'
                    : s.status === 'not_applicable' ? 'text.disabled'
                    : 'grey.400';
                  const isLast = i === timeline.steps.length - 1;
                  return (
                    <Box key={s.step} sx={{ position: 'relative', pb: isLast ? 0 : 2 }}>
                      {!isLast && (
                        <Box sx={{ position: 'absolute', left: 7, top: 18, bottom: 0, width: 2, bgcolor: 'grey.300' }} />
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0, mt: 0.4,
                          bgcolor: color,
                          border: s.status === 'pending' ? '2px solid #bdbdbd' : undefined,
                        }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.step}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.status === 'pending' ? 'Pending'
                              : s.status === 'active' ? 'In progress'
                              : s.status === 'not_applicable' ? 'Not applicable'
                              : s.date ? new Date(s.date).toLocaleDateString() : '-'}
                            {s.detail ? ` · ${s.detail}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
