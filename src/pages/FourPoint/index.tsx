import React, { useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFourPoints } from '../../hooks/fourPoints/useFourPoints';
import { useFabricReceivingOptions } from '../../hooks/fabricReceivings/useFabricReceivingOptions';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { FourPoint } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const sc = (s: string) => {
  const m: Record<string, any> = { Passed: 'success', Failed: 'error', 'On Hold': 'warning' };
  return m[s] ?? 'default';
};

const emptyForm = {
  InspectionDate: new Date().toISOString().split('T')[0],
  ReceivingId: 0, FabricPOId: 0, FGPOId: 0,
  LotNumber: '', RollNumber: '',
  Width: 0, InspectedLength: 0,
  Points1: 0, Points2: 0, Points3: 0, Points4: 0,
  MaxAllowed: 40,
  AcceptedQty: 0, RejectedQty: 0, HoldQty: 0,
  InspectorId: 0, ReportLink: '', Comments: '',
};

const FourPointPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useFourPoints();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FourPoint | null>(null);
  const [formError, setFormError] = useState('');

  const { options: receivingList } = useFabricReceivingOptions();
  const { options: poList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: FourPoint) => {
    setEditingId(item.id);
    setForm({
      InspectionDate: item.inspectionDate?.split('T')[0] || '',
      ReceivingId: item.receivingId ?? 0, FabricPOId: item.fabricPOId, FGPOId: item.fgpoId,
      LotNumber: item.lotNumber ?? '', RollNumber: item.rollNumber ?? '',
      Width: item.width, InspectedLength: item.inspectedLength,
      Points1: item.points1, Points2: item.points2, Points3: item.points3, Points4: item.points4,
      MaxAllowed: item.maxAllowed,
      AcceptedQty: item.acceptedQty, RejectedQty: item.rejectedQty, HoldQty: item.holdQty,
      InspectorId: userList.find(o => o.label === item.inspector)?.id ?? 0, ReportLink: item.reportLink ?? '', Comments: item.comments ?? '',
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
    if (!form.FabricPOId || !form.FGPOId) { setFormError('Fabric PO and FGPO are required.'); return; }
    if (form.Width <= 0 || form.InspectedLength <= 0) { setFormError('Width and Inspected Length must be greater than 0.'); return; }
    const negField = firstNegativeField([
      { name: 'Max Allowed', value: form.MaxAllowed },
      { name: '1-Point', value: form.Points1 },
      { name: '2-Point', value: form.Points2 },
      { name: '3-Point', value: form.Points3 },
      { name: '4-Point', value: form.Points4 },
      { name: 'Accepted Qty', value: form.AcceptedQty },
      { name: 'Rejected Qty', value: form.RejectedQty },
      { name: 'Hold Qty', value: form.HoldQty },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        ReceivingId: form.ReceivingId || null,
        InspectorId: form.InspectorId || null,
        InspectionDate: form.InspectionDate ? new Date(form.InspectionDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const num = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <RuleIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Four-Point
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Inspección de tela por el sistema Four-Point (puntos / 100 yd² automático)
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
          <TextField size="small" placeholder="Search by Roll, Lot, PO, FGPO, Result..."
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
                {['Date', 'Receiving', 'Fabric PO', 'FGPO', 'Roll', 'Length (yd)', 'Width', 'Points', 'Pts/100yd²', 'Max', 'Result', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={12} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No inspections found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first inspection</Button>
                </TableCell></TableRow>
              ) : items.map((item: FourPoint) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.inspectionDate)}</TableCell>
                  <TableCell>{item.receivingNumber || '-'}</TableCell>
                  <TableCell>{item.fabricPONumber}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.rollNumber || '-'}</TableCell>
                  <TableCell>{num(item.inspectedLength)}</TableCell>
                  <TableCell>{num(item.width)}</TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.totalPoints}</Typography></TableCell>
                  <TableCell>
                    <Chip label={num(item.pointsPer100SqYd)} size="small"
                      color={item.pointsPer100SqYd > item.maxAllowed ? 'error' : 'success'} />
                  </TableCell>
                  <TableCell>{num(item.maxAllowed)}</TableCell>
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
                <InputLabel>Receiving (opcional)</InputLabel>
                <Select value={form.ReceivingId || ''} label="Receiving (opcional)" onChange={e => setF('ReceivingId', Number(e.target.value))}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {receivingList.map((r: any) => <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO *</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO *" onChange={e => setF('FabricPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a Fabric PO...</em></MenuItem>
                  {poList.map((p: any) => <MenuItem key={p.id ?? p.ID} value={p.id ?? p.ID}>{p.label}</MenuItem>)}
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Inspection Date *" type="date" value={form.InspectionDate} onChange={e => setF('InspectionDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot Number" value={form.LotNumber} onChange={e => setF('LotNumber', e.target.value)} placeholder="LOT-MILL-001 (auto)" /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Roll Number" value={form.RollNumber} onChange={e => setF('RollNumber', e.target.value)} placeholder="RL-001" /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Medidas Inspeccionadas</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Width (in) *" type="number" value={form.Width || ''} onChange={e => setF('Width', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Inspected Length (yd) *" type="number" value={form.InspectedLength || ''} onChange={e => setF('InspectedLength', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Max Allowed" type="number" value={form.MaxAllowed || ''} onChange={e => setF('MaxAllowed', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inspector</InputLabel>
                <Select value={form.InspectorId || ''} label="Inspector" onChange={e => setF('InspectorId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Defectos por tipo (Four-Point)</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="1-Point" type="number" value={form.Points1 || ''} onChange={e => setF('Points1', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="2-Point" type="number" value={form.Points2 || ''} onChange={e => setF('Points2', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="3-Point" type="number" value={form.Points3 || ''} onChange={e => setF('Points3', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="4-Point" type="number" value={form.Points4 || ''} onChange={e => setF('Points4', Number(e.target.value))} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Cantidades (yd)</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Accepted Qty" type="number" value={form.AcceptedQty || ''} onChange={e => setF('AcceptedQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Rejected Qty" type="number" value={form.RejectedQty || ''} onChange={e => setF('RejectedQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" label="Hold Qty" type="number" value={form.HoldQty || ''} onChange={e => setF('HoldQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
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
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Receiving</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.receivingNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot / Roll</Typography><Typography>{viewItem.lotNumber || '-'} / {viewItem.rollNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Inspector</Typography><Typography>{viewItem.inspector || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Width</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.width)} in</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Length</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.inspectedLength)} yd</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Total Points</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.totalPoints}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Points / 100 yd²</Typography>
                <Chip label={num(viewItem.pointsPer100SqYd)} size="small" color={viewItem.pointsPer100SqYd > viewItem.maxAllowed ? 'error' : 'success'} />
              </Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">1-Point</Typography><Typography>{viewItem.points1}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">2-Point</Typography><Typography>{viewItem.points2}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">3-Point</Typography><Typography>{viewItem.points3}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">4-Point</Typography><Typography>{viewItem.points4}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Accepted</Typography><Typography>{viewItem.acceptedQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Rejected</Typography><Typography>{viewItem.rejectedQty}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 2 }}><Typography variant="caption" color="text.secondary">Hold</Typography><Typography>{viewItem.holdQty}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Result</Typography><Chip label={viewItem.result} size="small" color={sc(viewItem.result ?? '')} /></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default FourPointPage;
