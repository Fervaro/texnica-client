import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider, Autocomplete
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import AllInboxIcon from '@mui/icons-material/AllInbox';
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
import { fabricReceivingsApi, rollReceivingsApi, fabricShipmentsApi, fabricShipmentLotsApi } from '../../utils/api';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';
import ReceivingRollsDialog from '../../components/ReceivingRollsDialog';
import { RollGridTable, newRollRow, validateRollRows, buildRollsPayload } from '../../components/RollBulkGrid';
import type { RollRowDraft } from '../../components/RollBulkGrid';

const DEFAULT_STATUSES = ['Pending', 'Partially Received', 'Fully Received', 'Quantity Difference', 'Rejected'];
const ROLL_CONDITIONS = ['Good', 'Damaged', 'Second Quality', 'Sample'];
const ROLL_SHADES = ['A', 'B', 'C', 'D'];

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
    items, loading, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    remove,
  } = useFabricReceivings();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FabricReceiving | null>(null);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [rollRows, setRollRows] = useState<RollRowDraft[]>([]);
  const [rollsDialog, setRollsDialog] = useState<{ id: number; number: string } | null>(null);

  const { options: poList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const STATUS_OPTIONS = catalogs['ReceivingStatus']?.length ? catalogs['ReceivingStatus'] : DEFAULT_STATUSES;

  const [form, setForm] = useState(emptyForm);

  const [shipments, setShipments] = useState<any[]>([]);
  useEffect(() => {
    const loadShipments = async () => {
      try {
        const res = await fabricShipmentsApi.getAll();
        setShipments(res.data ?? []);
      } catch { /* silencioso */ }
    };
    loadShipments();
  }, []);
  const shipmentOptions = Array.from(new Set(shipments.map((s: any) => s.shipmentNumber ?? s.ShipmentNumber ?? '').filter(Boolean)));

  const [shipmentLots, setShipmentLots] = useState<{ id: number; lotNumber: string }[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const shipmentLot = shipmentLots.find(l => l.id === selectedLotId) ?? shipmentLots[0] ?? null;

  // Cargar el lote del embarque seleccionado (ese lote es el mismo para los rollos).
  useEffect(() => {
    const num = form.ShipmentNumber;
    if (!num) { setShipmentLots([]); setSelectedLotId(null); return; }
    const s = shipments.find((x: any) => (x.shipmentNumber ?? x.ShipmentNumber ?? '') === num);
    const sid = s ? (s.id ?? s.ID) : 0;
    if (!sid) { setShipmentLots([]); setSelectedLotId(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fabricShipmentLotsApi.getByShipment(sid);
        const lots = (res.data ?? [])
          .filter((l: any) => (l.active ?? l.Active ?? true) !== false)
          .map((l: any) => ({ id: l.id ?? l.ID, lotNumber: l.lotNumber ?? l.LotNumber ?? '' }))
          .filter((l: { lotNumber: string }) => !!l.lotNumber);
        if (cancelled) return;
        setShipmentLots(lots);
        setSelectedLotId(lots[0]?.id ?? null);
      } catch {
        if (!cancelled) { setShipmentLots([]); setSelectedLotId(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [form.ShipmentNumber, shipments]);

  // Al cargar los lotes del embarque, prefill el lote (solo en filas sin lote elegido).
  useEffect(() => {
    const lot = shipmentLots.find(l => l.id === selectedLotId) ?? shipmentLots[0] ?? null;
    setRollRows(prev => prev.map(r => (r.shipmentLotId
      ? r
      : { ...r, shipmentLotId: lot?.id ?? null, lotNumber: lot?.lotNumber ?? '' })));
  }, [shipmentLots, selectedLotId]);

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

  // Prellenar desde Embarques: Shipment Number + Fabric PO / FGPO / Supplier.
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefill, setPrefill] = useState<{ fabricPONumber: string; fgpoNumber: string } | null>(null);
  useEffect(() => {
    const sn = searchParams.get('shipmentNumber');
    if (sn) {
      setEditingId(null);
      setForm({
        ...emptyForm,
        ShipmentNumber: sn,
        Supplier: searchParams.get('supplier') ?? '',
      });
      setPrefill({
        fabricPONumber: searchParams.get('fabricPONumber') ?? '',
        fgpoNumber: searchParams.get('fgpoNumber') ?? '',
      });
      setFormError('');
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolver Fabric PO / FGPO por número cuando las opciones ya cargaron.
  useEffect(() => {
    if (!prefill) return;
    setForm(prev => {
      let next = prev;
      if (prefill.fabricPONumber && !prev.FabricPOId) {
        const po = poList.find((p: any) => p.label === prefill.fabricPONumber);
        if (po) next = { ...next, FabricPOId: po.id, Supplier: next.Supplier || po.sub || '' };
      }
      if (prefill.fgpoNumber && !prev.FGPOId) {
        const fgpo = fgpoList.find((f: any) => f.label === prefill.fgpoNumber);
        if (fgpo) next = { ...next, FGPOId: fgpo.id };
      }
      return next;
    });
  }, [prefill, poList, fgpoList]);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setPrefill(null); setShipmentLots([]); setSelectedLotId(null); setRollRows([]); setDialogOpen(true); };
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
    setFormError(''); setPrefill(null); setShipmentLots([]); setSelectedLotId(null); setRollRows([]); setDialogOpen(true);
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

    if (!editingId) {
      const vErr = validateRollRows(rollRows);
      if (vErr) { setFormError(vErr); return; }
    }

    setFormSaving(true);
    try {
      const payload = {
        ...form,
        FabricPOId: form.FabricPOId || null,
        ReceivedByUserId: form.ReceivedByUserId || null,
        DataOwnerId: form.DataOwnerId || null,
        ReceivingDate: form.ReceivingDate ? new Date(form.ReceivingDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) {
        await fabricReceivingsApi.update(editingId, payload);
      } else {
        const res = await fabricReceivingsApi.create(payload);
        const newId = res.data?.id ?? res.data?.ID;
        if (newId && rollRows.length) {
          await rollReceivingsApi.createBulk(buildRollsPayload(newId, rollRows, form.ReceivingDate, shipmentLot?.id ?? null));
        }
      }
      setDialogOpen(false);
      setRollRows([]);
      await refresh();
      await loadRecTotals();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.response?.data || 'Error saving.');
    } finally {
      setFormSaving(false);
    }
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
          { label: 'Recibido (reportado)', value: recTotals.received.toLocaleString(), color: 'info.main' },
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
                {['Receiving #', 'Shipment', 'Fabric PO', 'FGPO', 'Received', 'Rolls', 'Status', 'Date', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No receiving records found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first receiving</Button>
                </TableCell></TableRow>
              ) : items.map((item: FabricReceiving) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.receivingNumber}</Typography></TableCell>
                  <TableCell>{item.shipmentNumber || '-'}</TableCell>
                  <TableCell>{item.fabricPONumber}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{Number(item.actualReceivedQty).toLocaleString()}</TableCell>
                  <TableCell>{item.receivedRolls}/{item.expectedRolls}</TableCell>
                  <TableCell><Chip label={item.receivingStatus || 'N/A'} size="small" color={sc(item.receivingStatus ?? '')} variant="outlined" /></TableCell>
                  <TableCell>{fmt(item.receivingDate)}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" title="Rollos" onClick={() => setRollsDialog({ id: item.id, number: item.receivingNumber })}><AllInboxIcon fontSize="small" /></IconButton>
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
              <Autocomplete fullWidth size="small" freeSolo
                options={shipmentOptions}
                inputValue={form.ShipmentNumber}
                onInputChange={(_, v) => setF('ShipmentNumber', v)}
                onChange={(_, v) => {
                  const num = typeof v === 'string' ? v : '';
                  if (!num) return;
                  const s = shipments.find((x: any) => (x.shipmentNumber ?? x.ShipmentNumber ?? '') === num);
                  if (!s) return;
                  const poNum = s.fabricPONumber ?? s.FabricPONumber ?? '';
                  const fgpoNum = s.fgpoNumber ?? s.FGPONumber ?? '';
                  const supplier = s.supplier ?? s.Supplier ?? '';
                  const po = poList.find((p: any) => p.label === poNum);
                  const fgpo = fgpoList.find((f: any) => f.label === fgpoNum);
                  setForm(prev => ({
                    ...prev,
                    FabricPOId: po ? po.id : 0,
                    FGPOId: fgpo ? fgpo.id : 0,
                    Supplier: supplier || (po ? (po.sub ?? '') : ''),
                  }));
                }}
                renderInput={(params) => <TextField {...params} label="Shipment Number" placeholder="SHP-2026-001" />}
              />
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
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Actual Received Qty" type="number" value={form.ActualReceivedQty || 0} disabled helperText="Auto: suma de yardas de los rollos" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Received Rolls" type="number" value={form.ReceivedRolls || 0} disabled helperText="Auto: nº de rollos registrados" />
            </Grid>

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

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Rollos</Typography></Divider></Grid>
            {!editingId ? (
              <>
                <Grid size={{ xs: 12 }}>
                  <RollGridTable
                    rows={rollRows}
                    onChange={setRollRows}
                    shadeOptions={ROLL_SHADES}
                    conditionOptions={ROLL_CONDITIONS}
                    autoRollNumber
                    lotOptions={shipmentLots}
                    makeRow={() => newRollRow({ shipmentLotId: shipmentLot?.id ?? null, lotNumber: shipmentLot?.lotNumber ?? '', warehouseLocation: form.WarehouseLocation })}
                  />
                </Grid>
              </>
            ) : (
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2">{form.ReceivedRolls} rollo(s) registrados. Los rollos se gestionan desde el botón "Rollos" de la lista.</Typography>
                  <Button size="small" variant="outlined" onClick={() => setRollsDialog({ id: editingId, number: form.ReceivingNumber })}>
                    Gestionar rollos
                  </Button>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={formSaving} startIcon={formSaving ? <CircularProgress size={18} /> : null}>
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
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Received Qty</Typography><Typography sx={{ fontWeight: 600 }}>{Number(viewItem.actualReceivedQty).toLocaleString()}</Typography></Grid>
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

      <ReceivingRollsDialog
        open={!!rollsDialog}
        onClose={() => setRollsDialog(null)}
        receivingId={rollsDialog?.id ?? 0}
        receivingNumber={rollsDialog?.number ?? ''}
      />
    </Box>
  );
};

export default FabricReceivingPage;
