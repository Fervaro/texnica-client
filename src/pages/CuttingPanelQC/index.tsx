import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import CribIcon from '@mui/icons-material/Crib';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCuttingPanelQcs } from '../../hooks/cuttingPanelQcs/useCuttingPanelQcs';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { CuttingPanelQc } from '../../types';

const sc = (s: string) => {
  const m: Record<string, any> = { Passed: 'success', Failed: 'error', Pending: 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  InspectionDate: new Date().toISOString().split('T')[0],
  FGPOId: 0, SizeId: 0, FabricLot: '', CutLotLay: '', BundleNo: '',
  SampleQty: 0, PanelDefects: 0, NotchesDefects: 0, DrillMarkDefects: 0,
  ShadeDefects: 0, MeasurementDefects: 0,
  InspectorId: 0, CorrectiveAction: '', Comments: '',
};

const CuttingPanelQCPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useCuttingPanelQcs();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<CuttingPanelQc | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: sizeList } = useSizeOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: CuttingPanelQc) => {
    setEditingId(item.id);
    setForm({
      InspectionDate: item.inspectionDate?.split('T')[0] || '',
      FGPOId: item.fgpoId, SizeId: sizeList.find(o => o.label === item.sizeName)?.id ?? 0, FabricLot: item.fabricLot ?? '',
      CutLotLay: item.cutLotLay ?? '', BundleNo: item.bundleNo ?? '',
      SampleQty: item.sampleQty, PanelDefects: item.panelDefects,
      NotchesDefects: item.notchesDefects, DrillMarkDefects: item.drillMarkDefects,
      ShadeDefects: item.shadeDefects, MeasurementDefects: item.measurementDefects,
      InspectorId: userList.find(o => o.label === item.inspectorName)?.id ?? 0, CorrectiveAction: item.correctiveAction ?? '',
      Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this inspection?')) return;
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
        InspectorId: form.InspectorId || null,
        InspectionDate: form.InspectionDate ? new Date(form.InspectionDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Vistas previas de las columnas calculadas (igual que el Excel)
  const total = form.PanelDefects + form.NotchesDefects + form.DrillMarkDefects + form.ShadeDefects + form.MeasurementDefects;
  const rate = form.SampleQty > 0 ? (total / form.SampleQty) : 0;
  const maxAllowed = 0.02;
  const previewResult = form.SampleQty === 0 ? 'Pending' : (rate <= maxAllowed ? 'Passed' : 'Failed');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <CribIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Cutting Panel QC
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Quality inspection of cut panels (Total Defects, Defect Rate % and Result automatic)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Inspection</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, Fabric Lot, Cut Lot, Bundle, Result..."
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
                {['Date', 'FGPO', 'Style', 'Color', 'Size', 'Cut Lot / Lay', 'Bundle', 'Sample', 'Total Def.', 'Rate %', 'Max', 'Result', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No inspections found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first inspection</Button>
                </TableCell></TableRow>
              ) : items.map((item: CuttingPanelQc) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.inspectionDate)}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.style || '-'}</TableCell>
                  <TableCell>{item.color || '-'}</TableCell>
                  <TableCell>{item.sizeName || '-'}</TableCell>
                  <TableCell>{item.cutLotLay || '-'}</TableCell>
                  <TableCell>{item.bundleNo || '-'}</TableCell>
                  <TableCell>{item.sampleQty}</TableCell>
                  <TableCell>{item.totalDefects}</TableCell>
                  <TableCell>{item.defectRatePct.toFixed(4)}</TableCell>
                  <TableCell>{item.maxAllowed}</TableCell>
                  <TableCell><Chip label={item.result || 'N/A'} size="small" color={sc(item.result ?? '')} variant="outlined" /></TableCell>
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
          {editingId ? 'Edit Inspection' : 'New Inspection'}
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Date *" type="date" value={form.InspectionDate} onChange={e => setF('InspectionDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Cut Lot / Lay" value={form.CutLotLay} onChange={e => setF('CutLotLay', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Bundle No." value={form.BundleNo} onChange={e => setF('BundleNo', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Sample Qty" type="number" value={form.SampleQty || ''} onChange={e => setF('SampleQty', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Defects found (input)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Panel" type="number" value={form.PanelDefects || ''} onChange={e => setF('PanelDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Notches" type="number" value={form.NotchesDefects || ''} onChange={e => setF('NotchesDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Drill Mark" type="number" value={form.DrillMarkDefects || ''} onChange={e => setF('DrillMarkDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Shade" type="number" value={form.ShadeDefects || ''} onChange={e => setF('ShadeDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Measurement" type="number" value={form.MeasurementDefects || ''} onChange={e => setF('MeasurementDefects', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Calculated automatically</Typography></Divider></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><TextField fullWidth size="small" label="Total Defects" value={total} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><TextField fullWidth size="small" label="Defect Rate %" value={rate.toFixed(4)} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><TextField fullWidth size="small" label="Max Allowed" value={maxAllowed} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 4, sm: 3 }}><Chip label={`Result: ${previewResult}`} color={sc(previewResult)} sx={{ mt: 1 }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Action</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inspector</InputLabel>
                <Select value={form.InspectorId || ''} label="Inspector" onChange={e => setF('InspectorId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Corrective Action" value={form.CorrectiveAction} onChange={e => setF('CorrectiveAction', e.target.value)} /></Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Inspection Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.inspectionDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Cut Lot / Bundle</Typography><Typography>{viewItem.cutLotLay || '-'} / {viewItem.bundleNo || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Panel</Typography><Typography>{viewItem.panelDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Notches</Typography><Typography>{viewItem.notchesDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Drill Mark</Typography><Typography>{viewItem.drillMarkDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shade</Typography><Typography>{viewItem.shadeDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Measurement</Typography><Typography>{viewItem.measurementDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Sample Qty</Typography><Typography>{viewItem.sampleQty}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Total Defects</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.totalDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Defect Rate %</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.defectRatePct.toFixed(4)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Max Allowed</Typography><Typography>{viewItem.maxAllowed}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Result</Typography><Chip label={viewItem.result || '-'} size="small" color={sc(viewItem.result ?? '')} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inspector</Typography><Typography>{viewItem.inspectorName || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Corrective Action</Typography><Typography>{viewItem.correctiveAction || '-'}</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default CuttingPanelQCPage;
