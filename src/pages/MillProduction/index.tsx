import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMillProductions } from '../../hooks/millProductions/useMillProductions';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useCatalogs } from '../../hooks/catalogs/useCatalogs';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { MillProduction } from '../../types';
import { getCurrentUserName } from '../../utils/session';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const DEFAULT_STATUS_OPTIONS = ['Not Started', 'Pending', 'In Progress', 'Partially Completed', 'Completed', 'On Hold', 'Cancelled'];

const sc = (s: string) => {
  const m: Record<string, any> = { Completed: 'success', 'In Progress': 'info', 'Partially Completed': 'primary', Pending: 'warning', 'On Hold': 'warning', Cancelled: 'error' };
  return m[s] ?? 'default';
};

const emptyForm = {
  FabricPOId: 0, FGPOId: 0, Supplier: '', FabricComponent: '', Style: '', Color: '',
  PlannedQuantity: 0, ProducedQuantity: 0, LotNumber: '', RollQuantity: 0,
  YardageOrQty: 0, Weight: 0,
  StartDate: new Date().toISOString().split('T')[0], FinishDate: '',
  PlannedExport: '', ActualExport: '', Status: 'Not Started', DataOwnerId: 0, Remarks: '',
};

const MillProductionPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useMillProductions();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<MillProduction | null>(null);
  const [formError, setFormError] = useState('');

  const { options: poList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const STATUS_OPTIONS = catalogs['ProductionStatus']?.length ? catalogs['ProductionStatus'] : DEFAULT_STATUS_OPTIONS;

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: MillProduction) => {
    setEditingId(item.id);
    setForm({
      FabricPOId: item.fabricPOId, FGPOId: item.fgpoId,
      Supplier: item.supplier ?? '', FabricComponent: item.fabricComponent ?? '',
      Style: item.style ?? '', Color: item.color ?? '',
      PlannedQuantity: item.plannedQuantity, ProducedQuantity: item.producedQuantity,
      LotNumber: item.lotNumber ?? '', RollQuantity: item.rollQuantity,
      YardageOrQty: item.yardageOrQty, Weight: item.weight,
      StartDate: item.startDate?.split('T')[0] || '',
      FinishDate: item.finishDate?.split('T')[0] || '',
      PlannedExport: item.plannedExport?.split('T')[0] || '',
      ActualExport: item.actualExport?.split('T')[0] || '',
      Status: item.status || 'Not Started', DataOwnerId: userList.find(o => o.label === item.dataOwner)?.id ?? 0, Remarks: item.remarks || '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this record?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FabricPOId || !form.FGPOId) { setFormError('Fabric PO and FGPO are required.'); return; }
    if (!form.LotNumber) { setFormError('Lot Number is required.'); return; }
    const negField = firstNegativeField([
      { name: 'Planned Quantity', value: form.PlannedQuantity },
      { name: 'Produced Quantity', value: form.ProducedQuantity },
      { name: 'Roll Quantity', value: form.RollQuantity },
      { name: 'Yardage / Quantity', value: form.YardageOrQty },
      { name: 'Weight', value: form.Weight },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = { ...form, DataOwnerId: form.DataOwnerId || null, FinishDate: form.FinishDate || null, PlannedExport: form.PlannedExport || null, ActualExport: form.ActualExport || null };
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
            <PrecisionManufacturingIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Mill Production
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track production progress by Fabric PO, FGPO, and Lot
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Production Record</Button>
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
                {['Fabric PO', 'FGPO', 'Lot', 'Supplier', 'Planned', 'Produced', '%', 'Status', 'Start', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No production records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first record</Button>
                </TableCell></TableRow>
              ) : items.map((item: MillProduction) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.fabricPONumber}</Typography></TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell><Chip label={item.lotNumber || '-'} size="small" variant="outlined" /></TableCell>
                  <TableCell>{item.supplier || '-'}</TableCell>
                  <TableCell>{Number(item.plannedQuantity).toLocaleString()}</TableCell>
                  <TableCell>{Number(item.producedQuantity).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={`${item.completionPercentage}%`} size="small"
                      color={item.completionPercentage >= 100 ? 'success' : item.completionPercentage > 0 ? 'info' : 'default'} />
                  </TableCell>
                  <TableCell><Chip label={item.status || 'N/A'} size="small" color={sc(item.status ?? '')} variant="outlined" /></TableCell>
                  <TableCell>{fmt(item.startDate)}</TableCell>
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
          {editingId ? 'Edit Mill Production' : 'New Mill Production'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            {/* ── Fabric PO & FGPO ── */}
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO *</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO *" onChange={e => {
                  const v = Number(e.target.value);
                  const po = poList.find((p: any) => (p.id ?? p.ID) === v);
                  setF('FabricPOId', v);
                  setF('Supplier', (po as any)?.sub || form.Supplier);
                  setF('FabricComponent', (po as any)?.meta?.fabricComponent || form.FabricComponent);
                }}>
                  <MenuItem value=""><em>Select a Fabric PO...</em></MenuItem>
                  {poList.map((p: any) => <MenuItem key={p.id ?? p.ID} value={p.id ?? p.ID}>{p.label || (p.fabricPONumber ?? p.FabricPONumber)}{(p as any)?.sub ? ` — ${(p as any).sub}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => {
                  const v = Number(e.target.value);
                  const fg = fgpoList.find((f: any) => (f.id ?? f.ID) === v);
                  setF('FGPOId', v);
                  setF('Style', (fg as any)?.meta?.style || form.Style);
                  setF('Color', (fg as any)?.meta?.color || form.Color);
                }}>
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
              <TextField fullWidth size="small" label="Fabric Component" value={form.FabricComponent} disabled />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Style" value={form.Style} onChange={e => setF('Style', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Color" value={form.Color} onChange={e => setF('Color', e.target.value)} />
            </Grid>

            {/* ── Production Details ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Production Details</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Lot Number *" value={form.LotNumber} onChange={e => setF('LotNumber', e.target.value)} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Planned Quantity" type="number" value={form.PlannedQuantity || ''} onChange={e => setF('PlannedQuantity', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Produced Quantity" type="number" value={form.ProducedQuantity || ''} onChange={e => setF('ProducedQuantity', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Roll Quantity" type="number" value={form.RollQuantity || ''} onChange={e => setF('RollQuantity', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Yardage / Quantity" type="number" value={form.YardageOrQty || ''} onChange={e => setF('YardageOrQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Weight" type="number" value={form.Weight || ''} onChange={e => setF('Weight', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
            </Grid>

            {/* ── Dates & Status ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Dates & Status</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Start Date *" type="date" value={form.StartDate} onChange={e => setF('StartDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Finish Date" type="date" value={form.FinishDate} onChange={e => setF('FinishDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Planned Export" type="date" value={form.PlannedExport} onChange={e => setF('PlannedExport', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Actual Export" type="date" value={form.ActualExport} onChange={e => setF('ActualExport', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Status</InputLabel>
                <Select value={form.Status} label="Status" onChange={e => setF('Status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
            </Grid>

            {/* ── Remarks ── */}
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Remarks / Notes" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} multiline rows={3} />
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
        <DialogTitle sx={{ fontWeight: 700 }}>Mill Production Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{viewItem.supplier || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric Component</Typography><Typography>{viewItem.fabricComponent || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot Number</Typography><Chip label={viewItem.lotNumber} size="small" variant="outlined" /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Planned Quantity</Typography><Typography sx={{ fontWeight: 600 }}>{Number(viewItem.plannedQuantity).toLocaleString()}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Produced Quantity</Typography><Typography sx={{ fontWeight: 600 }}>{Number(viewItem.producedQuantity).toLocaleString()}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Completion %</Typography><Chip label={`${viewItem.completionPercentage}%`} size="small" color={viewItem.completionPercentage >= 100 ? 'success' : 'info'} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Roll Quantity</Typography><Typography>{viewItem.rollQuantity}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Yardage / Quantity</Typography><Typography>{viewItem.yardageOrQty}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Weight</Typography><Typography>{viewItem.weight}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Start Date</Typography><Typography>{fmt(viewItem.startDate)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Finish Date</Typography><Typography>{fmt(viewItem.finishDate)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Planned Export</Typography><Typography>{fmt(viewItem.plannedExport)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Actual Export</Typography><Typography>{fmt(viewItem.actualExport)}</Typography></Grid>
              <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.status} size="small" color={sc(viewItem.status ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Data Owner</Typography><Typography>{viewItem.dataOwner || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default MillProductionPage;
