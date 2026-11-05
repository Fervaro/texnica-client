import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import ChairAltIcon from '@mui/icons-material/ChairAlt';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSewingProductions } from '../../hooks/sewingProductions/useSewingProductions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { SewingProduction } from '../../types';

const TOP_STATUS = ['Pending', 'Approved', 'Approved with Comments', 'Rejected', 'Production on Hold'];

const sc = (s: string) => {
  const m: Record<string, any> = { Approved: 'success', Rejected: 'error', 'Production on Hold': 'warning', Pending: 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  ProductionDate: new Date().toISOString().split('T')[0],
  Shift: 'Day', Line: '', FGPOId: 0,
  SewingInput: '', DailyTarget: '', DailyOutput: '', CumulativeOutput: '',
  Wip: '', Rework: '', Reject: '', DowntimeMinutes: '',
  TopStatus: 'Pending', SupervisorId: 0, Remarks: '',
};

const SewingProductionPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useSewingProductions();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<SewingProduction | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (s: SewingProduction) => {
    setEditingId(s.id);
    setForm({
      ProductionDate: s.productionDate?.split('T')[0] || '', Shift: s.shift || 'Day', Line: s.line ?? '',
      FGPOId: s.fgpoId,
      SewingInput: s.sewingInput?.toString() ?? '', DailyTarget: s.dailyTarget?.toString() ?? '',
      DailyOutput: s.dailyOutput?.toString() ?? '', CumulativeOutput: s.cumulativeOutput?.toString() ?? '',
      Wip: s.wip?.toString() ?? '', Rework: s.rework?.toString() ?? '', Reject: s.reject?.toString() ?? '',
      DowntimeMinutes: s.downtimeMinutes?.toString() ?? '', TopStatus: s.topStatus || 'Pending',
      SupervisorId: s.supervisorId ?? 0, Remarks: s.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this record?')) return;
    try { await remove(id); } catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    try {
      const num = (v: string) => v === '' ? 0 : Number(v);
      const payload = {
        ...form,
        SewingInput: num(form.SewingInput), DailyTarget: num(form.DailyTarget), DailyOutput: num(form.DailyOutput),
        CumulativeOutput: num(form.CumulativeOutput), Wip: num(form.Wip), Rework: num(form.Rework),
        Reject: num(form.Reject), DowntimeMinutes: num(form.DowntimeMinutes),
        SupervisorId: form.SupervisorId || null,
        ProductionDate: form.ProductionDate ? new Date(form.ProductionDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Talla derivada automáticamente del FGPO seleccionado (viene de sus líneas)
  const selectedFgpo = fgpoList.find((f: any) => f.id === form.FGPOId) as any;
  const derivedSize = selectedFgpo?.meta?.sizeCode || '';

  // Vistas previas de columnas calculadas (fórmula del Excel)
  const n = (s: string) => s === '' ? 0 : Number(s);
  const ach = n(form.DailyTarget) > 0 ? (n(form.DailyOutput) / n(form.DailyTarget)) : 0;
  const variance = n(form.CumulativeOutput) - n(form.SewingInput);
  const pending = Math.max(0, n(form.SewingInput) - n(form.CumulativeOutput));
  const overprod = Math.max(0, n(form.CumulativeOutput) - n(form.SewingInput));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <ChairAltIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Sewing Production
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Daily sewing production by line and shift (automatic compliance)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Record</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, Line, Shift, Size, Status..."
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
                {['Date', 'Line', 'Shift', 'FGPO', 'Size', 'Input', 'Target', 'Output', 'Cumul.', 'WIP', 'Ach. %', 'Variance', 'Pending', 'Status', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={15} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={15} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No sewing records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first record</Button>
                </TableCell></TableRow>
              ) : items.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{fmt(s.productionDate)}</TableCell>
                  <TableCell>{s.line || '-'}</TableCell>
                  <TableCell>{s.shift || '-'}</TableCell>
                  <TableCell>{s.fgpoNumber}</TableCell>
                  <TableCell>{s.sizeCode || '-'}</TableCell>
                  <TableCell>{s.sewingInput}</TableCell>
                  <TableCell>{s.dailyTarget}</TableCell>
                  <TableCell>{s.dailyOutput}</TableCell>
                  <TableCell>{s.cumulativeOutput}</TableCell>
                  <TableCell>{s.wip}</TableCell>
                  <TableCell><Typography color={s.targetAchievementPct >= 1 ? 'success.main' : 'warning.main'} sx={{ fontWeight: 600 }}>{(s.targetAchievementPct * 100).toFixed(0)}%</Typography></TableCell>
                  <TableCell><Typography color={s.sewingVariance < 0 ? 'error.main' : 'success.main'}>{s.sewingVariance}</Typography></TableCell>
                  <TableCell><Typography color={s.pendingSewing > 0 ? 'warning.main' : 'text.secondary'}>{s.pendingSewing}</Typography></TableCell>
                  <TableCell><Chip label={s.topStatus || 'N/A'} size="small" color={sc(s.topStatus ?? '')} /></TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(s); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon fontSize="small" /></IconButton>
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingId ? 'Edit Record' : 'New Record'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Date *" type="date" value={form.ProductionDate} onChange={e => setF('ProductionDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Shift" value={form.Shift} onChange={e => setF('Shift', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Line" value={form.Line} onChange={e => setF('Line', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Size (from FGPO)" value={derivedSize} slotProps={{ input: { readOnly: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Quantities (input)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Sewing Input" type="number" value={form.SewingInput} onChange={e => setF('SewingInput', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Daily Target" type="number" value={form.DailyTarget} onChange={e => setF('DailyTarget', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Daily Output" type="number" value={form.DailyOutput} onChange={e => setF('DailyOutput', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Cumulative Output" type="number" value={form.CumulativeOutput} onChange={e => setF('CumulativeOutput', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="WIP" type="number" value={form.Wip} onChange={e => setF('Wip', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Rework" type="number" value={form.Rework} onChange={e => setF('Rework', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Reject" type="number" value={form.Reject} onChange={e => setF('Reject', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><TextField fullWidth size="small" label="Downtime (min)" type="number" value={form.DowntimeMinutes} onChange={e => setF('DowntimeMinutes', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Calculated automatically</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Target Ach. %" value={(ach * 100).toFixed(1)} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Sewing Variance" value={variance} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Pending Sewing" value={pending} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Overproduction" value={overprod} slotProps={{ input: { readOnly: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Status & Supervisor</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>TOP Status</InputLabel>
                <Select value={form.TopStatus} label="TOP Status" onChange={e => setF('TopStatus', e.target.value)}>
                  {TOP_STATUS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Supervisor</InputLabel>
                <Select value={form.SupervisorId || ''} label="Supervisor" onChange={e => setF('SupervisorId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Problems / Remarks" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>{editingId ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.productionDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Line / Shift / Size</Typography><Typography>{viewItem.line || '-'} / {viewItem.shift || '-'} / {viewItem.sizeCode || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Input</Typography><Typography>{viewItem.sewingInput}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Target</Typography><Typography>{viewItem.dailyTarget}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Output</Typography><Typography>{viewItem.dailyOutput}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Cumulative</Typography><Typography>{viewItem.cumulativeOutput}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">WIP / Rework / Reject</Typography><Typography>{viewItem.wip} / {viewItem.rework} / {viewItem.reject}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Downtime (min)</Typography><Typography>{viewItem.downtimeMinutes}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Target Ach. %</Typography><Typography color={viewItem.targetAchievementPct >= 1 ? 'success.main' : 'warning.main'} sx={{ fontWeight: 600 }}>{(viewItem.targetAchievementPct * 100).toFixed(1)}%</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Sewing Variance</Typography><Typography color={viewItem.sewingVariance < 0 ? 'error.main' : 'success.main'}>{viewItem.sewingVariance}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Pending Sewing</Typography><Typography color={viewItem.pendingSewing > 0 ? 'warning.main' : 'text.secondary'}>{viewItem.pendingSewing}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Overproduction</Typography><Typography>{viewItem.overproduction}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">TOP Status</Typography><Chip label={viewItem.topStatus || '-'} size="small" color={sc(viewItem.topStatus ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supervisor</Typography><Typography>{viewItem.supervisorName || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Problems / Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default SewingProductionPage;
