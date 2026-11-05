import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTopSamples } from '../../hooks/topSamples/useTopSamples';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { TopSample } from '../../types';

// Listas de validación del Excel
const RESULT_OPTIONS = ['Pending', 'Passed', 'Failed', 'Approved with Comments', 'N/A'];
const STATUS_OPTIONS = [
  'Pending', 'In Production', 'Internal Review', 'Submitted', 'Approved',
  'Approved with Comments', 'Rejected', 'Correction Required', 'Production on Hold',
];

const sc = (s: string) => {
  const m: Record<string, any> = { Approved: 'success', Passed: 'success', Rejected: 'error', Failed: 'error', 'Production on Hold': 'warning', Pending: 'warning', 'Correction Required': 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  FGPOId: 0, SizeId: 0, ProductionLine: '', FabricLot: '', CutLotBundle: '',
  TrimVersion: '', ThreadLot: '', TopQty: 0, ProductionDate: '',
  MeasurementResult: 'Pending', ConstructionResult: 'Pending', WorkmanshipResult: 'Pending',
  LabelResult: 'Pending', PackingResult: 'Pending',
  InternalReview: 'Pending', CustomerReview: 'Pending', CorrectiveAction: '',
  ApprovalDate: '', ApprovedByUserId: 0, Status: 'Pending',
  DocumentLink: '', PhotoLink: '',
};

const TOPSamplePage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useTopSamples();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<TopSample | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: sizeList } = useSizeOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: TopSample) => {
    setEditingId(item.id);
    setForm({
      FGPOId: item.fgpoId, SizeId: sizeList.find(o => o.label === item.size)?.id ?? 0, ProductionLine: item.productionLine ?? '',
      FabricLot: item.fabricLot ?? '', CutLotBundle: item.cutLotBundle ?? '',
      TrimVersion: item.trimVersion ?? '', ThreadLot: item.threadLot ?? '',
      TopQty: item.topQty, ProductionDate: item.productionDate?.split('T')[0] || '',
      MeasurementResult: item.measurementResult || 'Pending',
      ConstructionResult: item.constructionResult || 'Pending',
      WorkmanshipResult: item.workmanshipResult || 'Pending',
      LabelResult: item.labelResult || 'Pending',
      PackingResult: item.packingResult || 'Pending',
      InternalReview: item.internalReview || 'Pending',
      CustomerReview: item.customerReview || 'Pending',
      CorrectiveAction: item.correctiveAction ?? '',
      ApprovalDate: item.approvalDate?.split('T')[0] || '',
      ApprovedByUserId: userList.find(o => o.label === item.approvedBy)?.id ?? 0,
      Status: item.status || 'Pending',
      DocumentLink: item.documentLink ?? '', PhotoLink: item.photoLink ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this sample?')) return;
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
        ApprovedByUserId: form.ApprovedByUserId || null,
        ProductionDate: form.ProductionDate ? new Date(form.ProductionDate).toISOString() : null,
        ApprovalDate: form.ApprovalDate ? new Date(form.ApprovalDate).toISOString() : null,
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Campos con dropdown de resultado
  const resultFields: { key: keyof typeof emptyForm; label: string }[] = [
    { key: 'MeasurementResult', label: 'Measurement' },
    { key: 'ConstructionResult', label: 'Construction' },
    { key: 'WorkmanshipResult', label: 'Workmanship' },
    { key: 'LabelResult', label: 'Label' },
    { key: 'PackingResult', label: 'Packing' },
    { key: 'InternalReview', label: 'Internal Review' },
    { key: 'CustomerReview', label: 'Customer Review' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <ChecklistIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            TOP Sample
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            TOP (Top of Production) Sample — production line startup sample
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Sample</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, Line, Fabric Lot, Cut Lot, Status..."
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
                {['FGPO', 'Line', 'Size', 'Fabric Lot', 'Cut Lot', 'TOP Qty', 'Prod Date', 'Workmanship', 'Packing', 'Status', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No TOP samples found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first sample</Button>
                </TableCell></TableRow>
              ) : items.map((item: TopSample) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.productionLine || '-'}</TableCell>
                  <TableCell>{item.size || '-'}</TableCell>
                  <TableCell>{item.fabricLot || '-'}</TableCell>
                  <TableCell>{item.cutLotBundle || '-'}</TableCell>
                  <TableCell>{item.topQty}</TableCell>
                  <TableCell>{fmt(item.productionDate)}</TableCell>
                  <TableCell><Chip label={item.workmanshipResult || 'N/A'} size="small" color={sc(item.workmanshipResult ?? '')} variant="outlined" /></TableCell>
                  <TableCell><Chip label={item.packingResult || 'N/A'} size="small" color={sc(item.packingResult ?? '')} variant="outlined" /></TableCell>
                  <TableCell><Chip label={item.status || 'N/A'} size="small" color={sc(item.status ?? '')} variant="outlined" /></TableCell>
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
          {editingId ? 'Edit Sample' : 'New Sample'}
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Size</InputLabel>
                <Select value={form.SizeId || ''} label="Size" onChange={e => setF('SizeId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a Size...</em></MenuItem>
                  {sizeList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Production Line" value={form.ProductionLine} onChange={e => setF('ProductionLine', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Fabric Lot" value={form.FabricLot} onChange={e => setF('FabricLot', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Cut Lot / Bundle" value={form.CutLotBundle} onChange={e => setF('CutLotBundle', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Trim Version" value={form.TrimVersion} onChange={e => setF('TrimVersion', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Thread Lot" value={form.ThreadLot} onChange={e => setF('ThreadLot', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="TOP Qty" type="number" value={form.TopQty || ''} onChange={e => setF('TopQty', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Production Date" type="date" value={form.ProductionDate} onChange={e => setF('ProductionDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Results by category</Typography></Divider></Grid>
            {resultFields.map(rf => (
              <Grid key={rf.key} size={{ xs: 6, sm: 4, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{rf.label}</InputLabel>
                  <Select value={form[rf.key] as string} label={rf.label} onChange={e => setF(rf.key, e.target.value)}>
                    {RESULT_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            ))}

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Approval</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.Status} label="Status" onChange={e => setF('Status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Approval Date" type="date" value={form.ApprovalDate} onChange={e => setF('ApprovalDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Approved By</InputLabel>
                <Select value={form.ApprovedByUserId || ''} label="Approved By" onChange={e => setF('ApprovedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Corrective Action" value={form.CorrectiveAction} onChange={e => setF('CorrectiveAction', e.target.value)} multiline rows={2} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Document Link" value={form.DocumentLink} onChange={e => setF('DocumentLink', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Photo Link" value={form.PhotoLink} onChange={e => setF('PhotoLink', e.target.value)} /></Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Sample Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Line / Size</Typography><Typography>{viewItem.productionLine || '-'} / {viewItem.size || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric Lot / Cut Lot</Typography><Typography>{viewItem.fabricLot || '-'} / {viewItem.cutLotBundle || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Trim / Thread Lot</Typography><Typography>{viewItem.trimVersion || '-'} / {viewItem.threadLot || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">TOP Qty / Production Date</Typography><Typography>{viewItem.topQty} / {fmt(viewItem.productionDate)}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Measurement</Typography><Chip label={viewItem.measurementResult || 'N/A'} size="small" color={sc(viewItem.measurementResult ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Construction</Typography><Chip label={viewItem.constructionResult || 'N/A'} size="small" color={sc(viewItem.constructionResult ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Workmanship</Typography><Chip label={viewItem.workmanshipResult || 'N/A'} size="small" color={sc(viewItem.workmanshipResult ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Label</Typography><Chip label={viewItem.labelResult || 'N/A'} size="small" color={sc(viewItem.labelResult ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Packing</Typography><Chip label={viewItem.packingResult || 'N/A'} size="small" color={sc(viewItem.packingResult ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Internal Review</Typography><Chip label={viewItem.internalReview || 'N/A'} size="small" color={sc(viewItem.internalReview ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Customer Review</Typography><Chip label={viewItem.customerReview || 'N/A'} size="small" color={sc(viewItem.customerReview ?? '')} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.status || '-'} size="small" color={sc(viewItem.status ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Approval Date</Typography><Typography>{fmt(viewItem.approvalDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><Typography variant="caption" color="text.secondary">Approved By</Typography><Typography>{viewItem.approvedBy || '-'}</Typography></Grid>
              {viewItem.correctiveAction && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Corrective Action</Typography><Typography>{viewItem.correctiveAction}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default TOPSamplePage;
