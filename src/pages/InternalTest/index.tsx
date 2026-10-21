import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useInternalTests } from '../../hooks/internalTests/useInternalTests';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useCatalogs } from '../../hooks/catalogs/useCatalogs';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { InternalTest } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const sc = (s: string) => {
  const m: Record<string, any> = { Passed: 'success', Failed: 'error', Pending: 'default', 'Conditionally Passed': 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  TestDate: new Date().toISOString().split('T')[0],
  FabricPOId: 0, FGPOId: 0, Supplier: '', LotNumber: '', Color: '',
  ActualWidth: 0, SpecimenAreaCm2: 100,
  WeightBeforeG: 0, WeightAfterG: 0, TargetGSM: 0,
  LengthBefore: 0, LengthAfter: 0, WidthBefore: 0, WidthAfter: 0,
  TorquePct: 0, BowingPct: 0, SkewingPct: 0,
  ShadeResult: '', WashAppearance: '', HandFeel: '',
  TestResult: 'Pending', TestedByUserId: 0, ApprovedByUserId: 0, ReportLink: '', Comments: '',
};

const InternalTestPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useInternalTests();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<InternalTest | null>(null);
  const [formError, setFormError] = useState('');

  const { options: poList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const RESULT_OPTIONS = catalogs['TestResult']?.length ? catalogs['TestResult'] : ['Pending', 'Testing', 'Passed', 'Conditionally Passed', 'Failed'];

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: InternalTest) => {
    setEditingId(item.id);
    setForm({
      TestDate: item.testDate?.split('T')[0] || '',
      FabricPOId: item.fabricPOId, FGPOId: item.fgpoId, Supplier: item.supplier ?? '',
      LotNumber: item.lotNumber ?? '', Color: item.color ?? '',
      ActualWidth: item.actualWidth, SpecimenAreaCm2: item.specimenAreaCm2,
      WeightBeforeG: item.weightBeforeG, WeightAfterG: item.weightAfterG, TargetGSM: item.targetGSM,
      LengthBefore: item.lengthBefore, LengthAfter: item.lengthAfter,
      WidthBefore: item.widthBefore, WidthAfter: item.widthAfter,
      TorquePct: item.torquePct, BowingPct: item.bowingPct, SkewingPct: item.skewingPct,
      ShadeResult: item.shadeResult ?? '', WashAppearance: item.washAppearance ?? '',
      HandFeel: item.handFeel ?? '', TestResult: item.testResult || 'Pending',
      TestedByUserId: userList.find(o => o.label === item.testedBy)?.id ?? 0, ApprovedByUserId: userList.find(o => o.label === item.approvedBy)?.id ?? 0,
      ReportLink: item.reportLink ?? '', Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this test?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FabricPOId || !form.FGPOId) { setFormError('Fabric PO and FGPO are required.'); return; }
    if (form.TargetGSM <= 0) { setFormError('Target GSM must be greater than 0.'); return; }
    const negField = firstNegativeField([
      { name: 'Actual Width', value: form.ActualWidth },
      { name: 'Specimen Area', value: form.SpecimenAreaCm2 },
      { name: 'Weight Before', value: form.WeightBeforeG },
      { name: 'Weight After', value: form.WeightAfterG },
      { name: 'Length Before', value: form.LengthBefore },
      { name: 'Length After', value: form.LengthAfter },
      { name: 'Width Before', value: form.WidthBefore },
      { name: 'Width After', value: form.WidthAfter },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        TestedByUserId: form.TestedByUserId || null,
        ApprovedByUserId: form.ApprovedByUserId || null,
        TestDate: form.TestDate ? new Date(form.TestDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const num = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const pct = (v: number) => `${Number(v).toFixed(2)}%`;
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Internal Test
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Pruebas de laboratorio: GSM, encogimiento, torque, bowing/skewing (calculado automáticamente)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Test</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Lot, Color, PO, FGPO, Result..."
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
                {['Date', 'Fabric PO', 'FGPO', 'Lot', 'Color', 'GSM Before', 'GSM After', 'GSM Var', 'Length Shr.', 'Width Shr.', 'Torque', 'Result', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No tests found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first test</Button>
                </TableCell></TableRow>
              ) : items.map((item: InternalTest) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.testDate)}</TableCell>
                  <TableCell>{item.fabricPONumber}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.lotNumber || '-'}</TableCell>
                  <TableCell>{item.color || '-'}</TableCell>
                  <TableCell>{num(item.gsmBefore)}</TableCell>
                  <TableCell>{num(item.gsmAfter)}</TableCell>
                  <TableCell>
                    <Chip label={pct(item.gsmVariancePct)} size="small"
                      color={Math.abs(item.gsmVariancePct) > 5 ? 'error' : 'success'} />
                  </TableCell>
                  <TableCell>{pct(item.lengthShrinkagePct)}</TableCell>
                  <TableCell>{pct(item.widthShrinkagePct)}</TableCell>
                  <TableCell>{pct(item.torquePct)}</TableCell>
                  <TableCell><Chip label={item.testResult || 'N/A'} size="small" color={sc(item.testResult ?? '')} variant="outlined" /></TableCell>
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
          {editingId ? 'Edit Test' : 'New Test'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO *</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO *" onChange={e => {
                  const v = Number(e.target.value);
                  const po = poList.find((p: any) => (p.id ?? p.ID) === v);
                  setF('FabricPOId', v);
                  setF('Supplier', (po as any)?.sub || form.Supplier);
                }}>
                  <MenuItem value=""><em>Select a Fabric PO...</em></MenuItem>
                  {poList.map((p: any) => <MenuItem key={p.id ?? p.ID} value={p.id ?? p.ID}>{p.label}{(p as any)?.sub ? ` — ${(p as any).sub}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Test Date *" type="date" value={form.TestDate} onChange={e => setF('TestDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Supplier" value={form.Supplier} disabled /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot Number" value={form.LotNumber} onChange={e => setF('LotNumber', e.target.value)} placeholder="LOT-MILL-001 (auto)" /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Color" value={form.Color} onChange={e => setF('Color', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Muestra & GSM</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Actual Width (in)" type="number" value={form.ActualWidth || ''} onChange={e => setF('ActualWidth', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Specimen Area (cm²)" type="number" value={form.SpecimenAreaCm2 || ''} onChange={e => setF('SpecimenAreaCm2', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Weight Before (g)" type="number" value={form.WeightBeforeG || ''} onChange={e => setF('WeightBeforeG', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Weight After (g)" type="number" value={form.WeightAfterG || ''} onChange={e => setF('WeightAfterG', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Target GSM *" type="number" value={form.TargetGSM || ''} onChange={e => setF('TargetGSM', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Encogimiento (Length / Width)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Length Before" type="number" value={form.LengthBefore || ''} onChange={e => setF('LengthBefore', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Length After" type="number" value={form.LengthAfter || ''} onChange={e => setF('LengthAfter', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Width Before" type="number" value={form.WidthBefore || ''} onChange={e => setF('WidthBefore', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Width After" type="number" value={form.WidthAfter || ''} onChange={e => setF('WidthAfter', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Propiedades Dimensionales (%)</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Torque %" type="number" value={form.TorquePct || ''} onChange={e => setF('TorquePct', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Bowing %" type="number" value={form.BowingPct || ''} onChange={e => setF('BowingPct', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Skewing %" type="number" value={form.SkewingPct || ''} onChange={e => setF('SkewingPct', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Resultados</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Shade Result" value={form.ShadeResult} onChange={e => setF('ShadeResult', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Wash Appearance" value={form.WashAppearance} onChange={e => setF('WashAppearance', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Hand Feel" value={form.HandFeel} onChange={e => setF('HandFeel', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small"><InputLabel>Test Result</InputLabel>
                <Select value={form.TestResult} label="Test Result" onChange={e => setF('TestResult', e.target.value)}>
                  {RESULT_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tested By</InputLabel>
                <Select value={form.TestedByUserId || ''} label="Tested By" onChange={e => setF('TestedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Approved By</InputLabel>
                <Select value={form.ApprovedByUserId || ''} label="Approved By" onChange={e => setF('ApprovedByUserId', Number(e.target.value))}>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Test Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Test Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.testDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot / Color</Typography><Typography>{viewItem.lotNumber || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">GSM Before</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.gsmBefore)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">GSM After</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.gsmAfter)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">GSM Variance</Typography><Chip label={pct(viewItem.gsmVariancePct)} size="small" color={Math.abs(viewItem.gsmVariancePct) > 5 ? 'error' : 'success'} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Target GSM</Typography><Typography>{num(viewItem.targetGSM)}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Length Shrinkage</Typography><Typography sx={{ fontWeight: 600 }}>{pct(viewItem.lengthShrinkagePct)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Width Shrinkage</Typography><Typography sx={{ fontWeight: 600 }}>{pct(viewItem.widthShrinkagePct)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Torque</Typography><Typography>{pct(viewItem.torquePct)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Bowing / Skewing</Typography><Typography>{pct(viewItem.bowingPct)} / {pct(viewItem.skewingPct)}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Shade</Typography><Typography>{viewItem.shadeResult || '-'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Wash Appear.</Typography><Typography>{viewItem.washAppearance || '-'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Hand Feel</Typography><Typography>{viewItem.handFeel || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Result</Typography><Chip label={viewItem.testResult} size="small" color={sc(viewItem.testResult ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Tested / Approved</Typography><Typography>{viewItem.testedBy || '-'} / {viewItem.approvedBy || '-'}</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default InternalTestPage;
