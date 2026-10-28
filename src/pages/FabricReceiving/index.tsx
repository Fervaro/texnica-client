import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFabricReceivings } from '../../hooks/fabricReceivings/useFabricReceivings';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useCatalogs } from '../../hooks/catalogs/useCatalogs';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { FabricReceiving } from '../../types';
import { getCurrentUserName } from '../../utils/session';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps, nonNegativeIntegerInputProps } from '../../utils/validation';
import { fabricReceivingsApi } from '../../utils/api';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';

const DEFAULT_STATUSES = ['Pending', 'Partially Received', 'Fully Received', 'Quantity Difference', 'Rejected'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    'Fully Received': 'success', 'Partially Received': 'warning',
    Pending: 'default', 'Quantity Difference': 'error', Rejected: 'error',
  };
  return m[s] ?? 'default';
};

const emptyForm = {
  ReceivingNumber: '', ReceivingDate: new Date().toISOString().split('T')[0],
  ShipmentNumber: '', FabricPOId: 0, FGPOId: 0, Supplier: '',
  PackingListQty: 0, ActualReceivedQty: 0, ExpectedRolls: 0, ReceivedRolls: 0,
  ReceivingStatus: 'Pending', WarehouseLocation: '', ReceivedByUserId: 0, DataOwnerId: 0, Remarks: '',
};

const FabricReceivingPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useFabricReceivings();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FabricReceiving | null>(null);
  const [formError, setFormError] = useState('');

  const { options: poList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const STATUS_OPTIONS = catalogs['ReceivingStatus']?.length ? catalogs['ReceivingStatus'] : DEFAULT_STATUSES;

  const [form, setForm] = useState(emptyForm);

  const [recTotals, setRecTotals] = useState({ declared: 0, received: 0, variance: 0, count: 0 });
  const [totalsError, setTotalsError] = useState('');
  const loadRecTotals = async () => {
    setTotalsError('');
    try {
      const res = await fabricReceivingsApi.getTotals();
      const t = res.data ?? {};
      setRecTotals({
        declared: t.declaredYards ?? t.DeclaredYards ?? 0,
        received: t.receivedYards ?? t.ReceivedYards ?? 0,
        variance: t.varianceYards ?? t.VarianceYards ?? 0,
        count: t.receivingsCount ?? t.ReceivingsCount ?? 0,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      setTotalsError(status ? `Error ${status} al cargar los totales de recepciones.` : 'No se pudieron cargar los totales de recepciones.');
    }
  };
  useEffect(() => { loadRecTotals(); }, []);

  // Prellenar Shipment Number si venimos redirigidos desde Embarques (rollos).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const sn = searchParams.get('shipmentNumber');
    if (sn) {
      setEditingId(null);
      setForm({ ...emptyForm, ShipmentNumber: sn });
      setFormError('');
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: FabricReceiving) => {
    setEditingId(item.id);
    setForm({
      ReceivingNumber: item.receivingNumber, ReceivingDate: item.receivingDate?.split('T')[0] || '',
      ShipmentNumber: item.shipmentNumber ?? '', FabricPOId: item.fabricPOId ?? 0, FGPOId: item.fgpoId,
      Supplier: item.supplier ?? '',
      PackingListQty: item.packingListQty, ActualReceivedQty: item.actualReceivedQty,
      ExpectedRolls: item.expectedRolls, ReceivedRolls: item.receivedRolls,
      ReceivingStatus: item.receivingStatus || 'Pending',
      WarehouseLocation: item.warehouseLocation ?? '', ReceivedByUserId: userList.find(o => o.label === item.receivedBy)?.id ?? 0,
      DataOwnerId: userList.find(o => o.label === item.dataOwner)?.id ?? 0, Remarks: item.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this receiving record?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.ReceivingNumber) { setFormError('Receiving Number is required.'); return; }
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    const negField = firstNegativeField([
      { name: 'Packing List Qty', value: form.PackingListQty },
      { name: 'Actual Received Qty', value: form.ActualReceivedQty },
      { name: 'Expected Rolls', value: form.ExpectedRolls },
      { name: 'Received Rolls', value: form.ReceivedRolls },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        FabricPOId: form.FabricPOId || null,
        ReceivedByUserId: form.ReceivedByUserId || null,
        DataOwnerId: form.DataOwnerId || null,
        ReceivingDate: form.ReceivingDate ? new Date(form.ReceivingDate).toISOString() : new Date().toISOString(),
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
            <MoveToInboxIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Fabric Receiving
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Recepción de tela al llegar el contenedor (varianzas automáticas)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Receiving</Button>
        </Box>
      </Box>

      {totalsError && <Alert severity="warning" sx={{ mb: 1 }}>{totalsError}</Alert>}
      <ModuleTotalsBar
        suffix="yd"
        items={[
          { label: 'Declarado', value: recTotals.declared.toLocaleString(), color: 'primary.main' },
          { label: 'Recibido (reportado)', value: recTotals.received.toLocaleString(), color: 'info.main' },
          { label: 'Diferencia', value: recTotals.variance.toLocaleString(), color: 'warning.main' },
          { label: 'Recepciones', value: recTotals.count.toLocaleString(), color: 'text.disabled', suffix: '' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Receiving, Shipment, Supplier..."
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
                {['Receiving #', 'Shipment', 'Fabric PO', 'FGPO', 'Packing Qty', 'Received', 'Variance', 'Rolls', 'Status', 'Date', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No receiving records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first receiving</Button>
                </TableCell></TableRow>
              ) : items.map((item: FabricReceiving) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.receivingNumber}</Typography></TableCell>
                  <TableCell>{item.shipmentNumber || '-'}</TableCell>
                  <TableCell>{item.fabricPONumber}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{Number(item.packingListQty).toLocaleString()}</TableCell>
                  <TableCell>{Number(item.actualReceivedQty).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={Number(item.receivingVariance).toLocaleString()} size="small"
                      color={item.receivingVariance < 0 ? 'error' : item.receivingVariance > 0 ? 'warning' : 'success'} />
                  </TableCell>
                  <TableCell>{item.receivedRolls}/{item.expectedRolls}</TableCell>
                  <TableCell><Chip label={item.receivingStatus || 'N/A'} size="small" color={sc(item.receivingStatus ?? '')} variant="outlined" /></TableCell>
                  <TableCell>{fmt(item.receivingDate)}</TableCell>
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
          {editingId ? 'Edit Fabric Receiving' : 'New Fabric Receiving'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Receiving Number *" value={form.ReceivingNumber} onChange={e => setF('ReceivingNumber', e.target.value)} required placeholder="RCV-2026-001" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Shipment Number" value={form.ShipmentNumber} onChange={e => setF('ShipmentNumber', e.target.value)} placeholder="SHP-2026-001" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Receiving Date *" type="date" value={form.ReceivingDate} onChange={e => setF('ReceivingDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO (opcional)</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO (opcional)" onChange={e => {
                  const v = Number(e.target.value);
                  const po = poList.find((p: any) => (p.id ?? p.ID) === v);
                  setF('FabricPOId', v);
                  setF('Supplier', (po as any)?.sub || '');
                }}>
                  <MenuItem value=""><em>Sin Fabric PO (tela del cliente)</em></MenuItem>
                  {poList.map((p: any) => <MenuItem key={p.id ?? p.ID} value={p.id ?? p.ID}>{p.label}{(p as any)?.sub ? ` — ${(p as any).sub}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Supplier" value={form.Supplier} onChange={e => setF('Supplier', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Cantidades</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Packing List Qty *" type="number" value={form.PackingListQty || ''} onChange={e => setF('PackingListQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Actual Received Qty *" type="number" value={form.ActualReceivedQty || ''} onChange={e => setF('ActualReceivedQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Expected Rolls" type="number" value={form.ExpectedRolls || ''} onChange={e => setF('ExpectedRolls', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeIntegerInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Received Rolls" type="number" value={form.ReceivedRolls || ''} onChange={e => setF('ReceivedRolls', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeIntegerInputProps }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Estado & Ubicación</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Receiving Status</InputLabel>
                <Select value={form.ReceivingStatus} label="Receiving Status" onChange={e => setF('ReceivingStatus', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Warehouse Location" value={form.WarehouseLocation} onChange={e => setF('WarehouseLocation', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Received By</InputLabel>
                <Select value={form.ReceivedByUserId || ''} label="Received By" onChange={e => setF('ReceivedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Remarks / Notes" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} multiline rows={2} /></Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Receiving Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Receiving Number</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.receivingNumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Shipment</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.shipmentNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{viewItem.supplier || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Receiving Date</Typography><Typography>{fmt(viewItem.receivingDate)}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Packing List Qty</Typography><Typography sx={{ fontWeight: 600 }}>{Number(viewItem.packingListQty).toLocaleString()}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Received Qty</Typography><Typography sx={{ fontWeight: 600 }}>{Number(viewItem.actualReceivedQty).toLocaleString()}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Variance</Typography><Chip label={Number(viewItem.receivingVariance).toLocaleString()} size="small" color={viewItem.receivingVariance < 0 ? 'error' : viewItem.receivingVariance > 0 ? 'warning' : 'success'} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shortage</Typography><Chip label={Number(viewItem.receivingShortage).toLocaleString()} size="small" color={viewItem.receivingShortage > 0 ? 'error' : 'success'} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Over Qty</Typography><Chip label={Number(viewItem.receivingOverQty).toLocaleString()} size="small" color={viewItem.receivingOverQty > 0 ? 'warning' : 'success'} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Rolls (received/expected)</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.receivedRolls}/{viewItem.expectedRolls}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Missing Rolls</Typography><Chip label={viewItem.missingRolls} size="small" color={viewItem.missingRolls > 0 ? 'error' : 'success'} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.receivingStatus} size="small" color={sc(viewItem.receivingStatus ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Warehouse</Typography><Typography>{viewItem.warehouseLocation || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><Typography variant="caption" color="text.secondary">Received By</Typography><Typography>{viewItem.receivedBy || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default FabricReceivingPage;
