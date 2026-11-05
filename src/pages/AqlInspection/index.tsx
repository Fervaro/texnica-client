import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAqlInspections } from '../../hooks/aqlInspections/useAqlInspections';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { AqlInspection } from '../../types';

const LEVELS = ['Level I', 'Level II', 'Level III', 'Level S1', 'Level S2', 'Level S3', 'Level S4'];
const DISPOSITIONS = ['Pending', 'Approved', 'Rejected', 'On Hold', 'Sent to Customer'];

const sc = (s: string) => {
  const m: Record<string, any> = { Passed: 'success', Failed: 'error', Approved: 'success', Rejected: 'error', 'On Hold': 'warning', Pending: 'warning' };
  return m[s] ?? 'default';
};

interface Props {
  inspectionType: string;
  title: string;
  subtitle: string;
}

const makeEmptyForm = (_type: string) => ({
  InspectionDate: new Date().toISOString().split('T')[0],
  FGPOId: 0, LotShipment: '', LotSize: '',
  InspectionLevel: 'Level II', AqlMajor: '2.5', AqlMinor: '4.0',
  SampleSize: '',
  CriticalDefects: '', MajorDefects: '', MinorDefects: '',
  CriticalAc: '', MajorAc: '5', MinorAc: '7',
  CriticalRe: '', MajorRe: '6', MinorRe: '8',
  InspectorId: 0, Disposition: 'Pending', ReportLink: '', Comments: '',
});

const AqlInspectionPage: React.FC<Props> = ({ inspectionType, title, subtitle }) => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useAqlInspections(inspectionType);

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<AqlInspection | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const [form, setForm] = useState(() => makeEmptyForm(inspectionType));

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const openCreate = () => { setEditingId(null); setForm(makeEmptyForm(inspectionType)); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: AqlInspection) => {
    setEditingId(item.id);
    setForm({
      InspectionDate: item.inspectionDate?.split('T')[0] || '', FGPOId: item.fgpoId,
      LotShipment: item.lotShipment ?? '', LotSize: item.lotSize?.toString() ?? '',
      InspectionLevel: item.inspectionLevel || 'Level II', AqlMajor: item.aqlMajor?.toString() ?? '2.5', AqlMinor: item.aqlMinor?.toString() ?? '4.0',
      SampleSize: item.sampleSize?.toString() ?? '',
      CriticalDefects: item.criticalDefects?.toString() ?? '', MajorDefects: item.majorDefects?.toString() ?? '', MinorDefects: item.minorDefects?.toString() ?? '',
      CriticalAc: item.criticalAc?.toString() ?? '', MajorAc: item.majorAc?.toString() ?? '5', MinorAc: item.minorAc?.toString() ?? '7',
      CriticalRe: item.criticalRe?.toString() ?? '', MajorRe: item.majorRe?.toString() ?? '6', MinorRe: item.minorRe?.toString() ?? '8',
      InspectorId: item.inspectorId ?? 0, Disposition: item.disposition || 'Pending', ReportLink: item.reportLink ?? '', Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this inspection?')) return;
    try { await remove(id); } catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    try {
      const num = (v: string) => v === '' ? 0 : Number(v);
      const payload = {
        InspectionType: inspectionType,
        InspectionDate: form.InspectionDate ? new Date(form.InspectionDate).toISOString() : new Date().toISOString(),
        FGPOId: form.FGPOId,
        LotShipment: form.LotShipment, LotSize: num(form.LotSize),
        InspectionLevel: form.InspectionLevel, AqlMajor: num(form.AqlMajor), AqlMinor: num(form.AqlMinor),
        SampleSize: num(form.SampleSize),
        CriticalDefects: num(form.CriticalDefects), MajorDefects: num(form.MajorDefects), MinorDefects: num(form.MinorDefects),
        CriticalAc: num(form.CriticalAc), MajorAc: num(form.MajorAc), MinorAc: num(form.MinorAc),
        CriticalRe: num(form.CriticalRe), MajorRe: num(form.MajorRe), MinorRe: num(form.MinorRe),
        InspectorId: form.InspectorId || null,
        Disposition: form.Disposition, ReportLink: form.ReportLink, Comments: form.Comments,
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
            <VerifiedUserIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>
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
                {['Date', 'FGPO', 'Lot', 'Size', 'Sample', 'Maj', 'Min', 'Result', 'Inspector', 'Disposition', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
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
              ) : items.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell>{fmt(i.inspectionDate)}</TableCell>
                  <TableCell>{i.fgpoNumber || '-'}</TableCell>
                  <TableCell>{i.lotShipment || '-'}</TableCell>
                  <TableCell>{i.lotSize}</TableCell>
                  <TableCell>{i.sampleSize}</TableCell>
                  <TableCell>{i.majorDefects}</TableCell>
                  <TableCell>{i.minorDefects}</TableCell>
                  <TableCell><Chip label={i.result || 'N/A'} size="small" color={sc(i.result ?? '')} /></TableCell>
                  <TableCell>{i.inspectorName || '-'}</TableCell>
                  <TableCell>{i.disposition || '-'}</TableCell>
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingId ? 'Edit Inspection' : 'New Inspection'} — {inspectionType}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Inspection Date *" type="date" value={form.InspectionDate} onChange={e => setF('InspectionDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inspector</InputLabel>
                <Select value={form.InspectorId || ''} label="Inspector" onChange={e => setF('InspectorId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot / Shipment" value={form.LotShipment} onChange={e => setF('LotShipment', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot Size" type="number" value={form.LotSize} onChange={e => setF('LotSize', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inspection Level</InputLabel>
                <Select value={form.InspectionLevel} label="Inspection Level" onChange={e => setF('InspectionLevel', e.target.value)}>
                  {LEVELS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">AQL Parameters</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="AQL Major %" type="number" value={form.AqlMajor} onChange={e => setF('AqlMajor', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="AQL Minor %" type="number" value={form.AqlMinor} onChange={e => setF('AqlMinor', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Sample Size" type="number" value={form.SampleSize} onChange={e => setF('SampleSize', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Critical Defects" type="number" value={form.CriticalDefects} onChange={e => setF('CriticalDefects', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Major Defects" type="number" value={form.MajorDefects} onChange={e => setF('MajorDefects', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Minor Defects" type="number" value={form.MinorDefects} onChange={e => setF('MinorDefects', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Critical Ac" type="number" value={form.CriticalAc} onChange={e => setF('CriticalAc', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Major Ac" type="number" value={form.MajorAc} onChange={e => setF('MajorAc', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Minor Ac" type="number" value={form.MinorAc} onChange={e => setF('MinorAc', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Critical Re" type="number" value={form.CriticalRe} onChange={e => setF('CriticalRe', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Major Re" type="number" value={form.MajorRe} onChange={e => setF('MajorRe', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Minor Re" type="number" value={form.MinorRe} onChange={e => setF('MinorRe', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Result</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Disposition</InputLabel>
                <Select value={form.Disposition} label="Disposition" onChange={e => setF('Disposition', e.target.value)}>
                  {DISPOSITIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Report Link" value={form.ReportLink} onChange={e => setF('ReportLink', e.target.value)} /></Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Inspection Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Type / Date</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.inspectionType} · {fmt(viewItem.inspectionDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot / Size / Level</Typography><Typography>{viewItem.lotShipment || '-'} / {viewItem.lotSize} / {viewItem.inspectionLevel || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Sample Size</Typography><Typography>{viewItem.sampleSize}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Critical / Major / Minor</Typography><Typography>{viewItem.criticalDefects} / {viewItem.majorDefects} / {viewItem.minorDefects}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Ac</Typography><Typography>{viewItem.criticalAc} / {viewItem.majorAc} / {viewItem.minorAc}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Re</Typography><Typography>{viewItem.criticalRe} / {viewItem.majorRe} / {viewItem.minorRe}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Result</Typography><Chip label={viewItem.result || '-'} size="small" color={sc(viewItem.result ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inspector</Typography><Typography>{viewItem.inspectorName || '-'}</Typography></Grid>
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

export default AqlInspectionPage;
