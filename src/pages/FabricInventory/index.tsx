import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, InputAdornment,
  CircularProgress, Alert, Chip
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fabricShipmentsApi } from '../../utils/api';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';
import { FabricControlTela } from '../../types';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
const fmtNum = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtDate = (v?: string) => v?.split('T')[0] || '-';

const statusColor = (s: string) => {
  const m: Record<string, any> = {
    'Fully Received': 'success',
    'Partially Received': 'warning',
    'Pending': 'info',
    'In Transit': 'primary',
  };
  return m[s] ?? 'default';
};

const FabricInventoryPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [rows, setRows] = useState<FabricControlTela[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [shipTotals, setShipTotals] = useState({ shipped: 0, received: 0, pending: 0 });

  const loadShipTotals = async () => {
    try {
      const res = await fabricShipmentsApi.getTotals();
      const t = res.data ?? {};
      setShipTotals({
        shipped: num(t.shippedYards ?? t.ShippedYards),
        received: num(t.receivedYards ?? t.ReceivedYards),
        pending: num(t.pendingYards ?? t.PendingYards),
      });
    } catch { /* silencioso */ }
  };

  const loadRows = async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await fabricShipmentsApi.getControlTela();
      const list = (res.data ?? []) as any[];
      setRows(list.map((r: any) => ({
        fgpoNumber: r.fgpoNumber ?? r.FGPONumber ?? '',
        color: r.color ?? r.Color ?? '',
        fabricDescription: r.fabricDescription ?? r.FabricDescription ?? '',
        shippedYards: num(r.shippedYards ?? r.ShippedYards),
        receivedYards: num(r.receivedYards ?? r.ReceivedYards),
        pendingYards: num(r.pendingYards ?? r.PendingYards),
        receivedRolls: num(r.receivedRolls ?? r.ReceivedRolls),
        status: r.status ?? r.Status ?? '',
        date: r.date ?? r.Date ?? '',
      })));
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || err?.message || 'No se pudo cargar el control de tela.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadShipTotals(); loadRows(); }, []);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); };
  const handleClearSearch = () => setSearchInput('');

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.fgpoNumber?.toLowerCase().includes(q)) ||
      (r.color?.toLowerCase().includes(q)) ||
      (r.fabricDescription?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q))
    );
  }, [rows, searchInput]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <Inventory2Icon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Control de Tela
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Entradas a bodega según las recepciones de tela registradas</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadShipTotals(); loadRows(); }}>Refresh</Button>
        </Box>
      </Box>

      <ModuleTotalsBar
        suffix="yd"
        items={[
          { label: 'Yardas en Tránsito', value: shipTotals.shipped.toLocaleString(), color: 'primary.main' },
          { label: 'Inventario Físico', value: shipTotals.received.toLocaleString(), color: 'info.main' },
          { label: 'Pendiente de registrar', value: shipTotals.pending.toLocaleString(), color: 'warning.main' },
        ]}
      />

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Buscar por FGPO, color, descripción..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment> : null } }}
            sx={{ flex: 1, maxWidth: 500 }} />
          <Button variant="outlined" type="submit">Search</Button>
        </Box>
      </Paper>

      {loadError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError('')}>{loadError}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['FGPO', 'Color', 'Descripción', 'Enviado (yd)', 'Recibido (yd)', 'Pendiente (yd)', 'Rollos', 'Estatus', 'Fecha'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">Sin registros de control de tela</Typography>
                </TableCell></TableRow>
              ) : filtered.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.fgpoNumber || '-'}</Typography></TableCell>
                  <TableCell>{r.color || '-'}</TableCell>
                  <TableCell>{r.fabricDescription || '-'}</TableCell>
                  <TableCell>{fmtNum(r.shippedYards)}</TableCell>
                  <TableCell>{fmtNum(r.receivedYards)}</TableCell>
                  <TableCell><Typography sx={{ fontWeight: 600 }}>{fmtNum(r.pendingYards)}</Typography></TableCell>
                  <TableCell>{r.receivedRolls}</TableCell>
                  <TableCell><Chip label={r.status || 'N/A'} size="small" color={statusColor(r.status ?? '')} variant="outlined" /></TableCell>
                  <TableCell>{fmtDate(r.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default FabricInventoryPage;
