import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert,
  IconButton, InputAdornment, TablePagination, Grid
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFabricReceivings } from '../../hooks/fabricReceivings/useFabricReceivings';
import { FabricReceiving } from '../../types';
import { fabricInventoriesApi } from '../../utils/api';

const sc = (s: string) => {
  const m: Record<string, any> = {
    'Fully Received': 'success', 'Partially Received': 'warning',
    Pending: 'default', 'Quantity Difference': 'error', Rejected: 'error',
  };
  return m[s] ?? 'default';
};

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('es-MX') : '-');

const FabricInventoryPage: React.FC = () => {
  const {
    items, loading, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
  } = useFabricReceivings();

  const [searchInput, setSearchInput] = useState('');

  const [totals, setTotals] = useState({ received: 0, physical: 0, pendingTransit: 0, totalControlled: 0, available: 0, reserved: 0, damaged: 0, rolls: 0 });
  const [totalsError, setTotalsError] = useState('');

  // Totales consolidados desde el backend (rollos + movimientos + reservas + lotes),
  // no desde la tabla manual de FabricInventory.
  const loadTotals = async () => {
    setTotalsError('');
    try {
      const res = await fabricInventoriesApi.getTotals();
      const t = res.data ?? {};
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
      setTotals({
        received: num(t.receivedYards ?? t.ReceivedYards),
        physical: num(t.physicalYards ?? t.PhysicalYards),
        pendingTransit: num(t.pendingTransitYards ?? t.PendingTransitYards),
        totalControlled: num(t.totalControlledYards ?? t.TotalControlledYards),
        available: num(t.availableYards ?? t.AvailableYards),
        reserved: num(t.reservedYards ?? t.ReservedYards),
        damaged: num(t.damagedYards ?? t.DamagedYards),
        rolls: num(t.rollsCount ?? t.RollsCount),
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = typeof err?.response?.data === 'string' ? err.response.data : (err?.response?.data?.message);
      setTotalsError(
        (status ? `Error ${status} al cargar los totales` : 'No se pudieron cargar los totales')
        + (detail ? `: ${detail}` : '')
      );
    }
  };

  useEffect(() => { loadTotals(); }, []);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

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
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { refresh(); loadTotals(); }}>Refresh</Button>
        </Box>
      </Box>

      {/* Resumen global de tela (totales consolidados desde el backend) */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Resumen global de tela</Typography>
      {totalsError && <Alert severity="warning" sx={{ mb: 1 }}>{totalsError}</Alert>}
      <Grid container spacing={1.5} sx={{ mb: 1 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: 'primary.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Total recibido (histórico)</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{totals.received.toLocaleString()} yd</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: 'info.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Existencia física</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'info.main' }}>{totals.physical.toLocaleString()} yd</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: 'warning.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Tránsito pendiente</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{totals.pendingTransit.toLocaleString()} yd</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: 'primary.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Total controlado</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{totals.totalControlled.toLocaleString()} yd</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: 'warning.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Reservado</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{totals.reserved.toLocaleString()} yd</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: 'success.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Disponible</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'success.main' }}>{totals.available.toLocaleString()} yd</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Existencia física = metraje de rollos + entradas − salidas. Tránsito pendiente = enviado − registrado físicamente (por lote). Total controlado = existencia física + tránsito. Disponible = existencia física − reservas activas. La cantidad enviada, la declarada en recepción y el metraje de los rollos pueden diferir sin que el cálculo esté equivocado.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Receiving #, Shipment, Fabric PO, FGPO, Status..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment> : null } }}
            sx={{ flex: 1, maxWidth: 500 }} />
          <Button variant="outlined" type="submit">Search</Button>
        </Box>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Shipment', 'FGPO', 'Supplier', 'Customer', 'Recibido', 'Status', 'Fecha'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No receiving records found</Typography>
                </TableCell></TableRow>
              ) : items.map((item: FabricReceiving) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.shipmentNumber || '-'}</TableCell>
                  <TableCell>{item.fgpoNumber || '-'}</TableCell>
                  <TableCell>{item.supplier || '-'}</TableCell>
                  <TableCell>{item.customerName || '-'}</TableCell>
                  <TableCell align="right">{Number(item.actualReceivedQty).toLocaleString()}</TableCell>
                  <TableCell><Chip label={item.receivingStatus || 'N/A'} size="small" color={sc(item.receivingStatus ?? '')} variant="outlined" /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(item.receivingDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={totalCount} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Rows:" />
      </Paper>

    </Box>
  );
};

export default FabricInventoryPage;
