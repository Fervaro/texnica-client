import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFinishedGoods } from '../../hooks/finishedGoods/useFinishedGoods';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { FinishedGood } from '../../types';
import { getCurrentUserName } from '../../utils/session';

const STATUS_OPTIONS = ['Pending', 'Received', 'Reserved', 'Ready to Ship', 'Partially Shipped', 'Shipped', 'On Hold', 'Cancelled'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    Shipped: 'success', 'Partially Shipped': 'info', 'Ready to Ship': 'success',
    Received: 'info', Reserved: 'primary', Pending: 'warning', 'On Hold': 'warning', Cancelled: 'error',
  };
  return m[s] ?? 'default';
};

const emptyForm = {
  ReceiptDate: new Date().toISOString().split('T')[0],
  FGPOId: 0,
  PackedQty: 0, WarehouseReceived: 0, ReservedForShipment: 0, LoadedQty: 0, ShippedQty: 0,
  WarehouseLocation: '', Status: 'Pending', DataOwnerId: 0, Remarks: '',
};

const FinishedGoodsPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useFinishedGoods();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FinishedGood | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: FinishedGood) => {
    setEditingId(item.id);
    setForm({
      ReceiptDate: item.receiptDate?.split('T')[0] || '',
      FGPOId: item.fgpoId,
      PackedQty: item.packedQty, WarehouseReceived: item.warehouseReceived,
      ReservedForShipment: item.reservedForShipment, LoadedQty: item.loadedQty, ShippedQty: item.shippedQty,
      WarehouseLocation: item.warehouseLocation ?? '', Status: item.status || 'Pending',
      DataOwnerId: userList.find(o => o.label === item.dataOwnerName)?.id ?? 0,
      Remarks: item.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this finished goods record?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    if (form.WarehouseReceived < 0 || form.LoadedQty < 0 || form.ShippedQty < 0) { setFormError('Quantities cannot be negative.'); return; }
    try {
      const payload = {
        ...form,
        DataOwnerId: form.DataOwnerId || null,
        ReceiptDate: form.ReceiptDate ? new Date(form.ReceiptDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const num = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Ready to Ship y Warehouse Balance ya no se previsualizan aquí: el backend
  // los calcula a partir de Shipment Control y los devuelve en el DTO.

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Finished Goods
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Mercancía terminada en almacén — recibida, reservada, lista y embarcada
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Record</Button>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small" placeholder="Search by FGPO, Style, Color, Location, Status..."
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
          sx={{ flex: 1, maxWidth: 480 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
        />
        <Button type="submit" variant="contained" color="primary">Search</Button>
        <Button variant="outlined" color="inherit" onClick={handleClearSearch}><ClearIcon /></Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                {['Receipt Date', 'FGPO', 'Style / Color', 'Size', 'Packed', 'Received', 'Reserved', 'Loaded', 'Shipped', 'Ready', 'Balance', 'Location', 'Status', 'Data Owner', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={15} align="center"><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={15} align="center" sx={{ color: 'text.secondary', py: 4 }}>No records found.</TableCell></TableRow>
              ) : items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.receiptDate)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.style || '-'} / {item.color || '-'}</TableCell>
                  <TableCell>{item.size || '-'}</TableCell>
                  <TableCell>{num(item.packedQty)}</TableCell>
                  <TableCell>{num(item.warehouseReceived)}</TableCell>
                  <TableCell>{num(item.reservedForShipment)}</TableCell>
                  <TableCell>{num(item.loadedQty)}</TableCell>
                  <TableCell>{num(item.shippedQty)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{num(item.readyToShipQty)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{num(item.warehouseBalance)}</TableCell>
                  <TableCell>{item.warehouseLocation || '-'}</TableCell>
                  <TableCell><Chip label={item.status || 'N/A'} size="small" color={sc(item.status ?? '')} /></TableCell>
                  <TableCell>{item.dataOwnerName || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(item); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={totalCount} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Paper>

      {/* ── Dialog Nuevo/Editar ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Finished Goods' : 'New Finished Goods'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Receipt Date *" type="date" value={form.ReceiptDate} onChange={e => setF('ReceiptDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Packed Qty" type="number" value={form.PackedQty} onChange={e => setF('PackedQty', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Warehouse Received" type="number" value={form.WarehouseReceived} onChange={e => setF('WarehouseReceived', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Reserved for Shipment" type="number" value={form.ReservedForShipment} onChange={e => setF('ReservedForShipment', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Loaded Qty" type="number" value={form.LoadedQty} onChange={e => setF('LoadedQty', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Shipped Qty" type="number" value={form.ShippedQty} onChange={e => setF('ShippedQty', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Warehouse Location" value={form.WarehouseLocation} onChange={e => setF('WarehouseLocation', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.Status} label="Status" onChange={e => setF('Status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Remarks" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} />
            </Grid>

            {/* Ready to Ship y Warehouse Balance se calculan en el backend a partir de Shipment Control. */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Alert severity="info" variant="outlined">
                Ready to Ship y Warehouse Balance se calculan automáticamente a partir de los embarques (Shipment Control).
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Ver ── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Finished Goods Record</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Receipt Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.receiptDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color / Size</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'} / {viewItem.size || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.status || '-'} size="small" color={sc(viewItem.status ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Packed</Typography><Typography>{num(viewItem.packedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Received</Typography><Typography>{num(viewItem.warehouseReceived)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Reserved</Typography><Typography>{num(viewItem.reservedForShipment)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Loaded</Typography><Typography>{num(viewItem.loadedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shipped</Typography><Typography>{num(viewItem.shippedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Ready to Ship</Typography><Typography sx={{ fontWeight: 600, color: 'success.main' }}>{num(viewItem.readyToShipQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Balance</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.warehouseBalance)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Location</Typography><Typography>{viewItem.warehouseLocation || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Data Owner</Typography><Typography>{viewItem.dataOwnerName || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinishedGoodsPage;
