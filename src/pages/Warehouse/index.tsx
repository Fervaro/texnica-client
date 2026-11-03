import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Button
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { packingControlsApi } from '../../utils/api';
import { usePackingFieldConfigs } from '../../hooks/packingControls/usePackingFieldConfigs';
import { visiblePackingFields, PACKING_FIELD_PROP } from '../../utils/packingFields';

interface PkRow {
  id: number;
  fgpoId: number;
  packingDate: string;
  fgpoNumber: string;
  style?: string;
  color?: string;
  size?: string;
  qcPassedQty: number;
  receivedByPackingQty: number;
  foldedQty: number;
  polybaggedQty: number;
  packedQty: number;
  fullCartons: number;
  partialCartons: number;
  pcsPerCarton: number;
  readyToShipQty: number;
  packingVariance: number;
  pendingPacking: number;
  overpackedQty: number;
}

// Cantidad de un campo configurable (FieldNo 1..4) en un registro de empaque.
const qtyFor = (p: PkRow, fieldNo: number): number =>
  Number(p[PACKING_FIELD_PROP[fieldNo] as keyof PkRow]) || 0;

const Warehouse: React.FC = () => {
  const [packingItems, setPackingItems] = useState<PkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFgpo, setExpandedFgpo] = useState<string | null>(null);

  const { configs: fieldConfigs } = usePackingFieldConfigs();
  const visibleFields = useMemo(() => visiblePackingFields(fieldConfigs), [fieldConfigs]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await packingControlsApi.getAll();
        setPackingItems((res.data ?? []).map((p: any) => ({
          id: p.id ?? p.ID ?? 0,
          fgpoId: p.fgpoId ?? p.FGPOId ?? 0,
          packingDate: p.packingDate ?? p.PackingDate ?? '',
          fgpoNumber: p.fgpoNumber ?? p.FGPONumber ?? '',
          style: p.style ?? p.Style ?? '',
          color: p.color ?? p.Color ?? '',
          size: p.size ?? p.Size ?? '',
          qcPassedQty: p.qcPassedQty ?? p.QcPassedQty ?? 0,
          receivedByPackingQty: p.receivedByPackingQty ?? p.ReceivedByPackingQty ?? 0,
          foldedQty: p.foldedQty ?? p.FoldedQty ?? 0,
          polybaggedQty: p.polybaggedQty ?? p.PolybaggedQty ?? 0,
          packedQty: p.packedQty ?? p.PackedQty ?? 0,
          fullCartons: p.fullCartons ?? p.FullCartons ?? 0,
          partialCartons: p.partialCartons ?? p.PartialCartons ?? 0,
          pcsPerCarton: p.pcsPerCarton ?? p.PcsPerCarton ?? 0,
          readyToShipQty: p.readyToShipQty ?? p.ReadyToShipQty ?? 0,
          packingVariance: p.packingVariance ?? p.PackingVariance ?? 0,
          pendingPacking: p.pendingPacking ?? p.PendingPacking ?? 0,
          overpackedQty: p.overpackedQty ?? p.OverpackedQty ?? 0,
        })));
      } catch (err: any) { setError(err?.response?.data?.message || 'Failed to load packing data.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const totalPacked = packingItems.reduce((s, p) => s + p.packedQty, 0);
  const totalReady = packingItems.reduce((s, p) => s + p.readyToShipQty, 0);
  const totalPending = packingItems.reduce((s, p) => s + p.pendingPacking, 0);

  // Totales globales de los campos configurables (p. ej. IRR 2nd, IRR 3rd).
  const totalFields: Record<number, number> = {};
  visibleFields.forEach(f => {
    totalFields[f.fieldNo] = packingItems.reduce((s, p) => s + qtyFor(p, f.fieldNo), 0);
  });

  // Agrupa los registros de empaque por FGPO (una fila por FGPO, expandible),
  // igual que FGPO Master → FGPO Lines.
  const fgpoGroups = useMemo(() => {
    const map = new Map<string, { key: string; fgpoNumber: string; items: PkRow[] }>();
    packingItems.forEach(p => {
      const key = p.fgpoNumber ? p.fgpoNumber : `FGPO #${p.fgpoId || p.id}`;
      let g = map.get(key);
      if (!g) {
        g = { key, fgpoNumber: p.fgpoNumber || '', items: [] };
        map.set(key, g);
      }
      g.items.push(p);
    });
    return Array.from(map.values()).sort((a, b) => a.fgpoNumber.localeCompare(b.fgpoNumber));
  }, [packingItems]);

  // Resumen por FGPO: totales y desglose estilo+color+talla (cantidad de cajas).
  const fgpoSummary = useMemo(() => {
    return fgpoGroups.map(g => {
      const totalPacked = g.items.reduce((s, p) => s + p.packedQty, 0);
      const totalReady = g.items.reduce((s, p) => s + p.readyToShipQty, 0);
      const totalPending = g.items.reduce((s, p) => s + p.pendingPacking, 0);

      // Totales de los campos configurables (p. ej. IRR 2nd, IRR 3rd).
      const fieldTotals: Record<number, number> = {};
      visibleFields.forEach(f => {
        fieldTotals[f.fieldNo] = g.items.reduce((s, p) => s + qtyFor(p, f.fieldNo), 0);
      });

      type BoxAgg = { style: string; color: string; size: string; pieces: number; perBox: number; unpacked: number; fields: Record<number, number> };
      const boxMap = new Map<string, BoxAgg>();
      g.items.forEach(p => {
        const key = `${p.style || ''}|${p.color || ''}|${p.size || ''}`;
        const cur = boxMap.get(key);
        if (cur) {
          cur.pieces += p.packedQty;
          cur.unpacked += p.pendingPacking;
          if (p.pcsPerCarton > 0) cur.perBox = p.pcsPerCarton;
          visibleFields.forEach(f => { cur.fields[f.fieldNo] += qtyFor(p, f.fieldNo); });
        } else {
          const fields: Record<number, number> = {};
          visibleFields.forEach(f => { fields[f.fieldNo] = qtyFor(p, f.fieldNo); });
          boxMap.set(key, {
            style: p.style || '',
            color: p.color || '',
            size: p.size || '',
            pieces: p.packedQty,
            perBox: p.pcsPerCarton || 0,
            unpacked: p.pendingPacking,
            fields,
          });
        }
      });
      const boxRows = Array.from(boxMap.values()).map(r => ({
        ...r,
        boxes: r.perBox > 0 ? Math.ceil(r.pieces / r.perBox) : 0,
      }));

      return {
        key: g.key,
        fgpoNumber: g.fgpoNumber,
        totalPacked,
        totalReady,
        totalPending,
        fieldTotals,
        totalBoxes: boxRows.reduce((s, r) => s + r.boxes, 0),
        boxRows,
      };
    });
  }, [fgpoGroups, visibleFields]);

  const totalBoxes = fgpoSummary.reduce((s, g) => s + g.totalBoxes, 0);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
        Warehouse Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Control de empaque — estado de empaque y listo para embarque
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : (
        <>
          {/* Summary Cards */}
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Packed</Typography>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{totalPacked.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Paper>
            <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'success.main', flex: 1, minWidth: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LocalShippingIcon sx={{ fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Ready to Ship</Typography>
                  <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>{totalReady.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Paper>
            <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'warning.main', flex: 1, minWidth: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarehouseIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Pending Packing</Typography>
                  <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>{totalPending.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Paper>
            <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'info.main', flex: 1, minWidth: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Inventory2Icon sx={{ fontSize: 40, color: 'info.main' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total de cajas</Typography>
                  <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>{totalBoxes.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Tarjetas pequeñas: campos configurables (IRR 2nd, IRR 3rd, etc.) */}
          {visibleFields.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              {visibleFields.map(f => (
                <Paper key={f.fieldNo} elevation={2} sx={{ p: 1.5, px: 2.5, borderTop: 3, borderColor: 'info.main', minWidth: 170 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Inventory2Icon sx={{ fontSize: 24, color: 'info.main' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{f.label}</Typography>
                      <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 'bold' }}>{(totalFields[f.fieldNo] ?? 0).toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {/* Packing Control por FGPO */}
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
              <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Packing Control por FGPO
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'primary.light' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>FGPO</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">Total Packed</TableCell>
                    {visibleFields.map(f => (
                      <TableCell key={f.fieldNo} sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">{f.label}</TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">Ready to Ship</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">Pending</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">Cajas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fgpoSummary.length === 0 ? (
                    <TableRow><TableCell colSpan={5 + visibleFields.length} align="center" sx={{ color: 'text.secondary', py: 3 }}>No packing records yet.</TableCell></TableRow>
                  ) : fgpoSummary.map(g => (
                    <React.Fragment key={g.key}>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          <Button
                            size="small"
                            onClick={() => setExpandedFgpo(expandedFgpo === g.key ? null : g.key)}
                            startIcon={expandedFgpo === g.key ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ fontWeight: 600, textTransform: 'none' }}
                          >
                            {g.fgpoNumber || g.key}
                          </Button>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{g.totalPacked.toLocaleString()}</TableCell>
                        {visibleFields.map(f => (
                          <TableCell key={f.fieldNo} align="right" sx={{ fontWeight: 600 }}>{(g.fieldTotals[f.fieldNo] ?? 0).toLocaleString()}</TableCell>
                        ))}
                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>{g.totalReady.toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 600 }}>{g.totalPending.toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 600 }}>{g.totalBoxes.toLocaleString()}</TableCell>
                      </TableRow>
                      {expandedFgpo === g.key && (
                        <TableRow>
                          <TableCell colSpan={5 + visibleFields.length} sx={{ bgcolor: 'grey.50', p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                              Packing: {g.fgpoNumber || g.key}
                            </Typography>
                            {g.boxRows.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">Sin registros para este FGPO.</Typography>
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    {['Estilo', 'Color', 'Talla', 'Piezas totales', ...visibleFields.map(f => f.label), 'Cant. por caja', 'Cant. de cajas', 'Sin empacar'].map(h => (
                                      <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {g.boxRows.map(r => (
                                    <TableRow key={`${r.style}|${r.color}|${r.size}`} hover>
                                      <TableCell sx={{ fontWeight: 600 }}>{r.style || '-'}</TableCell>
                                      <TableCell>{r.color || '-'}</TableCell>
                                      <TableCell>{r.size || '-'}</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>{r.pieces.toLocaleString()}</TableCell>
                                      {visibleFields.map(f => (
                                        <TableCell key={f.fieldNo}>{(r.fields[f.fieldNo] ?? 0).toLocaleString()}</TableCell>
                                      ))}
                                      <TableCell>{r.perBox || '-'}</TableCell>
                                      <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>{r.boxes.toLocaleString()}</TableCell>
                                      <TableCell sx={{ color: 'warning.main', fontWeight: 600 }}>{r.unpacked.toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

        </>
      )}
    </Box>
  );
};

export default Warehouse;
