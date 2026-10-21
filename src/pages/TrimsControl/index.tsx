import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTrimsControls } from '../../hooks/trimsControls/useTrimsControls';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useSupplierOptions } from '../../hooks/suppliers/useSupplierOptions';
import { TrimsControl } from '../../types';
import { getCurrentUserName } from '../../utils/session';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

// Listas del Excel
const TRIM_TYPES = ['Main Label', 'Size Label', 'Care Label', 'Hangtag', 'Thread', 'Rib', 'Shoulder Tape', 'Polybag', 'Sticker', 'Carton', 'Carton Label', 'Button', 'Zipper', 'Elastic', 'Other'];
const UOM_OPTIONS = ['Pieces', 'Yards', 'Meters', 'Cones', 'Boxes', 'Cartons', 'Sets'];
const DEV_STATUS = ['Not Started', 'Development Requested', 'Sample Received', 'Under Review', 'Sent to Customer', 'Approved', 'Rejected', 'On Hold'];
const APPROVAL_STATUS = ['Pending', 'Approved', 'Approved with Comments', 'Rejected', 'On Hold'];

const sc = (s: string) => {
  const m: Record<string, any> = { Shortage: 'error', Ready: 'success', 'Partially Ready': 'warning', Pending: 'default', Approved: 'success', Rejected: 'error', 'On Hold': 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  FGPOId: 0, TrimType: 'Thread', Description: '', SupplierId: 0, Uom: 'Pieces',
  ConsumptionPerGarment: '', RequiredQty: '', OrderedQty: '', ReceivedQty: '',
  ApprovedQty: '', RejectedQty: '', ReservedQty: '', IssuedQty: '',
  Eta: '', DevelopmentStatus: 'Not Started', ApprovalStatus: 'Pending',
  DataOwner: '', Comments: '',
};

const TrimsControlPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useTrimsControls();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<TrimsControl | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: supplierList } = useSupplierOptions();
  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (t: TrimsControl) => {
    setEditingId(t.id);
    setForm({
      FGPOId: t.fgpoId, TrimType: t.trimType || 'Thread', Description: t.description ?? '', SupplierId: t.supplierId ?? 0, Uom: t.uom || 'Pieces',
      ConsumptionPerGarment: t.consumptionPerGarment?.toString() ?? '', RequiredQty: t.requiredQty?.toString() ?? '',
      OrderedQty: t.orderedQty?.toString() ?? '', ReceivedQty: t.receivedQty?.toString() ?? '', ApprovedQty: t.approvedQty?.toString() ?? '',
      RejectedQty: t.rejectedQty?.toString() ?? '', ReservedQty: t.reservedQty?.toString() ?? '', IssuedQty: t.issuedQty?.toString() ?? '',
      Eta: t.eta?.split('T')[0] || '', DevelopmentStatus: t.developmentStatus || 'Not Started',
      ApprovalStatus: t.approvalStatus || 'Pending', DataOwner: t.dataOwner ?? '', Comments: t.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este registro de avío?')) return;
    try { await remove(id); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    const negField = firstNegativeField([
      { name: 'Consumption / Garment', value: form.ConsumptionPerGarment },
      { name: 'Required Qty', value: form.RequiredQty },
      { name: 'Ordered Qty', value: form.OrderedQty },
      { name: 'Received Qty', value: form.ReceivedQty },
      { name: 'Approved Qty', value: form.ApprovedQty },
      { name: 'Rejected Qty', value: form.RejectedQty },
      { name: 'Reserved Qty', value: form.ReservedQty },
      { name: 'Issued Qty', value: form.IssuedQty },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const num = (v: string) => v === '' ? 0 : Number(v);
      const payload = {
        ...form,
        SupplierId: form.SupplierId || null,
        ConsumptionPerGarment: num(form.ConsumptionPerGarment), RequiredQty: num(form.RequiredQty),
        OrderedQty: num(form.OrderedQty), ReceivedQty: num(form.ReceivedQty), ApprovedQty: num(form.ApprovedQty),
        RejectedQty: num(form.RejectedQty), ReservedQty: num(form.ReservedQty), IssuedQty: num(form.IssuedQty),
        Eta: form.Eta ? new Date(form.Eta).toISOString() : null,
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Vistas previas de columnas calculadas (fórmula del Excel)
  const n = (s: string) => s === '' ? 0 : Number(s);
  const avail = Math.max(0, n(form.ApprovedQty) - n(form.ReservedQty) - n(form.IssuedQty));
  const short = Math.max(0, n(form.RequiredQty) - n(form.ApprovedQty));
  const status = short > 0 ? 'Shortage' : (avail >= n(form.RequiredQty) ? 'Ready' : (avail > 0 ? 'Partially Ready' : 'Pending'));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <TuneIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Trims Control
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Control de avíos: disponibles y faltantes (calculado automáticamente)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Trim</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, Trim Type, Supplier, Status..."
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
                {['FGPO', 'Trim Type', 'Description', 'Supplier', 'Required', 'Approved', 'Available', 'Shortage', 'Availability', 'Approval', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No trim records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first record</Button>
                </TableCell></TableRow>
              ) : items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.fgpoNumber}</TableCell>
                  <TableCell>{t.trimType || '-'}</TableCell>
                  <TableCell>{t.description || '-'}</TableCell>
                  <TableCell>{t.supplierName || '-'}</TableCell>
                  <TableCell>{t.requiredQty}</TableCell>
                  <TableCell>{t.approvedQty}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t.availableQty}</TableCell>
                  <TableCell><Typography color={t.shortageQty > 0 ? 'error.main' : 'text.secondary'}>{t.shortageQty}</Typography></TableCell>
                  <TableCell><Chip label={t.availabilityStatus || 'N/A'} size="small" color={sc(t.availabilityStatus ?? '')} /></TableCell>
                  <TableCell><Chip label={t.approvalStatus || '-'} size="small" color={sc(t.approvalStatus ?? '')} variant="outlined" /></TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(t); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><DeleteIcon fontSize="small" /></IconButton>
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingId ? 'Edit Trim' : 'New Trim'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">Referencias</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Trim Type</InputLabel>
                <Select value={form.TrimType} label="Trim Type" onChange={e => setF('TrimType', e.target.value)}>
                  {TRIM_TYPES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Description" value={form.Description} onChange={e => setF('Description', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Supplier</InputLabel>
                <Select value={form.SupplierId || ''} label="Supplier" onChange={e => setF('SupplierId', Number(e.target.value))}>
                  <MenuItem value=""><em>Sin proveedor</em></MenuItem>
                  {supplierList.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>UOM</InputLabel>
                <Select value={form.Uom} label="UOM" onChange={e => setF('Uom', e.target.value)}>
                  {UOM_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Consumption / Garment" type="number" value={form.ConsumptionPerGarment} onChange={e => setF('ConsumptionPerGarment', e.target.value)} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Cantidades (input)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Required Qty" type="number" value={form.RequiredQty} onChange={e => setF('RequiredQty', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Ordered Qty" type="number" value={form.OrderedQty} onChange={e => setF('OrderedQty', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Received Qty" type="number" value={form.ReceivedQty} onChange={e => setF('ReceivedQty', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Approved Qty" type="number" value={form.ApprovedQty} onChange={e => setF('ApprovedQty', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Rejected Qty" type="number" value={form.RejectedQty} onChange={e => setF('RejectedQty', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Reserved Qty" type="number" value={form.ReservedQty} onChange={e => setF('ReservedQty', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Issued Qty" type="number" value={form.IssuedQty} onChange={e => setF('IssuedQty', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Calculado automáticamente</Typography></Divider></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><TextField fullWidth size="small" label="Available Qty" value={avail} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><TextField fullWidth size="small" label="Shortage Qty" value={short} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><Chip label={`Status: ${status}`} color={sc(status)} sx={{ mt: 1 }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Estados & Dueño</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Development Status</InputLabel>
                <Select value={form.DevelopmentStatus} label="Development Status" onChange={e => setF('DevelopmentStatus', e.target.value)}>
                  {DEV_STATUS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Approval Status</InputLabel>
                <Select value={form.ApprovalStatus} label="Approval Status" onChange={e => setF('ApprovalStatus', e.target.value)}>
                  {APPROVAL_STATUS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="ETA" type="date" value={form.Eta} onChange={e => setF('Eta', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setF('Comments', e.target.value)} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>{editingId ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Trim Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Trim Type</Typography><Typography>{viewItem.trimType || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supplier / UOM</Typography><Typography>{viewItem.supplierName || '-'} / {viewItem.uom || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Required</Typography><Typography>{viewItem.requiredQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Approved</Typography><Typography>{viewItem.approvedQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Available</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.availableQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Shortage</Typography><Typography color={viewItem.shortageQty > 0 ? 'error.main' : 'text.secondary'}>{viewItem.shortageQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Availability</Typography><Chip label={viewItem.availabilityStatus || '-'} size="small" color={sc(viewItem.availabilityStatus ?? '')} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Approval</Typography><Chip label={viewItem.approvalStatus || '-'} size="small" color={sc(viewItem.approvalStatus ?? '')} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Development Status</Typography><Typography>{viewItem.developmentStatus || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">ETA / Data Owner</Typography><Typography>{fmt(viewItem.eta)} / {viewItem.dataOwner || '-'}</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrimsControlPage;
