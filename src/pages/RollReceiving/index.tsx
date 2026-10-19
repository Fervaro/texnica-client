import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useRollReceivings } from '../../hooks/rollReceivings/useRollReceivings';
import { useFabricReceivingOptions, FabricReceivingOption } from '../../hooks/fabricReceivings/useFabricReceivingOptions';
import { useCatalogs } from '../../hooks/catalogs/useCatalogs';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { fabricMovementsApi } from '../../utils/api';
import { RollReceiving, RollBalance } from '../../types';
import { getCurrentUserName } from '../../utils/session';

const DEFAULT_CONDITIONS = ['Good', 'Damaged', 'Second Quality', 'Sample'];
const DEFAULT_SHADE_GROUPS = ['A', 'B', 'C', 'D'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    Good: 'success', Damaged: 'error', 'Second Quality': 'warning', Sample: 'info',
  };
  return m[s] ?? 'default';
};

const emptyForm = {
  ReceivingId: 0,
  LotNumber: '', RollNumber: '', SupplierRollNumber: '',
  GrossWeight: 0, NetWeight: 0, ActualYardage: 0, ActualWidth: 0, ActualGSM: 0,
  ShadeGroup: '', DamagedQty: 0, Condition: 'Good',
  WarehouseLocation: '', ReceivedDate: new Date().toISOString().split('T')[0],
  DataOwnerId: 0, Comments: '',
};

const RollReceivingPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useRollReceivings();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<RollReceiving | null>(null);
  const [formError, setFormError] = useState('');

  const { options: receivingList } = useFabricReceivingOptions();
  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const [balances, setBalances] = useState<RollBalance[]>([]);
  const [balancesError, setBalancesError] = useState('');

  useEffect(() => {
    fabricMovementsApi.getBalances()
      .then(res => { setBalances(res.data ?? []); setBalancesError(''); })
      .catch((err: any) => setBalancesError(err?.response?.data?.message || err?.message || 'No se pudieron cargar los saldos de rollos.'));
  }, []);
  const CONDITION_OPTIONS = catalogs['RollCondition']?.length ? catalogs['RollCondition'] : DEFAULT_CONDITIONS;
  const SHADE_OPTIONS = catalogs['ShadeGroup']?.length ? catalogs['ShadeGroup'] : DEFAULT_SHADE_GROUPS;

  const [form, setForm] = useState(emptyForm);

  // Info heredada del Fabric Receiving seleccionado (solo lectura)
  const selectedReceiving = receivingList.find((r: FabricReceivingOption) => (r.id ?? 0) === form.ReceivingId);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: RollReceiving) => {
    setEditingId(item.id);
    setForm({
      ReceivingId: item.receivingId,
      LotNumber: item.lotNumber ?? '',
      RollNumber: item.rollNumber ?? '', SupplierRollNumber: item.supplierRollNumber ?? '',
      GrossWeight: item.grossWeight, NetWeight: item.netWeight,
      ActualYardage: item.actualYardage, ActualWidth: item.actualWidth, ActualGSM: item.actualGSM,
      ShadeGroup: item.shadeGroup ?? '', DamagedQty: item.damagedQty,
      Condition: item.condition || 'Good',
      WarehouseLocation: item.warehouseLocation ?? '',
      ReceivedDate: item.receivedDate?.split('T')[0] || '',
      DataOwnerId: userList.find(o => o.label === item.dataOwner)?.id ?? 0, Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this roll?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  // Al elegir un Fabric Receiving, auto-rellenar los defaults heredados
  const handleReceivingChange = (v: number) => {
    const rec = receivingList.find((r: FabricReceivingOption) => (r.id ?? 0) === v);
    setForm(prev => ({
      ...prev,
      ReceivingId: v,
      // Solo auto-rellenar si el usuario aún no escribió nada en esos campos
      WarehouseLocation: prev.WarehouseLocation || rec?.warehouseLocation || '',
      ReceivedDate: prev.ReceivedDate || rec?.receivingDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      DataOwnerId: prev.DataOwnerId || rec?.dataOwnerId || (rec?.dataOwner ? (userList.find(o => o.label === rec?.dataOwner)?.id ?? 0) : 0),
    }));
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.ReceivingId) { setFormError('Fabric Receiving is required.'); return; }
    if (!form.RollNumber) { setFormError('Roll Number is required.'); return; }
    try {
      const payload = {
        ...form,
        DataOwnerId: form.DataOwnerId || null,
        // El backend deriva FabricPO/FGPO/Supplier/Color desde el receiving
        ReceivedDate: form.ReceivedDate ? new Date(form.ReceivedDate).toISOString() : new Date().toISOString(),
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
            <AllInboxIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Roll Receiving
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Detalle de rollos recibidos — hereda PO/FGPO/Proveedor del Fabric Receiving
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Roll</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {balancesError && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setBalancesError('')}>{balancesError}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Roll, Lot, Supplier, Shade..."
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
                {['Roll #', 'Receiving', 'Fabric PO', 'FGPO', 'Lot', 'Físico', 'Reservado', 'Disp.', 'Yardage', 'Net Wt', 'Shade', 'Condition', 'Date', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={14} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={14} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No rolls found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Register your first roll</Button>
                </TableCell></TableRow>
              ) : items.map((item: RollReceiving) => {
                const bal = balances.find(b => b.rollReceivingId === item.id);
                return (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.rollNumber || '-'}</Typography></TableCell>
                  <TableCell>{item.receivingNumber}</TableCell>
                  <TableCell>{item.fabricPONumber}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.lotNumber || '-'}</TableCell>
                  <TableCell>{bal ? num(bal.physicalQuantity) : '-'}</TableCell>
                  <TableCell>{bal ? num(bal.reservedQuantity) : '-'}</TableCell>
                  <TableCell><Typography sx={{ fontWeight: 600 }}>{bal ? num(bal.availableQuantity) : '-'}</Typography></TableCell>
                  <TableCell>{num(item.actualYardage)}</TableCell>
                  <TableCell>{num(item.netWeight)}</TableCell>
                  <TableCell>{item.shadeGroup || '-'}</TableCell>
                  <TableCell><Chip label={item.condition || 'N/A'} size="small" color={sc(item.condition ?? '')} variant="outlined" /></TableCell>
                  <TableCell>{fmt(item.receivedDate)}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(item); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
                );
              })}
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
          {editingId ? 'Edit Roll' : 'New Roll'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>Fabric Receiving</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric Receiving *</InputLabel>
                <Select value={form.ReceivingId || ''} label="Fabric Receiving *" onChange={e => handleReceivingChange(Number(e.target.value))}>
                  <MenuItem value=""><em>Select a Receiving...</em></MenuItem>
                  {receivingList.map((r: FabricReceivingOption) => <MenuItem key={r.id} value={r.id}>{r.label}{r.supplier ? ` — ${r.supplier}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Received Date *" type="date" value={form.ReceivedDate} onChange={e => setF('ReceivedDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>

            {/* Info heredada del Fabric Receiving (solo lectura) */}
            {selectedReceiving && (
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <InfoOutlinedIcon fontSize="inherit" /> Heredado del Fabric Receiving (no editable)
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.fabricPONumber || '-'}</Typography></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.fgpoNumber || '-'} {selectedReceiving.customerName ? `(${selectedReceiving.customerName})` : ''}</Typography></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.supplier || '-'}</Typography></Grid>
                    <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Warehouse (default)</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.warehouseLocation || '-'}</Typography></Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Identificación del Rollo</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Roll Number *" value={form.RollNumber} onChange={e => setF('RollNumber', e.target.value)} placeholder="RL-001" /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Supplier Roll #" value={form.SupplierRollNumber} onChange={e => setF('SupplierRollNumber', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Lot Number" value={form.LotNumber} onChange={e => setF('LotNumber', e.target.value)} placeholder="LOT-MILL-001 (auto)" /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Medidas & Pesos</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Gross Weight" type="number" value={form.GrossWeight || ''} onChange={e => setF('GrossWeight', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Net Weight" type="number" value={form.NetWeight || ''} onChange={e => setF('NetWeight', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Actual Yardage" type="number" value={form.ActualYardage || ''} onChange={e => setF('ActualYardage', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Actual Width" type="number" value={form.ActualWidth || ''} onChange={e => setF('ActualWidth', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Actual GSM" type="number" value={form.ActualGSM || ''} onChange={e => setF('ActualGSM', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Shade Group</InputLabel>
                <Select value={form.ShadeGroup} label="Shade Group" onChange={e => setF('ShadeGroup', e.target.value)}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {SHADE_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Damaged Qty" type="number" value={form.DamagedQty || ''} onChange={e => setF('DamagedQty', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Condition</InputLabel>
                <Select value={form.Condition} label="Condition" onChange={e => setF('Condition', e.target.value)}>
                  {CONDITION_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Almacén & Notas</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Warehouse Location" value={form.WarehouseLocation} onChange={e => setF('WarehouseLocation', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
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
        <DialogTitle sx={{ fontWeight: 700 }}>Roll Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Roll Number</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.rollNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Receiving</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.receivingNumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{viewItem.supplier || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Lot</Typography><Typography>{viewItem.lotNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Gross Wt</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.grossWeight)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Net Wt</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.netWeight)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Yardage</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.actualYardage)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Width / GSM</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.actualWidth)} / {num(viewItem.actualGSM)}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shade</Typography><Typography>{viewItem.shadeGroup || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Condition</Typography><Chip label={viewItem.condition || 'N/A'} size="small" color={sc(viewItem.condition ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Damaged Qty</Typography><Typography>{num(viewItem.damagedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Warehouse</Typography><Typography>{viewItem.warehouseLocation || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Received Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.receivedDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Data Owner</Typography><Typography>{viewItem.dataOwner || '-'}</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default RollReceivingPage;
