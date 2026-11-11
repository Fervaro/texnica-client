import React, { useState, FormEvent, useContext } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePackingControls } from '../../hooks/packingControls/usePackingControls';
import { usePackingFieldConfigs } from '../../hooks/packingControls/usePackingFieldConfigs';
import PackingBulkGrid from '../../components/PackingBulkGrid';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { visiblePackingFields } from '../../utils/packingFields';
import { packingControlsApi } from '../../utils/api';
import { PackingControl, PackingMixOptions } from '../../types';
import { AuthContext } from '../../context/AuthContext';

const emptyForm = {
  PackingDate: new Date().toISOString().split('T')[0],
  FGPOId: 0,
  BoxTypeId: 0,
  QcPassedQty: 0, ReceivedByPackingQty: 0, FoldedQty: 0, PolybaggedQty: 0, PendingPacking: 0, PackedQty: 0,
  PcsPerCarton: 0, Cajas: 0,
  ResponsiblePersonId: 0, Remarks: '',
};

// FieldNo (1..4) → propiedad del formulario (PascalCase) y del item (camelCase).
const FIELD_FORM_KEY: Record<number, keyof typeof emptyForm> = {
  1: 'QcPassedQty', 2: 'ReceivedByPackingQty', 3: 'FoldedQty', 4: 'PolybaggedQty',
};
const FIELD_ITEM_KEY: Record<number, keyof PackingControl> = {
  1: 'qcPassedQty', 2: 'receivedByPackingQty', 3: 'foldedQty', 4: 'polybaggedQty',
};

const PackingControlPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = usePackingControls();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<PackingControl | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { configs: fieldConfigs } = usePackingFieldConfigs();
  const visibleFields = visiblePackingFields(fieldConfigs);

  // ── Estado del diálogo de Mix ──────────────────────────────
  const [mixOpen, setMixOpen] = useState(false);
  const [mixFgpoId, setMixFgpoId] = useState(0);
  const [mixFgpoList, setMixFgpoList] = useState<{ id: number; label: string }[]>([]);
  const [mixOptions, setMixOptions] = useState<PackingMixOptions | null>(null);
  const [mixQuantities, setMixQuantities] = useState<Record<string, string>>({});
  const [mixDate, setMixDate] = useState(new Date().toISOString().split('T')[0]);
  const [mixResponsibleId, setMixResponsibleId] = useState(0);
  const [mixRemarks, setMixRemarks] = useState('');
  const [mixError, setMixError] = useState('');
  const [mixSaving, setMixSaving] = useState(false);
  const [mixLoading, setMixLoading] = useState(false);
  const [mixCapacityManual, setMixCapacityManual] = useState('');

  const { selectedCustomer } = useContext(AuthContext);
  const isVolcano = (selectedCustomer?.name ?? '').trim().toLowerCase() === 'volcano';

  const openMix = () => {
    setMixOpen(true);
    setMixFgpoId(0);
    setMixOptions(null);
    setMixQuantities({});
    setMixDate(new Date().toISOString().split('T')[0]);
    setMixResponsibleId(0);
    setMixRemarks('');
    setMixError('');
    setMixCapacityManual('');
    loadMixFgpos();
  };

  const loadMixFgpos = async () => {
    try {
      const res = await packingControlsApi.getFgpos();
      setMixFgpoList((res.data ?? []).map((f: any) => ({
        id: f.fgpoId ?? f.FgpoId ?? 0,
        label: f.fgpoNumber ?? f.FgpoNumber ?? '',
      })));
    } catch { setMixFgpoList([]); }
  };

  const loadMixOptions = async (fgpoId: number) => {
    setMixError('');
    setMixQuantities({});
    if (!fgpoId) { setMixOptions(null); return; }
    setMixLoading(true);
    try {
      const res = await packingControlsApi.getMixOptions(fgpoId);
      setMixOptions(res.data ?? res);
    } catch (err: any) {
      setMixOptions(null);
      setMixError(err?.response?.data?.message || err?.message || 'Could not load Mix options.');
    } finally {
      setMixLoading(false);
    }
  };

  const mixTotal = (mixOptions?.sizes ?? []).reduce(
    (sum, s) => sum + (Number(mixQuantities[s.size ?? ''] ?? '') || 0), 0);
  // Para Volcano la capacidad la digita el usuario; para el resto es la automática (máximo).
  const mixCapacity = isVolcano ? (Number(mixCapacityManual) || 0) : (mixOptions?.pcsPerCarton ?? 0);

  const autoFillMix = () => {
    if (!mixOptions || mixCapacity <= 0) return;
    const next: Record<string, string> = {};
    let remaining = mixCapacity;
    for (const s of mixOptions.sizes) {
      const key = s.size ?? '';
      const take = Math.min(remaining, s.pendingPacking);
      if (take > 0) next[key] = String(take);
      remaining -= take;
      if (remaining <= 0) break;
    }
    setMixQuantities(next);
  };

  const submitMix = async () => {
    setMixError('');
    if (!mixFgpoId) { setMixError('Select an FGPO.'); return; }
    if (isVolcano && mixCapacity <= 0) { setMixError('Enter the box capacity (pcs).'); return; }
    const lines = (mixOptions?.sizes ?? [])
      .map(s => ({ size: s.size ?? '', quantity: Number(mixQuantities[s.size ?? ''] ?? '') || 0 }))
      .filter(l => l.quantity > 0);
    if (lines.length === 0) { setMixError('Enter at least one quantity (or use Auto-fill).'); return; }
    if (mixTotal > mixCapacity) { setMixError(`Total (${mixTotal}) exceeds the box capacity (${mixCapacity}).`); return; }
    setMixSaving(true);
    try {
      await packingControlsApi.createMix({
        packingDate: mixDate ? new Date(mixDate).toISOString() : new Date().toISOString(),
        fgpoId: mixFgpoId,
        responsiblePersonId: mixResponsibleId || null,
        remarks: mixRemarks || null,
        pcsPerCarton: isVolcano ? mixCapacity : null,
        lines,
      });
      setMixOpen(false);
      await refresh();
    } catch (err: any) {
      setMixError(err?.response?.data?.message || err?.message || 'Error creating Mix.');
    } finally {
      setMixSaving(false);
    }
  };

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const openCreate = () => { setBulkOpen(true); };
  const openEdit = (item: PackingControl) => {
    setEditingId(item.id);
    setForm({
      PackingDate: item.packingDate?.split('T')[0] || '',
      FGPOId: item.fgpoId,
      BoxTypeId: item.boxTypeId ?? 0,
      QcPassedQty: item.qcPassedQty, ReceivedByPackingQty: item.receivedByPackingQty,
      FoldedQty: item.foldedQty, PolybaggedQty: item.polybaggedQty, PendingPacking: item.pendingPacking, PackedQty: item.packedQty,
      PcsPerCarton: item.pcsPerCarton,
      Cajas: item.pcsPerCarton > 0 ? item.packedQty / item.pcsPerCarton : 0,
      ResponsiblePersonId: userList.find(o => o.label === item.responsiblePersonName)?.id ?? 0,
      Remarks: item.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this packing record?')) return;
    try {
      const item = items.find(i => i.id === id);
      if (item?.isMix) await packingControlsApi.deleteMix(id);
      else await remove(id);
      await refresh();
    }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    if (form.PackedQty < 0 || form.QcPassedQty < 0 || form.PendingPacking < 0) { setFormError('Quantities cannot be negative.'); return; }
    if (!form.PcsPerCarton || Number(form.PcsPerCarton) <= 0) { setFormError('Pcs per Carton must be greater than 0.'); return; }
    try {
      const payload = {
        ...form,
        BoxTypeId: form.BoxTypeId || null,
        ResponsiblePersonId: form.ResponsiblePersonId || null,
        PackingDate: form.PackingDate ? new Date(form.PackingDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const num = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Vistas previas de las columnas calculadas (igual que el Excel)
  const readyToShip = form.PackedQty;
  const packingVariance = form.PackedQty - form.QcPassedQty;
  const pendingPacking = Number(form.PendingPacking) || 0;
  const overpackedQty = Math.max(0, form.PackedQty - form.QcPassedQty);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Packing Control
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Control de empaque — doblado, polibolsado, cartones y listo para embarque
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openMix}>Create Mix</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Record</Button>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small" placeholder="Search by FGPO, Style, Color, Remarks..."
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
                {['Date', 'FGPO', 'Style / Color', 'Size', ...visibleFields.map(f => f.label), 'Packed', 'Cartons', 'Pcs/Carton', 'Ready', 'Variance', 'Pending', 'Overpacked', 'Responsible', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13 + visibleFields.length} align="center"><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={13 + visibleFields.length} align="center" sx={{ color: 'text.secondary', py: 4 }}>No records found.</TableCell></TableRow>
              ) : items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.packingDate)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.style || '-'} / {item.color || '-'}</TableCell>
                  <TableCell>
                    {item.isMix ? (
                      <Chip size="small" color="secondary" variant="outlined"
                        label={(item.mixLines ?? []).map(l => `${l.size ?? '?'} ${l.quantity}`).join(' · ') || 'Mix'} />
                    ) : (item.size || '-')}
                  </TableCell>
                  {visibleFields.map(f => (
                    <TableCell key={f.fieldNo}>{num(item[FIELD_ITEM_KEY[f.fieldNo]] as number)}</TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 600 }}>{num(item.packedQty)}</TableCell>
                  <TableCell>{item.fullCartons} + {item.partialCartons}</TableCell>
                  <TableCell>{item.pcsPerCarton}</TableCell>
                  <TableCell>{num(item.readyToShipQty)}</TableCell>
                  <TableCell>{num(item.packingVariance)}</TableCell>
                  <TableCell>{num(item.pendingPacking)}</TableCell>
                  <TableCell>{num(item.overpackedQty)}</TableCell>
                  <TableCell>{item.responsiblePersonName || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(item); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    {!item.isMix && (
                      <IconButton size="small" color="info" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    )}
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
        <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Packing Record' : 'New Packing Record'}</DialogTitle>
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
              <TextField fullWidth size="small" label="Packing Date *" type="date" value={form.PackingDate} onChange={e => setF('PackingDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth size="small" label="Boxes *" type="number"
                value={form.Cajas || ''}
                onChange={e => {
                  const cajas = Number(e.target.value);
                  setForm(prev => ({ ...prev, Cajas: cajas, PackedQty: cajas * Number(prev.PcsPerCarton) }));
                }}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Grid>
            {visibleFields.map(f => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.fieldNo}>
                <TextField fullWidth size="small" label={f.label} type="number" value={form[FIELD_FORM_KEY[f.fieldNo]]} onChange={e => setF(FIELD_FORM_KEY[f.fieldNo], Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Pending Packing" type="number" value={form.PendingPacking} onChange={e => setF('PendingPacking', Number(e.target.value))} slotProps={{ htmlInput: { min: 0 } }} helperText="Pieces not yet packed (do not complete a box)" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Packed Qty" type="number" value={form.PackedQty} disabled helperText="Auto: Qty/Box × boxes" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Pcs per Carton *" type="number" value={form.PcsPerCarton} disabled helperText="Auto: Qty/Box" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Responsible Person</InputLabel>
                <Select value={form.ResponsiblePersonId || ''} label="Responsible Person" onChange={e => setF('ResponsiblePersonId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Remarks" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} />
            </Grid>

            {/* Previa de columnas calculadas */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip label={`Ready to Ship: ${num(readyToShip)}`} size="small" color="success" variant="outlined" />
                <Chip label={`Variance: ${num(packingVariance)}`} size="small" color={packingVariance >= 0 ? 'info' : 'error'} variant="outlined" />
                <Chip label={`Pending Packing: ${num(pendingPacking)}`} size="small" color={pendingPacking > 0 ? 'warning' : 'default'} variant="outlined" />
                <Chip label={`Overpacked: ${num(overpackedQty)}`} size="small" color={overpackedQty > 0 ? 'warning' : 'default'} variant="outlined" />
              </Box>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Packing Record</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.packingDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color / Size</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'} / {viewItem.size || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Responsible</Typography><Typography>{viewItem.responsiblePersonName || '-'}</Typography></Grid>
              {visibleFields.map(f => (
                <Grid size={{ xs: 6, sm: 3 }} key={f.fieldNo}><Typography variant="caption" color="text.secondary">{f.label}</Typography><Typography>{num(viewItem[FIELD_ITEM_KEY[f.fieldNo]] as number)}</Typography></Grid>
              ))}
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Packed</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.packedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Cartons</Typography><Typography>{viewItem.fullCartons} + {viewItem.partialCartons} ({viewItem.pcsPerCarton} pcs)</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Ready to Ship</Typography><Typography sx={{ fontWeight: 600, color: 'success.main' }}>{num(viewItem.readyToShipQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Variance</Typography><Typography>{num(viewItem.packingVariance)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Pending</Typography><Typography>{num(viewItem.pendingPacking)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Overpacked</Typography><Typography>{num(viewItem.overpackedQty)}</Typography></Grid>
              {viewItem.isMix && (viewItem.mixLines ?? []).length > 0 && (
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Mix breakdown</Typography><Typography>{(viewItem.mixLines ?? []).map(l => `${l.size ?? '?'}: ${l.quantity}`).join(' · ')}</Typography></Grid>
              )}
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* ── Dialog Crear Mix ── */}
      <Dialog open={mixOpen} onClose={() => setMixOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Mix Box</DialogTitle>
        <DialogContent>
          {mixError && <Alert severity="error" sx={{ mb: 2 }}>{mixError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={mixFgpoId || ''} label="FGPO *"
                  onChange={e => { const id = Number(e.target.value); setMixFgpoId(id); loadMixOptions(id); }}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {mixFgpoList.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Packing Date" type="date" value={mixDate} onChange={e => setMixDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {isVolcano ? (
                <TextField fullWidth size="small" label="Box capacity (pcs) *" type="number"
                  value={mixCapacityManual}
                  onChange={e => setMixCapacityManual(e.target.value)}
                  slotProps={{ htmlInput: { min: 1 } }}
                  helperText="Enter pieces per box manually" />
              ) : (
                <TextField fullWidth size="small" label="Box capacity (pcs)" value={mixCapacity || ''} disabled helperText="Highest Qty per box of this FGPO" />
              )}
            </Grid>

            {mixLoading ? (
              <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption" color="text.secondary">Loading sizes...</Typography></Box></Grid>
            ) : mixOptions && mixOptions.sizes.length === 0 ? (
              <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary">No sizes with pending pieces for this FGPO.</Typography></Grid>
            ) : mixOptions && mixOptions.sizes.length > 0 ? (
              <>
                <Grid size={{ xs: 12 }}>
                  <Divider><Typography variant="caption" color="text.secondary">Pieces per size</Typography></Divider>
                </Grid>
                {mixOptions.sizes.map(s => {
                  const key = s.size ?? '';
                  return (
                    <Grid size={{ xs: 6 }} key={key}>
                      <TextField fullWidth size="small" type="number"
                        label={`${key} — pending ${s.pendingPacking}`}
                        value={mixQuantities[key] ?? ''}
                        onChange={e => setMixQuantities(prev => ({ ...prev, [key]: e.target.value }))}
                        slotProps={{ htmlInput: { min: 0, max: s.pendingPacking } }} />
                    </Grid>
                  );
                })}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={autoFillMix}>Auto-fill</Button>
                    <Chip label={`Total: ${mixTotal} / ${mixCapacity}`} size="small"
                      color={mixTotal > mixCapacity ? 'error' : mixTotal === mixCapacity ? 'success' : 'default'} variant="outlined" />
                  </Box>
                </Grid>
              </>
            ) : null}

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Responsible Person</InputLabel>
                <Select value={mixResponsibleId || ''} label="Responsible Person" onChange={e => setMixResponsibleId(Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Remarks" value={mixRemarks} onChange={e => setMixRemarks(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMixOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitMix} disabled={mixSaving || !mixOptions || mixOptions.sizes.length === 0}>
            {mixSaving ? 'Creating...' : 'Create Mix'}
          </Button>
        </DialogActions>
      </Dialog>

      <PackingBulkGrid
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="New packing record"
        fgpoOptions={fgpoList.map((f: any) => ({ id: f.id, label: f.label, style: f.meta?.style, color: f.meta?.color }))}
        userOptions={userList}
        fieldConfigs={fieldConfigs}
        onSaved={async () => { setBulkOpen(false); refresh(); }}
      />
    </Box>
  );
};

export default PackingControlPage;
