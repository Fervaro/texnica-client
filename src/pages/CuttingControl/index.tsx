import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCuttingControls } from '../../hooks/cuttingControls/useCuttingControls';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { CuttingControl } from '../../types';

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'On Hold'];

const sc = (s: string) => {
  const m: Record<string, any> = { Approved: 'success', Rejected: 'error', 'On Hold': 'warning', Pending: 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  CutDate: new Date().toISOString().split('T')[0],
  FGPOId: 0, SizeId: 0, FabricLot: '', MarkerNumber: '',
  PlannedCut: 0, ActualCut: 0, GoodCut: 0, DamagedQty: 0, ReplacementCut: 0, SentToSewing: 0,
  ReleaseStatus: 'Pending', ResponsiblePersonId: 0, Comments: '',
};

const CuttingControlPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useCuttingControls();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<CuttingControl | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: sizeList } = useSizeOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: CuttingControl) => {
    setEditingId(item.id);
    setForm({
      CutDate: item.cutDate?.split('T')[0] || '',
      FGPOId: item.fgpoId, SizeId: sizeList.find(o => o.label === item.sizeName)?.id ?? 0, FabricLot: item.fabricLot ?? '',
      MarkerNumber: item.markerNumber ?? '',
      PlannedCut: item.plannedCut, ActualCut: item.actualCut, GoodCut: item.goodCut,
      DamagedQty: item.damagedQty, ReplacementCut: item.replacementCut, SentToSewing: item.sentToSewing,
      ReleaseStatus: item.releaseStatus || 'Pending', ResponsiblePersonId: userList.find(o => o.label === item.responsiblePersonName)?.id ?? 0,
      Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this cut record?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    try {
      const payload = {
        ...form,
        SizeId: form.SizeId || null,
        ResponsiblePersonId: form.ResponsiblePersonId || null,
        CutDate: form.CutDate ? new Date(form.CutDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Vistas previas de las columnas calculadas (igual que el Excel)
  const variance = form.GoodCut - form.PlannedCut;
  const pending = Math.max(0, form.PlannedCut - form.GoodCut);
  const overcut = Math.max(0, form.GoodCut - form.PlannedCut);
  const cutToSew = form.GoodCut - form.SentToSewing;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <ContentCutIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Cutting Control
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cut control — planned vs actual, damaged, replacement and send to sewing
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Cut Record</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, Fabric Lot, Marker, Status..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment> : null,
              },
            }}
            sx={{ flex: 1, maxWidth: 500 }}
          />
          <Button variant="outlined" type="submit">Search</Button>
        </Box>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Date', 'FGPO', 'Style', 'Color', 'Size', 'Planned', 'Actual', 'Good', 'Damaged', 'To Sewing', 'Variance', 'Pending', 'Status', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={14} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={14} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No cut records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first record</Button>
                </TableCell></TableRow>
              ) : items.map((item: CuttingControl) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.cutDate)}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.style || '-'}</TableCell>
                  <TableCell>{item.color || '-'}</TableCell>
                  <TableCell>{item.sizeName || '-'}</TableCell>
                  <TableCell>{item.plannedCut}</TableCell>
                  <TableCell>{item.actualCut}</TableCell>
                  <TableCell>{item.goodCut}</TableCell>
                  <TableCell>{item.damagedQty}</TableCell>
                  <TableCell>{item.sentToSewing}</TableCell>
                  <TableCell><Typography color={item.cuttingVariance < 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 600 }}>{item.cuttingVariance}</Typography></TableCell>
                  <TableCell><Typography color={item.pendingCut > 0 ? 'warning.main' : 'text.secondary'}>{item.pendingCut}</Typography></TableCell>
                  <TableCell><Chip label={item.releaseStatus || 'N/A'} size="small" color={sc(item.releaseStatus ?? '')} /></TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(item); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
          {editingId ? 'Edit Cut Record' : 'New Cut Record'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Date *" type="date" value={form.CutDate} onChange={e => setF('CutDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Size</InputLabel>
                <Select value={form.SizeId || ''} label="Size" onChange={e => setF('SizeId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a Size...</em></MenuItem>
                  {sizeList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Fabric Lot" value={form.FabricLot} onChange={e => setF('FabricLot', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Marker Number" value={form.MarkerNumber} onChange={e => setF('MarkerNumber', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Quantities (input)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Planned Cut" type="number" value={form.PlannedCut || ''} onChange={e => setF('PlannedCut', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Actual Cut" type="number" value={form.ActualCut || ''} onChange={e => setF('ActualCut', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Good Cut" type="number" value={form.GoodCut || ''} onChange={e => setF('GoodCut', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Damaged Qty" type="number" value={form.DamagedQty || ''} onChange={e => setF('DamagedQty', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Replacement Cut" type="number" value={form.ReplacementCut || ''} onChange={e => setF('ReplacementCut', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Sent to Sewing" type="number" value={form.SentToSewing || ''} onChange={e => setF('SentToSewing', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Calculated automatically</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Cutting Variance" value={variance} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Pending Cut" value={pending} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Overcut Qty" value={overcut} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Cut-to-Sew Diff" value={cutToSew} slotProps={{ input: { readOnly: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Status & Responsible</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Release Status</InputLabel>
                <Select value={form.ReleaseStatus} label="Release Status" onChange={e => setF('ReleaseStatus', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
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
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setF('Comments', e.target.value)} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cut Record Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.cutDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Size / Fabric Lot / Marker</Typography><Typography>{viewItem.sizeName || '-'} / {viewItem.fabricLot || '-'} / {viewItem.markerNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Planned Cut</Typography><Typography>{viewItem.plannedCut}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Actual Cut</Typography><Typography>{viewItem.actualCut}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Good Cut</Typography><Typography>{viewItem.goodCut}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Damaged / Replacement</Typography><Typography>{viewItem.damagedQty} / {viewItem.replacementCut}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Sent to Sewing</Typography><Typography>{viewItem.sentToSewing}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Cutting Variance</Typography><Typography color={viewItem.cuttingVariance < 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 600 }}>{viewItem.cuttingVariance}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Pending Cut</Typography><Typography color={viewItem.pendingCut > 0 ? 'warning.main' : 'text.secondary'}>{viewItem.pendingCut}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Overcut Qty</Typography><Typography>{viewItem.overcutQty}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Cut-to-Sew Diff</Typography><Typography>{viewItem.cutToSewDifference}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Release Status</Typography><Chip label={viewItem.releaseStatus || '-'} size="small" color={sc(viewItem.releaseStatus ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Responsible</Typography><Typography>{viewItem.responsiblePersonName || '-'}</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default CuttingControlPage;
