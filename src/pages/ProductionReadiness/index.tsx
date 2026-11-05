import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useProductionReadiness } from '../../hooks/productionReadiness/useProductionReadiness';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { ProductionReadiness } from '../../types';

// Lista del Excel para cada condición del checklist
const OPTIONS = ['Pending', 'Ready', 'Not Ready', 'N/A', 'Exception Approved'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    Blocked: 'error', 'Not Ready': 'warning', 'Ready with Conditions': 'info', Ready: 'success',
  };
  return m[s] ?? 'default';
};

const emptyForm = {
  ReviewDate: new Date().toISOString().split('T')[0],
  FGPOId: 0,
  PoConfirmed: 'Pending', TechPackCurrent: 'Pending', FabricApproved: 'Pending',
  TrimsApproved: 'Pending', TrimsAvailable: 'Pending', PpSampleApproved: 'Pending',
  PatternApproved: 'Pending', MarkerApproved: 'Pending', FabricWidthConfirmed: 'Pending',
  ShrinkageApproved: 'Pending', TorqueApproved: 'Pending', QualityStandardReady: 'Pending',
  LinePlanned: 'Pending',
  OpenConditions: '', ResponsibleOwnerId: 0, DueDate: '', ApprovedByUserId: 0,
};

const ProductionReadinessPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useProductionReadiness();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<ProductionReadiness | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: ProductionReadiness) => {
    setEditingId(item.id);
    setForm({
      ReviewDate: item.reviewDate?.split('T')[0] || '',
      FGPOId: item.fgpoId,
      PoConfirmed: item.poConfirmed || 'Pending', TechPackCurrent: item.techPackCurrent || 'Pending',
      FabricApproved: item.fabricApproved || 'Pending', TrimsApproved: item.trimsApproved || 'Pending',
      TrimsAvailable: item.trimsAvailable || 'Pending', PpSampleApproved: item.ppSampleApproved || 'Pending',
      PatternApproved: item.patternApproved || 'Pending', MarkerApproved: item.markerApproved || 'Pending',
      FabricWidthConfirmed: item.fabricWidthConfirmed || 'Pending', ShrinkageApproved: item.shrinkageApproved || 'Pending',
      TorqueApproved: item.torqueApproved || 'Pending', QualityStandardReady: item.qualityStandardReady || 'Pending',
      LinePlanned: item.linePlanned || 'Pending',
      OpenConditions: item.openConditions ?? '', ResponsibleOwnerId: userList.find(o => o.label === item.responsibleOwner)?.id ?? 0,
      DueDate: item.dueDate?.split('T')[0] || '', ApprovedByUserId: userList.find(o => o.label === item.approvedBy)?.id ?? 0,
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this PRR?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    try {
      const payload = {
        ...form,
        ResponsibleOwnerId: form.ResponsibleOwnerId || null,
        ApprovedByUserId: form.ApprovedByUserId || null,
        ReviewDate: form.ReviewDate ? new Date(form.ReviewDate).toISOString() : new Date().toISOString(),
        DueDate: form.DueDate ? new Date(form.DueDate).toISOString() : null,
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const checklist: { key: keyof typeof emptyForm; label: string }[] = [
    { key: 'PoConfirmed', label: 'PO Confirmed' },
    { key: 'TechPackCurrent', label: 'Tech Pack Current' },
    { key: 'FabricApproved', label: 'Fabric Approved' },
    { key: 'TrimsApproved', label: 'Trims Approved' },
    { key: 'TrimsAvailable', label: 'Trims Available' },
    { key: 'PpSampleApproved', label: 'PP Sample Approved' },
    { key: 'PatternApproved', label: 'Pattern Approved' },
    { key: 'MarkerApproved', label: 'Marker Approved' },
    { key: 'FabricWidthConfirmed', label: 'Fabric Width Confirmed' },
    { key: 'ShrinkageApproved', label: 'Shrinkage Approved' },
    { key: 'TorqueApproved', label: 'Torque Approved' },
    { key: 'QualityStandardReady', label: 'Quality Standard Ready' },
    { key: 'LinePlanned', label: 'Line Planned' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <PlaylistAddCheckIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Production Readiness
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            PRR — Readiness checklist before starting production (automatic Overall Result)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New PRR</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, Owner, Result..."
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
                {['Date', 'FGPO', 'Fabric', 'Trims', 'PP Sample', 'Pattern', 'Marker', 'Shrinkage', 'Torque', 'Line', 'Overall Result', 'Owner', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No PRR records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first PRR</Button>
                </TableCell></TableRow>
              ) : items.map((item: ProductionReadiness) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.reviewDate)}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell><Chip label={item.fabricApproved || 'N/A'} size="small" color={sc(item.fabricApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.trimsApproved || 'N/A'} size="small" color={sc(item.trimsApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.ppSampleApproved || 'N/A'} size="small" color={sc(item.ppSampleApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.patternApproved || 'N/A'} size="small" color={sc(item.patternApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.markerApproved || 'N/A'} size="small" color={sc(item.markerApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.shrinkageApproved || 'N/A'} size="small" color={sc(item.shrinkageApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.torqueApproved || 'N/A'} size="small" color={sc(item.torqueApproved ?? '')} /></TableCell>
                  <TableCell><Chip label={item.linePlanned || 'N/A'} size="small" color={sc(item.linePlanned ?? '')} /></TableCell>
                  <TableCell><Chip label={item.overallResult || 'N/A'} size="small" color={sc(item.overallResult ?? '')} variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                  <TableCell>{item.responsibleOwner || '-'}</TableCell>
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
          {editingId ? 'Edit PRR' : 'New PRR'}
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Review Date *" type="date" value={form.ReviewDate} onChange={e => setF('ReviewDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Responsible Owner</InputLabel>
                <Select value={form.ResponsibleOwnerId || ''} label="Responsible Owner" onChange={e => setF('ResponsibleOwnerId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Due Date" type="date" value={form.DueDate} onChange={e => setF('DueDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Approved By</InputLabel>
                <Select value={form.ApprovedByUserId || ''} label="Approved By" onChange={e => setF('ApprovedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Preparation checklist</Typography></Divider></Grid>
            {checklist.map(c => (
              <Grid key={c.key} size={{ xs: 6, sm: 4, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{c.label}</InputLabel>
                  <Select value={form[c.key] as string} label={c.label} onChange={e => setF(c.key, e.target.value)}>
                    {OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            ))}

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Conditions</Typography></Divider></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Open Conditions" value={form.OpenConditions} onChange={e => setF('OpenConditions', e.target.value)} multiline rows={2} /></Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>PRR Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Review Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.reviewDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">PO Confirmed</Typography><Chip label={viewItem.poConfirmed || '-'} size="small" color={sc(viewItem.poConfirmed ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Tech Pack</Typography><Chip label={viewItem.techPackCurrent || '-'} size="small" color={sc(viewItem.techPackCurrent ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Fabric Approved</Typography><Chip label={viewItem.fabricApproved || '-'} size="small" color={sc(viewItem.fabricApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Trims Approved</Typography><Chip label={viewItem.trimsApproved || '-'} size="small" color={sc(viewItem.trimsApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Trims Available</Typography><Chip label={viewItem.trimsAvailable || '-'} size="small" color={sc(viewItem.trimsAvailable ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">PP Sample</Typography><Chip label={viewItem.ppSampleApproved || '-'} size="small" color={sc(viewItem.ppSampleApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Pattern</Typography><Chip label={viewItem.patternApproved || '-'} size="small" color={sc(viewItem.patternApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Marker</Typography><Chip label={viewItem.markerApproved || '-'} size="small" color={sc(viewItem.markerApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Fabric Width</Typography><Chip label={viewItem.fabricWidthConfirmed || '-'} size="small" color={sc(viewItem.fabricWidthConfirmed ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shrinkage</Typography><Chip label={viewItem.shrinkageApproved || '-'} size="small" color={sc(viewItem.shrinkageApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Torque</Typography><Chip label={viewItem.torqueApproved || '-'} size="small" color={sc(viewItem.torqueApproved ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Quality Standard</Typography><Chip label={viewItem.qualityStandardReady || '-'} size="small" color={sc(viewItem.qualityStandardReady ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Line Planned</Typography><Chip label={viewItem.linePlanned || '-'} size="small" color={sc(viewItem.linePlanned ?? '')} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Overall Result</Typography><Chip label={viewItem.overallResult || '-'} size="small" color={sc(viewItem.overallResult ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Owner</Typography><Typography>{viewItem.responsibleOwner || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Approved By</Typography><Typography>{viewItem.approvedBy || '-'}</Typography></Grid>
              {viewItem.openConditions && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Open Conditions</Typography><Typography>{viewItem.openConditions}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionReadinessPage;
