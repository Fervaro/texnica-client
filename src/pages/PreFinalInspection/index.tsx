import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePreFinalInspections } from '../../hooks/preFinalInspections/usePreFinalInspections';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { PreFinalInspection } from '../../types';

const sc = (s: string) => {
  const m: Record<string, any> = { Passed: 'success', Failed: 'error' };
  return m[s] ?? 'default';
};

const emptyForm = {
  InspectionDate: new Date().toISOString().split('T')[0],
  FGPOId: 0, LotShipment: '', LotSize: 0,
  InspectionLevel: 'Level II', AqlMajor: 2.5, AqlMinor: 4.0,
  SampleSize: 0,
  CriticalDefects: 0, MajorDefects: 0, MinorDefects: 0,
  CriticalAc: 0, MajorAc: 5, MinorAc: 7,
  CriticalRe: 1, MajorRe: 6, MinorRe: 8,
  Inspector: '', Disposition: 'Pending', ReportLink: '', Comments: '',
};

const PreFinalInspectionPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = usePreFinalInspections();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<PreFinalInspection | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: PreFinalInspection) => {
    setEditingId(item.id);
    setForm({
      InspectionDate: item.inspectionDate?.split('T')[0] || '',
      FGPOId: item.fgpoId, LotShipment: item.lotShipment ?? '', LotSize: item.lotSize,
      InspectionLevel: item.inspectionLevel || 'Level II', AqlMajor: item.aqlMajor, AqlMinor: item.aqlMinor,
      SampleSize: item.sampleSize,
      CriticalDefects: item.criticalDefects, MajorDefects: item.majorDefects, MinorDefects: item.minorDefects,
      CriticalAc: item.criticalAc, MajorAc: item.majorAc, MinorAc: item.minorAc,
      CriticalRe: item.criticalRe, MajorRe: item.majorRe, MinorRe: item.minorRe,
      Inspector: item.inspector ?? '', Disposition: item.disposition || 'Pending',
      ReportLink: item.reportLink ?? '', Comments: item.comments ?? '',
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
        InspectionDate: form.InspectionDate ? new Date(form.InspectionDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <GavelIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Pre-Final Inspection
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Pre-packing inspection with AQL sampling (automatic Result)
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
          <TextField size="small" placeholder="Search by FGPO, Lot, Inspector, Result..."
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
                {['Date', 'FGPO', 'Lot / Shipment', 'Lot Size', 'Sample', 'Defects (C/M/Mi)', 'Ac (C/M/Mi)', 'Re (C/M/Mi)', 'Result', 'Disposition', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No inspections found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first inspection</Button>
                </TableCell></TableRow>
              ) : items.map((item: PreFinalInspection) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.inspectionDate)}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.lotShipment || '-'}</TableCell>
                  <TableCell>{item.lotSize}</TableCell>
                  <TableCell>{item.sampleSize}</TableCell>
                  <TableCell>{item.criticalDefects}/{item.majorDefects}/{item.minorDefects}</TableCell>
                  <TableCell>{item.criticalAc}/{item.majorAc}/{item.minorAc}</TableCell>
                  <TableCell>{item.criticalRe}/{item.majorRe}/{item.minorRe}</TableCell>
                  <TableCell><Chip label={item.result || 'N/A'} size="small" color={sc(item.result ?? '')} variant="outlined" /></TableCell>
                  <TableCell>{item.disposition || '-'}</TableCell>
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Inspection Date *" type="date" value={form.InspectionDate} onChange={e => setF('InspectionDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot / Shipment" value={form.LotShipment} onChange={e => setF('LotShipment', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot Size" type="number" value={form.LotSize || ''} onChange={e => setF('LotSize', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Inspection Level" value={form.InspectionLevel} onChange={e => setF('InspectionLevel', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Sample Size" type="number" value={form.SampleSize || ''} onChange={e => setF('SampleSize', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="AQL Major" type="number" value={form.AqlMajor || ''} onChange={e => setF('AqlMajor', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="AQL Minor" type="number" value={form.AqlMinor || ''} onChange={e => setF('AqlMinor', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Defects found</Typography></Divider></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Critical Defects" type="number" value={form.CriticalDefects || ''} onChange={e => setF('CriticalDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Major Defects" type="number" value={form.MajorDefects || ''} onChange={e => setF('MajorDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Minor Defects" type="number" value={form.MinorDefects || ''} onChange={e => setF('MinorDefects', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">AQL Numbers — Acceptance (Ac) and Rejection (Re)</Typography></Divider></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Critical Ac" type="number" value={form.CriticalAc || ''} onChange={e => setF('CriticalAc', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Major Ac" type="number" value={form.MajorAc || ''} onChange={e => setF('MajorAc', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Minor Ac" type="number" value={form.MinorAc || ''} onChange={e => setF('MinorAc', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Critical Re" type="number" value={form.CriticalRe || ''} onChange={e => setF('CriticalRe', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Major Re" type="number" value={form.MajorRe || ''} onChange={e => setF('MajorRe', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 4, sm: 4 }}><TextField fullWidth size="small" label="Minor Re" type="number" value={form.MinorRe || ''} onChange={e => setF('MinorRe', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Result & Action</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Inspector" value={form.Inspector} onChange={e => setF('Inspector', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Disposition" value={form.Disposition} onChange={e => setF('Disposition', e.target.value)} /></Grid>
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
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inspection Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.inspectionDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot / Shipment</Typography><Typography>{viewItem.lotShipment || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot Size / Sample</Typography><Typography>{viewItem.lotSize} / {viewItem.sampleSize}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Critical</Typography><Typography>{viewItem.criticalDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Major</Typography><Typography>{viewItem.majorDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Minor</Typography><Typography>{viewItem.minorDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Ac (C/M/Mi)</Typography><Typography>{viewItem.criticalAc}/{viewItem.majorAc}/{viewItem.minorAc}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Re (C/M/Mi)</Typography><Typography>{viewItem.criticalRe}/{viewItem.majorRe}/{viewItem.minorRe}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Result</Typography><Chip label={viewItem.result} size="small" color={sc(viewItem.result ?? '')} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inspector</Typography><Typography>{viewItem.inspector || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Disposition</Typography><Typography>{viewItem.disposition || '-'}</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default PreFinalInspectionPage;
