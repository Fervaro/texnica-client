import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TableChartIcon from '@mui/icons-material/TableChart';
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

  const navigate = useNavigate();
  const [totals, setTotals] = useState({ received: 0, available: 0, reserved: 0, holdRejected: 0 });

  // Totales sobre TODOS los registros (GET /fabric-inventories), no solo la página actual.
  useEffect(() => {
    let active = true;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
    fabricInventoriesApi.getAll()
      .then(res => {
        const rows: any[] = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        if (!active) return;
        setTotals({
          received: rows.reduce((s, r) => s + num(r.receivedQuantity ?? r.ReceivedQuantity), 0),
          available: rows.reduce((s, r) => s + num(r.availableQuantity ?? r.AvailableQuantity), 0),
          reserved: rows.reduce((s, r) => s + num(r.reservedQuantity ?? r.ReservedQuantity), 0),
          holdRejected: rows.reduce((s, r) => s + num(r.holdQuantity ?? r.HoldQuantity) + num(r.rejectedQuantity ?? r.RejectedQuantity), 0),
        });
      })
      .catch(() => { /* indicadores opcionales: si fallan, se mantienen en 0 */ });
    return () => { active = false; };
  }, []);

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
            <Inventory2Icon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Fabric Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Inventario de tela por lote: disponible y faltante (calculado automáticamente)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Entry</Button>
        </Box>
      </Box>

      {/* Indicadores (totales de todos los registros, no solo la página actual) */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
            <Typography variant="caption" color="text.secondary">Total recibido</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.received.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'success.main' }}>
            <Typography variant="caption" color="text.secondary">Disponible</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{totals.available.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'warning.main' }}>
            <Typography variant="caption" color="text.secondary">Reservado</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.reserved.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'error.main' }}>
            <Typography variant="caption" color="text.secondary">Retenido + Rechazado</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totals.holdRejected.toLocaleString()}</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Totales agregados sobre todos los registros. Las cantidades pueden expresarse en distintas unidades según el Fabric PO.
      </Typography>

      {/* Accesos rápidos a operaciones de tela */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>Operaciones de tela</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" startIcon={<MoveToInboxIcon />} onClick={() => navigate('/fabric-receiving')}>Recepción de tela</Button>
          <Button variant="outlined" startIcon={<AllInboxIcon />} onClick={() => navigate('/roll-receiving')}>Registro de rollos</Button>
          <Button variant="outlined" startIcon={<FactCheckIcon />} onClick={() => navigate('/four-point')}>Inspección Four-Point</Button>
          <Button variant="outlined" startIcon={<ScienceIcon />} onClick={() => navigate('/internal-test')}>Internal Test</Button>
          <Button variant="outlined" startIcon={<BookmarkAddIcon />} onClick={() => navigate('/fabric-reservation')}>Reservas</Button>
          <Button variant="outlined" startIcon={<ContentCutIcon />} onClick={() => navigate('/cutting-control')}>Corte</Button>
          <Button variant="contained" startIcon={<Inventory2Icon />} onClick={() => navigate('/fabric-inventory')}>Existencias</Button>
          <Button variant="outlined" disabled startIcon={<SwapHorizIcon />}>Movimientos (pendiente)</Button>
          <Button variant="outlined" disabled startIcon={<TableChartIcon />}>Importación Excel (pendiente)</Button>
        </Box>
      </Paper>

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
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Fabric PO', 'FGPO', 'Component', 'Lot', 'Received', 'Approved', 'Rejected', 'Hold', 'Reserved', 'Issued', 'Returned', 'Available', 'Shortage', 'Status', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
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
                  <TableCell>{i.fabricPONumber || '-'}</TableCell>
                  <TableCell>{i.fgpoNumber || '-'}</TableCell>
                  <TableCell>{i.componentCode || '-'}</TableCell>
                  <TableCell>{i.lotNumber || '-'}</TableCell>
                  <TableCell>{i.receivedQuantity}</TableCell>
                  <TableCell>{i.approvedQuantity}</TableCell>
                  <TableCell>{i.rejectedQuantity}</TableCell>
                  <TableCell>{i.holdQuantity}</TableCell>
                  <TableCell>{i.reservedQuantity}</TableCell>
                  <TableCell>{i.issuedQuantity}</TableCell>
                  <TableCell>{i.returnedQuantity}</TableCell>
                  <TableCell><Typography color="success.main" sx={{ fontWeight: 600 }}>{i.availableQuantity}</Typography></TableCell>
                  <TableCell><Typography color={i.shortageQuantity > 0 ? 'error.main' : 'text.secondary'}>{i.shortageQuantity}</Typography></TableCell>
                  <TableCell><Chip label={i.inventoryStatus || 'N/A'} size="small" color={sc(i.inventoryStatus ?? '')} /></TableCell>
                  <TableCell>
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
