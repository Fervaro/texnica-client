import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useInlineQualities } from '../../hooks/inlineQualities/useInlineQualities';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { InlineQuality } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const sc = (s: string) => {
  const m: Record<string, any> = { Passed: 'success', Failed: 'error', 'On Hold': 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  InspectionDate: new Date().toISOString().split('T')[0],
  Time: '', Line: '', FGPOId: 0,
  Operation: '', Operator: '',
  CheckedQty: 0, CriticalDefects: 0, MajorDefects: 0, MinorDefects: 0,
  DefectivePieces: 0, MaxAllowed: 3,
  InspectorId: 0, ImmediateCorrection: '', RootCause: '',
};

const InlineQualityPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useInlineQualities();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<InlineQuality | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: InlineQuality) => {
    setEditingId(item.id);
    setForm({
      InspectionDate: item.inspectionDate?.split('T')[0] || '',
      Time: item.time ?? '', Line: item.line ?? '', FGPOId: item.fgpoId,
      Operation: item.operation ?? '', Operator: item.operator ?? '',
      CheckedQty: item.checkedQty, CriticalDefects: item.criticalDefects,
      MajorDefects: item.majorDefects, MinorDefects: item.minorDefects,
      DefectivePieces: item.defectivePieces, MaxAllowed: item.maxAllowed,
      InspectorId: userList.find(o => o.label === item.inspector)?.id ?? 0, ImmediateCorrection: item.immediateCorrection ?? '',
      RootCause: item.rootCause ?? '',
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
    if (form.CheckedQty <= 0) { setFormError('Checked Qty must be greater than 0.'); return; }
    const negField = firstNegativeField([
      { name: 'Critical Defects', value: form.CriticalDefects },
      { name: 'Major Defects', value: form.MajorDefects },
      { name: 'Minor Defects', value: form.MinorDefects },
      { name: 'Defective Pieces', value: form.DefectivePieces },
      { name: 'Max Allowed', value: form.MaxAllowed },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        InspectorId: form.InspectorId || null,
        InspectionDate: form.InspectionDate ? new Date(form.InspectionDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const pct = (v: number) => `${Number(v).toFixed(2)}%`;
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <FactCheckIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Inline Quality
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Control de calidad en línea: DHU % y defect rate automáticos
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
          <TextField size="small" placeholder="Search by Line, Operation, Operator, FGPO..."
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
                {['Date', 'Line', 'FGPO', 'Operation', 'Operator', 'Checked', 'Defects (C/M/Mi)', 'Total', 'DHU %', 'Def. Rate', 'Max', 'Result', 'Actions'].map(h =>
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
              ) : items.map((item: InlineQuality) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.inspectionDate)}</TableCell>
                  <TableCell>{item.line || '-'}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.operation || '-'}</TableCell>
                  <TableCell>{item.operator || '-'}</TableCell>
                  <TableCell>{item.checkedQty}</TableCell>
                  <TableCell>{item.criticalDefects}/{item.majorDefects}/{item.minorDefects}</TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.totalDefects}</Typography></TableCell>
                  <TableCell>
                    <Chip label={pct(item.dhuPct)} size="small" color={item.dhuPct > item.maxAllowed ? 'error' : 'success'} />
                  </TableCell>
                  <TableCell>{pct(item.defectiveRatePct)}</TableCell>
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
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>Referencias</Typography></Grid>
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Time" value={form.Time} onChange={e => setF('Time', e.target.value)} placeholder="09:30" /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Line" value={form.Line} onChange={e => setF('Line', e.target.value)} placeholder="Line 1" /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Operation" value={form.Operation} onChange={e => setF('Operation', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Operator" value={form.Operator} onChange={e => setF('Operator', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Resultados</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Checked Qty *" type="number" value={form.CheckedQty || ''} onChange={e => setF('CheckedQty', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Critical Defects" type="number" value={form.CriticalDefects || ''} onChange={e => setF('CriticalDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Major Defects" type="number" value={form.MajorDefects || ''} onChange={e => setF('MajorDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Minor Defects" type="number" value={form.MinorDefects || ''} onChange={e => setF('MinorDefects', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Defective Pieces" type="number" value={form.DefectivePieces || ''} onChange={e => setF('DefectivePieces', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Max Allowed (%)" type="number" value={form.MaxAllowed || ''} onChange={e => setF('MaxAllowed', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inspector</InputLabel>
                <Select value={form.InspectorId || ''} label="Inspector" onChange={e => setF('InspectorId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Acción & Causa</Typography></Divider></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Immediate Correction" value={form.ImmediateCorrection} onChange={e => setF('ImmediateCorrection', e.target.value)} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Root Cause / Follow-up" value={form.RootCause} onChange={e => setF('RootCause', e.target.value)} multiline rows={2} /></Grid>
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
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Date / Time</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.inspectionDate)} {viewItem.time || ''}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Line</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.line || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Operation / Operator</Typography><Typography>{viewItem.operation || '-'} / {viewItem.operator || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Checked Qty</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.checkedQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Critical</Typography><Typography>{viewItem.criticalDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Major</Typography><Typography>{viewItem.majorDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Minor</Typography><Typography>{viewItem.minorDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Total Defects</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.totalDefects}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">DHU %</Typography><Chip label={pct(viewItem.dhuPct)} size="small" color={viewItem.dhuPct > viewItem.maxAllowed ? 'error' : 'success'} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Defective Pieces</Typography><Typography>{viewItem.defectivePieces}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Defective Rate</Typography><Typography>{pct(viewItem.defectiveRatePct)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Max Allowed</Typography><Typography>{viewItem.maxAllowed}%</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Result</Typography><Chip label={viewItem.result} size="small" color={sc(viewItem.result ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inspector</Typography><Typography>{viewItem.inspector || '-'}</Typography></Grid>
              {viewItem.immediateCorrection && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Immediate Correction</Typography><Typography>{viewItem.immediateCorrection}</Typography></Grid>}
              {viewItem.rootCause && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Root Cause / Follow-up</Typography><Typography>{viewItem.rootCause}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default InlineQualityPage;
