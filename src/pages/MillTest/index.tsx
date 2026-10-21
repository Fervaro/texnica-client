import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider,
  FormControlLabel, Checkbox
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMillTests } from '../../hooks/millTests/useMillTests';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useCatalogs } from '../../hooks/catalogs/useCatalogs';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { MillTest } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const DEFAULT_TEST_RESULTS = ['Pending', 'Testing', 'Passed', 'Conditionally Passed', 'Failed'];

const trc = (r: string) => {
  const m: Record<string, any> = { Passed: 'success', 'Conditionally Passed': 'warning', Failed: 'error', Testing: 'info' };
  return m[r] ?? 'default';
};

const emptyForm = {
  FabricPOId: 0, FGPOId: 0, Supplier: '', LotNumber: '', Color: '',
  RollQty: 0, ActualWidth: 0, ActualGSM: 0,
  LengthShrinkagePercentage: 0, WidthShrinkagePercentage: 0,
  TorquePercentage: 0, BowingPercentage: 0, SkewingPercentage: 0,
  Colorfastness: '', WashAppearance: '', HandFeel: '',
  TestDate: new Date().toISOString().split('T')[0],
  TestedByUserId: 0, TestResult: 'Pending', ApprovedForExport: false,
  ReportLink: '', Comments: '',
};

const MillTestPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useMillTests();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<MillTest | null>(null);
  const [formError, setFormError] = useState('');

  const { options: poList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const TEST_RESULTS = catalogs['TestResult']?.length ? catalogs['TestResult'] : DEFAULT_TEST_RESULTS;

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: MillTest) => {
    setEditingId(item.id);
    setForm({
      FabricPOId: item.fabricPOId, FGPOId: item.fgpoId,
      Supplier: item.supplier ?? '', LotNumber: item.lotNumber ?? '', Color: item.color ?? '',
      RollQty: item.rollQty, ActualWidth: item.actualWidth, ActualGSM: item.actualGSM,
      LengthShrinkagePercentage: item.lengthShrinkagePercentage,
      WidthShrinkagePercentage: item.widthShrinkagePercentage,
      TorquePercentage: item.torquePercentage, BowingPercentage: item.bowingPercentage,
      SkewingPercentage: item.skewingPercentage,
      Colorfastness: item.colorfastness ?? '', WashAppearance: item.washAppearance ?? '',
      HandFeel: item.handFeel ?? '',
      TestDate: item.testDate?.split('T')[0] || '',
      TestedByUserId: userList.find(o => o.label === item.testedBy)?.id ?? 0, TestResult: item.testResult || 'Pending',
      ApprovedForExport: item.approvedForExport,
      ReportLink: item.reportLink ?? '', Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this test record?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FabricPOId || !form.FGPOId) { setFormError('Fabric PO and FGPO are required.'); return; }
    if (!form.LotNumber) { setFormError('Lot Number is required.'); return; }
    const negField = firstNegativeField([
      { name: 'Roll Quantity', value: form.RollQty },
      { name: 'Actual Width', value: form.ActualWidth },
      { name: 'Actual GSM', value: form.ActualGSM },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        TestedByUserId: form.TestedByUserId || null,
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
            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Mill Test
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Quality test records by Fabric PO, FGPO, and Lot
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Test Record</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component='form' onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Lot, Supplier, Fabric PO, FGPO..."
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
                {['Fabric PO', 'FGPO', 'Lot', 'Supplier', 'Test Date', 'Result', 'Export', 'Tested By', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No test records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first test</Button>
                </TableCell></TableRow>
              ) : items.map((item: MillTest) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.fabricPONumber}</Typography></TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell><Chip label={item.lotNumber || '-'} size="small" variant="outlined" /></TableCell>
                  <TableCell>{item.supplier || '-'}</TableCell>
                  <TableCell>{fmt(item.testDate)}</TableCell>
                  <TableCell><Chip label={item.testResult || 'Pending'} size="small" color={trc(item.testResult ?? '')} variant="outlined" /></TableCell>
                  <TableCell align="center">{item.approvedForExport ? '✅' : '❌'}</TableCell>
                  <TableCell>{item.testedBy || '-'}</TableCell>
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

      {/* Create/Edit Dialog — maxWidth lg para más espacio */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
          {editingId ? 'Edit Mill Test' : 'New Mill Test'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            {/* ── References ── */}
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO *</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO *" onChange={e => {
                  const v = Number(e.target.value);
                  const po = poList.find((p: any) => (p.id ?? p.ID) === v);
                  setF('FabricPOId', v);
                  setF('Supplier', (po as any)?.sub || form.Supplier);
                }}>
                  <MenuItem value=""><em>Select a Fabric PO...</em></MenuItem>
                  {poList.map((p: any) => <MenuItem key={p.id ?? p.ID} value={p.id ?? p.ID}>{p.label || (p.fabricPONumber ?? p.FabricPONumber)}{(p as any)?.sub ? ` — ${(p as any).sub}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label || (f.fgpoNumber ?? f.FGPONumber)}{(f as any)?.sub ? ` — ${(f as any).sub}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* ── General Info ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">General Information</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Supplier" value={form.Supplier} disabled />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Lot Number *" value={form.LotNumber} onChange={e => setF('LotNumber', e.target.value)} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Color" value={form.Color} onChange={e => setF('Color', e.target.value)} />
            </Grid>

            {/* ── Physical Measurements ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Physical Measurements</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Roll Quantity" type="number" value={form.RollQty || ''} onChange={e => setF('RollQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Actual Width" type="number" value={form.ActualWidth || ''} onChange={e => setF('ActualWidth', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Actual GSM" type="number" value={form.ActualGSM || ''} onChange={e => setF('ActualGSM', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Colorfastness" value={form.Colorfastness} onChange={e => setF('Colorfastness', e.target.value)} />
            </Grid>

            {/* ── Shrinkage & Deformation ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Shrinkage & Deformation (%)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField fullWidth size="small" label="Length Shrinkage" type="number" value={form.LengthShrinkagePercentage || ''} onChange={e => setF('LengthShrinkagePercentage', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField fullWidth size="small" label="Width Shrinkage" type="number" value={form.WidthShrinkagePercentage || ''} onChange={e => setF('WidthShrinkagePercentage', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField fullWidth size="small" label="Torque" type="number" value={form.TorquePercentage || ''} onChange={e => setF('TorquePercentage', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField fullWidth size="small" label="Bowing" type="number" value={form.BowingPercentage || ''} onChange={e => setF('BowingPercentage', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField fullWidth size="small" label="Skewing" type="number" value={form.SkewingPercentage || ''} onChange={e => setF('SkewingPercentage', Number(e.target.value))} />
            </Grid>

            {/* ── Appearance & Result ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Appearance & Result</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Wash Appearance" value={form.WashAppearance} onChange={e => setF('WashAppearance', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Hand Feel" value={form.HandFeel} onChange={e => setF('HandFeel', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Test Date *" type="date" value={form.TestDate} onChange={e => setF('TestDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tested By</InputLabel>
                <Select value={form.TestedByUserId || ''} label="Tested By" onChange={e => setF('TestedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Test Result</InputLabel>
                <Select value={form.TestResult} label="Test Result" onChange={e => setF('TestResult', e.target.value)}>
                  {TEST_RESULTS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControlLabel control={<Checkbox checked={form.ApprovedForExport} onChange={e => setF('ApprovedForExport', e.target.checked)} />} label="Approved for Export" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Report Link (URL)" value={form.ReportLink} onChange={e => setF('ReportLink', e.target.value)} placeholder="https://..." />
            </Grid>

            {/* ── Comments ── */}
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Comments / Notes" value={form.Comments} onChange={e => setF('Comments', e.target.value)} multiline rows={3} />
            </Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Mill Test Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{viewItem.supplier || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot Number / Color</Typography><Typography>{viewItem.lotNumber || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Roll Quantity</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.rollQty}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Actual Width</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.actualWidth}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Actual GSM</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.actualGSM}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 12 }}><Typography variant="subtitle2">Shrinkage & Deformation</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Length Shrinkage</Typography><Typography>{viewItem.lengthShrinkagePercentage}%</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Width Shrinkage</Typography><Typography>{viewItem.widthShrinkagePercentage}%</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Torque</Typography><Typography>{viewItem.torquePercentage}%</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Bowing</Typography><Typography>{viewItem.bowingPercentage}%</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Skewing</Typography><Typography>{viewItem.skewingPercentage}%</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Colorfastness</Typography><Typography>{viewItem.colorfastness || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Wash Appearance</Typography><Typography>{viewItem.washAppearance || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Hand Feel</Typography><Typography>{viewItem.handFeel || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Test Date</Typography><Typography>{fmt(viewItem.testDate)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Tested By</Typography><Typography>{viewItem.testedBy || '-'}</Typography></Grid>
              <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">Test Result</Typography><Chip label={viewItem.testResult} size="small" color={trc(viewItem.testResult ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Approved for Export</Typography><Chip label={viewItem.approvedForExport ? 'Yes' : 'No'} size="small" color={viewItem.approvedForExport ? 'success' : 'default'} /></Grid>
              {viewItem.reportLink && <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary">Report Link</Typography><Typography><a href={viewItem.reportLink} target="_blank" rel="noreferrer">{viewItem.reportLink}</a></Typography></Grid>}
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default MillTestPage;
