import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFabricInventories } from '../../hooks/fabricInventories/useFabricInventories';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useLotOptions } from '../../hooks/lots/useLotOptions';
import { FabricInventory } from '../../types';
import { getCurrentUserName } from '../../utils/session';
import { fabricInventoriesApi } from '../../utils/api';

const INVENTORY_STATUS = ['Available', 'On Hold', 'Shortage', 'Closed'];

const sc = (s: string) => {
  const m: Record<string, any> = { Available: 'success', Shortage: 'error', 'On Hold': 'warning', Closed: 'default' };
  return m[s] ?? 'default';
};

const emptyForm = {
  FabricPOId: 0, FGPOId: 0, LotId: 0,
  ReceivedQuantity: '', ApprovedQuantity: '', RejectedQuantity: '', HoldQuantity: '',
  ReservedQuantity: '', IssuedQuantity: '', ReturnedQuantity: '', ShortageQuantity: '',
  WarehouseLocation: '', InventoryStatus: 'Available', DataOwnerId: 0,
  LastUpdated: '', Remarks: '',
};

const FabricInventoryPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useFabricInventories();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FabricInventory | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fabricPOList } = useFabricPOOptions();
  const { options: lotList } = useLotOptions();
  const [form, setForm] = useState(emptyForm);

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

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (i: FabricInventory) => {
    setEditingId(i.id);
    setForm({
      FabricPOId: i.fabricPOId, FGPOId: i.fgpoId, LotId: i.lotId ?? 0,
      ReceivedQuantity: i.receivedQuantity?.toString() ?? '', ApprovedQuantity: i.approvedQuantity?.toString() ?? '',
      RejectedQuantity: i.rejectedQuantity?.toString() ?? '', HoldQuantity: i.holdQuantity?.toString() ?? '',
      ReservedQuantity: i.reservedQuantity?.toString() ?? '', IssuedQuantity: i.issuedQuantity?.toString() ?? '',
      ReturnedQuantity: i.returnedQuantity?.toString() ?? '', ShortageQuantity: i.shortageQuantity?.toString() ?? '',
      WarehouseLocation: i.warehouseLocation ?? '', InventoryStatus: i.inventoryStatus || 'Available',
      DataOwnerId: i.dataOwnerId ?? 0, LastUpdated: i.lastUpdated?.split('T')[0] || '', Remarks: i.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este registro de inventario?')) return;
    try { await remove(id); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FabricPOId) { setFormError('Fabric PO is required.'); return; }
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    try {
      const num = (v: string) => v === '' ? 0 : Number(v);
      const payload = {
        ...form,
        LotId: form.LotId || null,
        DataOwnerId: form.DataOwnerId || null,
        ReceivedQuantity: num(form.ReceivedQuantity), ApprovedQuantity: num(form.ApprovedQuantity),
        RejectedQuantity: num(form.RejectedQuantity), HoldQuantity: num(form.HoldQuantity),
        ReservedQuantity: num(form.ReservedQuantity), IssuedQuantity: num(form.IssuedQuantity),
        ReturnedQuantity: num(form.ReturnedQuantity), ShortageQuantity: num(form.ShortageQuantity),
        LastUpdated: form.LastUpdated ? new Date(form.LastUpdated).toISOString() : null,
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
  };

  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Datos derivados del Fabric PO seleccionado (componente, UOM, FGPOs cubiertos)
  const selectedPo = fabricPOList.find((f: any) => f.id === form.FabricPOId) as any;
  const derivedComponent = selectedPo?.meta?.fabricComponent || '';
  const derivedUom = selectedPo?.meta?.uom || '';
  const fgpoOptions: { id: number; label: string; sub: string }[] = (selectedPo?.meta?.fgpos ?? []).map((fg: any) => ({
    id: fg.fgpoId,
    label: fg.fgpoNumber,
    sub: fg.style || fg.color || '',
  }));

  // Vistas previas de columnas calculadas (fórmula del Excel)
  const n = (s: string) => s === '' ? 0 : Number(s);
  const available = Math.max(0, n(form.ApprovedQuantity) - n(form.ReservedQuantity) - n(form.IssuedQuantity) + n(form.ReturnedQuantity));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <Inventory2Icon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Control de Tela
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Existencias y disponibilidad por lote, a partir de las recepciones y los rollos registrados</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { refresh(); loadTotals(); }}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Entry</Button>
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
          <TextField size="small" placeholder="Search by Fabric PO, FGPO, Component, Lot, Status..."
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
              <TableRow sx={{ backgroundColor: 'primary.dark' }}>
                <TableCell colSpan={4} align="center" sx={{ color: 'white', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.25)' }}>Identificación</TableCell>
                <TableCell colSpan={4} align="center" sx={{ color: 'white', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.25)' }}>Recepción y rollos</TableCell>
                <TableCell colSpan={3} align="center" sx={{ color: 'white', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.25)' }}>Movimientos</TableCell>
                <TableCell colSpan={3} align="center" sx={{ color: 'white', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.25)' }}>Disponibilidad</TableCell>
                <TableCell rowSpan={2} align="center" sx={{ color: 'white', fontWeight: 700 }}>Acciones</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Fabric PO</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>FGPO</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Component</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Lot</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Received</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Approved</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Rejected</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Hold</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Reserved</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Issued</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Returned</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Available</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Shortage</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={15} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={15} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No inventory records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first entry</Button>
                </TableCell></TableRow>
              ) : items.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{i.fabricPONumber || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{i.fgpoNumber || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{i.componentCode || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{i.lotNumber || '-'}</TableCell>
                  <TableCell align="right">{i.receivedQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{i.approvedQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{i.rejectedQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{i.holdQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{i.reservedQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{i.issuedQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">{i.returnedQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right"><Typography color="success.main" sx={{ fontWeight: 600 }}>{i.availableQuantity.toLocaleString()}</Typography></TableCell>
                  <TableCell align="right"><Typography color={i.shortageQuantity > 0 ? 'error.main' : 'text.secondary'}>{i.shortageQuantity.toLocaleString()}</Typography></TableCell>
                  <TableCell align="center"><Chip label={i.inventoryStatus || 'N/A'} size="small" color={sc(i.inventoryStatus ?? '')} /></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(i); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(i)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(i.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingId ? 'Edit Entry' : 'New Entry'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">Referencias</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO *</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO *" onChange={e => { setF('FabricPOId', Number(e.target.value)); setF('FGPOId', 0); }}>
                  <MenuItem value=""><em>Select a Fabric PO...</em></MenuItem>
                  {fabricPOList.map((f: any) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))} disabled={!form.FabricPOId}>
                  <MenuItem value=""><em>{form.FabricPOId ? 'Select a FGPO...' : 'Select a Fabric PO first'}</em></MenuItem>
                  {fgpoOptions.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Lot</InputLabel>
                <Select value={form.LotId || ''} label="Lot" onChange={e => setF('LotId', Number(e.target.value))}>
                  <MenuItem value=""><em>No lot</em></MenuItem>
                  {lotList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Component (del Fabric PO)" value={derivedComponent} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="UOM (del Fabric PO)" value={derivedUom} slotProps={{ input: { readOnly: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Cantidades (input)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Received" type="number" value={form.ReceivedQuantity} onChange={e => setF('ReceivedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Approved" type="number" value={form.ApprovedQuantity} onChange={e => setF('ApprovedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Rejected" type="number" value={form.RejectedQuantity} onChange={e => setF('RejectedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Hold" type="number" value={form.HoldQuantity} onChange={e => setF('HoldQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Reserved" type="number" value={form.ReservedQuantity} onChange={e => setF('ReservedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Issued" type="number" value={form.IssuedQuantity} onChange={e => setF('IssuedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Returned" type="number" value={form.ReturnedQuantity} onChange={e => setF('ReturnedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Shortage" type="number" value={form.ShortageQuantity} onChange={e => setF('ShortageQuantity', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Calculado automáticamente</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Available Qty" value={available} slotProps={{ input: { readOnly: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Ubicación & Estado</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Warehouse Location" value={form.WarehouseLocation} onChange={e => setF('WarehouseLocation', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inventory Status</InputLabel>
                <Select value={form.InventoryStatus} label="Inventory Status" onChange={e => setF('InventoryStatus', e.target.value)}>
                  {INVENTORY_STATUS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Last Updated" type="date" value={form.LastUpdated} onChange={e => setF('LastUpdated', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Remarks" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>{editingId ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Entry Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Component / Lot / UOM</Typography><Typography>{viewItem.componentCode || '-'} / {viewItem.lotNumber || '-'} / {viewItem.uom || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Received</Typography><Typography>{viewItem.receivedQuantity}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Approved</Typography><Typography>{viewItem.approvedQuantity}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Rejected</Typography><Typography>{viewItem.rejectedQuantity}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Hold</Typography><Typography>{viewItem.holdQuantity}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Reserved / Issued / Returned</Typography><Typography>{viewItem.reservedQuantity} / {viewItem.issuedQuantity} / {viewItem.returnedQuantity}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Available Qty</Typography><Typography color="success.main" sx={{ fontWeight: 600 }}>{viewItem.availableQuantity}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shortage</Typography><Typography color={viewItem.shortageQuantity > 0 ? 'error.main' : 'text.secondary'}>{viewItem.shortageQuantity}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inventory Status</Typography><Chip label={viewItem.inventoryStatus || '-'} size="small" color={sc(viewItem.inventoryStatus ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Warehouse / Data Owner</Typography><Typography>{viewItem.warehouseLocation || '-'} / {viewItem.dataOwnerName || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default FabricInventoryPage;
