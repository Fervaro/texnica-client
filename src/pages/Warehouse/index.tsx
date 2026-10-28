import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { packingControlsApi } from '../../utils/api';

interface PkRow {
  id: number;
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

const Warehouse: React.FC = () => {
  const [packingItems, setPackingItems] = useState<PkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await packingControlsApi.getAll();
        setPackingItems((res.data ?? []).map((p: any) => ({
          id: p.id ?? p.ID ?? 0,
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

  // Agrupación por estilo+color+talla: piezas totales, cantidad por caja y
  // cantidad de cajas derivada (piezas / piezas por caja).
  const boxRows = useMemo(() => {
    const map = new Map<string, { style: string; color: string; size: string; pieces: number; perBox: number; unpacked: number }>();
    packingItems.forEach(p => {
      const key = `${p.style || ''}|${p.color || ''}|${p.size || ''}`;
      const cur = map.get(key);
      if (cur) {
        cur.pieces += p.packedQty;
        cur.unpacked += p.pendingPacking;
        if (p.pcsPerCarton > 0) cur.perBox = p.pcsPerCarton;
      } else {
        map.set(key, {
          style: p.style || '',
          color: p.color || '',
          size: p.size || '',
          pieces: p.packedQty,
          perBox: p.pcsPerCarton || 0,
          unpacked: p.pendingPacking,
        });
      }
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      boxes: r.perBox > 0 ? Math.ceil(r.pieces / r.perBox) : 0,
    }));
  }, [packingItems]);

  const totalBoxes = boxRows.reduce((s, r) => s + r.boxes, 0);

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

          {/* Packing Control */}
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
              <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Packing Control
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'primary.light' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Estilo</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Color</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Talla</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Piezas totales</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Cant. por caja</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Cant. de cajas</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Sin empacar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {boxRows.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>No packing records yet.</TableCell></TableRow>
                  ) : boxRows.map(r => (
                    <TableRow key={`${r.style}|${r.color}|${r.size}`} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.style || '-'}</TableCell>
                      <TableCell>{r.color || '-'}</TableCell>
                      <TableCell>{r.size || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.pieces.toLocaleString()}</TableCell>
                      <TableCell>{r.perBox || '-'}</TableCell>
                      <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>{r.boxes.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: 'warning.main', fontWeight: 600 }}>{r.unpacked.toLocaleString()}</TableCell>
                    </TableRow>
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
