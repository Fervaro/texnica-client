import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { finishedGoodsApi, fabricInventoriesApi } from '../../utils/api';

interface FgRow {
  id: number;
  fgpoNumber: string;
  customerName: string;
  style?: string;
  color?: string;
  packedQty: number;
  warehouseReceived: number;
  reservedForShipment: number;
  readyToShipQty: number;
  warehouseBalance: number;
  totalShippedQty: number;
  overShippedQty: number;
  warehouseLocation?: string;
  status?: string;
}

interface InvRow {
  id: number;
  fabricPONumber: string;
  fgpoNumber: string;
  componentCode?: string;
  lotNumber?: string;
  uom?: string;
  availableQuantity: number;
  warehouseLocation?: string;
  inventoryStatus?: string;
}

const sc = (s: string) => {
  const m: Record<string, any> = {
    Shipped: 'success', 'Ready to Ship': 'success', 'In Stock': 'success', Available: 'success',
    'Partially Shipped': 'info', Received: 'info', Reserved: 'primary', 'Low Stock': 'warning',
    Pending: 'warning', 'On Hold': 'warning', 'Out of Stock': 'error', Cancelled: 'error', Shortage: 'error',
  };
  return m[s] ?? 'default';
};

const Warehouse: React.FC = () => {
  const [fgItems, setFgItems] = useState<FgRow[]>([]);
  const [invItems, setInvItems] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUom, setSelectedUom] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [fg, inv] = await Promise.all([
          finishedGoodsApi.getAll(),
          fabricInventoriesApi.getAll(),
        ]);
        setFgItems((fg.data ?? []).map((f: any) => ({
          id: f.id ?? f.ID,
          fgpoNumber: f.fgpoNumber ?? f.FGPONumber ?? '',
          customerName: f.customerName ?? f.CustomerName ?? '',
          style: f.style ?? f.Style ?? '',
          color: f.color ?? f.Color ?? '',
          packedQty: f.packedQty ?? f.PackedQty ?? 0,
          warehouseReceived: f.warehouseReceived ?? f.WarehouseReceived ?? 0,
          reservedForShipment: f.reservedForShipment ?? f.ReservedForShipment ?? 0,
          readyToShipQty: f.readyToShipQty ?? f.ReadyToShipQty ?? 0,
          warehouseBalance: f.warehouseBalance ?? f.WarehouseBalance ?? 0,
          totalShippedQty: f.totalShippedQty ?? f.TotalShippedQty ?? 0,
          overShippedQty: f.overShippedQty ?? f.OverShippedQty ?? 0,
          warehouseLocation: f.warehouseLocation ?? f.WarehouseLocation ?? '',
          status: f.status ?? f.Status ?? '',
        })));
        setInvItems((inv.data ?? []).map((i: any) => ({
          id: i.id ?? i.ID,
          fabricPONumber: i.fabricPONumber ?? i.FabricPONumber ?? '',
          fgpoNumber: i.fgpoNumber ?? i.FGPONumber ?? '',
          componentCode: i.componentCode ?? i.ComponentCode ?? '',
          lotNumber: i.lotNumber ?? i.LotNumber ?? '',
          uom: i.uom ?? i.UOM ?? '',
          availableQuantity: i.availableQuantity ?? i.AvailableQuantity ?? 0,
          warehouseLocation: i.warehouseLocation ?? i.WarehouseLocation ?? '',
          inventoryStatus: i.inventoryStatus ?? i.InventoryStatus ?? '',
        })));
      } catch (err: any) { setError(err?.response?.data?.message || 'Failed to load warehouse data.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const totalBalance = fgItems.reduce((s, f) => s + f.warehouseBalance, 0);
  const totalReady = fgItems.reduce((s, f) => s + f.readyToShipQty, 0);

  // Unidades presentes en los datos (sin duplicados ni vacías).
  const fabricUoms = useMemo(() => {
    const set = new Set<string>();
    invItems.forEach(i => {
      const u = (i.uom || '').trim();
      if (u) set.add(u);
    });
    return Array.from(set).sort();
  }, [invItems]);

  // Nunca se mantiene una selección inválida: si la unidad elegida deja de
  // existir, se cae a la primera unidad disponible.
  const effectiveUom = fabricUoms.includes(selectedUom) ? selectedUom : (fabricUoms[0] ?? '');
  const totalFabric = invItems
    .filter(i => (i.uom || '').trim() === effectiveUom)
    .reduce((s, i) => s + i.availableQuantity, 0);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
        Warehouse Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Estado real del almacén — mercancía terminada e inventario de tela
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : (
        <>
          {/* Summary Cards */}
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', flex: 1, minWidth: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarehouseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Warehouse Balance</Typography>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{totalBalance.toLocaleString()}</Typography>
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
                <InventoryIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Fabric Available</Typography>
                  <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                    {totalFabric.toLocaleString()}{effectiveUom ? ` ${effectiveUom}` : ''}
                  </Typography>
                  <FormControl size="small" sx={{ mt: 1, minWidth: 140 }}>
                    <InputLabel id="fabric-uom-label">Unit</InputLabel>
                    <Select
                      labelId="fabric-uom-label"
                      label="Unit"
                      value={effectiveUom}
                      onChange={e => setSelectedUom(e.target.value as string)}
                      disabled={fabricUoms.length === 0}
                    >
                      {fabricUoms.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {fabricUoms.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Sin registros de tela
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Finished Goods */}
          <Paper elevation={2} sx={{ p: 2, mb: 3, borderTop: 4, borderColor: 'primary.main' }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
              <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Finished Goods
            </Typography>
            {fgItems.some(f => f.overShippedQty > 0) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Discrepancia: hay FGPO con envíos que superan la cantidad recibida (ver columna Over-shipped).
              </Alert>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'primary.light' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>FGPO</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Style / Color</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Packed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Reserved</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Ready to Ship</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Over-shipped</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fgItems.length === 0 ? (
                    <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 3 }}>No finished goods yet.</TableCell></TableRow>
                  ) : fgItems.map(f => (
                    <TableRow key={f.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{f.fgpoNumber}</TableCell>
                      <TableCell>{f.style || '-'} / {f.color || '-'}</TableCell>
                      <TableCell>{f.warehouseReceived}</TableCell>
                      <TableCell>{f.packedQty}</TableCell>
                      <TableCell>{f.reservedForShipment}</TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>{f.readyToShipQty}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{f.warehouseBalance}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>{f.overShippedQty > 0 ? f.overShippedQty : '-'}</TableCell>
                      <TableCell>{f.warehouseLocation || '-'}</TableCell>
                      <TableCell><Chip label={f.status || 'N/A'} size="small" color={sc(f.status ?? '')} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Fabric Inventory */}
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'warning.main' }}>
            <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 'bold', mb: 2 }}>
              <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Fabric Inventory
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'warning.light' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Fabric PO</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>FGPO</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Component</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Lot</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>UOM</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Available</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invItems.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 3 }}>No fabric inventory yet.</TableCell></TableRow>
                  ) : invItems.map(i => (
                    <TableRow key={i.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{i.fabricPONumber}</TableCell>
                      <TableCell>{i.fgpoNumber}</TableCell>
                      <TableCell>{i.componentCode || '-'}</TableCell>
                      <TableCell>{i.lotNumber || '-'}</TableCell>
                      <TableCell>{i.uom || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i.availableQuantity}</TableCell>
                      <TableCell>{i.warehouseLocation || '-'}</TableCell>
                      <TableCell><Chip label={i.inventoryStatus || 'N/A'} size="small" color={sc(i.inventoryStatus ?? '')} /></TableCell>
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
