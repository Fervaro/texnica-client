import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import { useFabricShipments } from '../../hooks/fabricShipments/useFabricShipments';
import { useCatalogs } from '../../hooks/catalogs/useCatalogs';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { useStyleOptions } from '../../hooks/styles/useStyleOptions';
import { useColorOptions } from '../../hooks/colors/useColorOptions';
import { FabricShipment, FabricShipmentLot } from '../../types';
import { fabricShipmentLotsApi, fabricShipmentsApi, rollReceivingsApi } from '../../utils/api';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';
import { getCurrentUserName } from '../../utils/session';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const DEFAULT_SHIPMENT_STATUSES = ['Planned', 'Booking Confirmed', 'Exported', 'In Transit', 'Delivered', 'Cancelled'];
const DEFAULT_UOMS = ['Yards', 'Meters', 'Kilograms', 'Pounds', 'Rolls', 'Pieces'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    Delivered: 'success', 'In Transit': 'info', Exported: 'primary',
    Planned: 'default', 'Booking Confirmed': 'warning', Cancelled: 'error',
  };
  return m[s] ?? 'default';
};

// Extrae el mensaje real del backend (los 400 devuelven la cadena directamente).
const errMsg = (err: any, fallback: string): string =>
  err?.response?.data?.message
  || (typeof err?.response?.data === 'string' ? err.response.data : null)
  || err?.message
  || fallback;

const emptyForm = {
  ShipmentNumber: '', FabricPONumber: '', FGPONumber: '', Supplier: '',
  RollQty: 0, UOM: 'Yards', ShippedWeight: 0,
  PackingList: '', InvoiceNumber: '', ContainerAWB: '', ShippingMethod: '',
  ETD: new Date().toISOString().split('T')[0], ETA: new Date().toISOString().split('T')[0],
  ShipmentStatus: 'Planned', DeliveredToTexnicaDate: '', DataOwnerId: 0, Remarks: '',
};

type RollRow = {
  id: number; rollNumber: string; supplierRollNumber: string; receivingNumber: string;
  actualYardage: number; actualWidth: number; netWeight: number; condition: string; receivedDate: string;
};

const FabricShipmentPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useFabricShipments();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FabricShipment | null>(null);
  const [formError, setFormError] = useState('');

  const { options: userList } = useUserOptions();
  const { catalogs } = useCatalogs();
  const STATUS_OPTIONS = catalogs['ShipmentStatus']?.length ? catalogs['ShipmentStatus'] : DEFAULT_SHIPMENT_STATUSES;
  const UOM_OPTIONS = catalogs['UOM']?.length ? catalogs['UOM'] : DEFAULT_UOMS;

  const [form, setForm] = useState(emptyForm);

  const [shipTotals, setShipTotals] = useState({ shipped: 0, received: 0, pending: 0, lots: 0 });
  const [totalsError, setTotalsError] = useState('');
  const loadShipTotals = async () => {
    setTotalsError('');
    try {
      const res = await fabricShipmentsApi.getTotals();
      const t = res.data ?? {};
      setShipTotals({
        shipped: t.shippedYards ?? t.ShippedYards ?? 0,
        received: t.receivedYards ?? t.ReceivedYards ?? 0,
        pending: t.pendingYards ?? t.PendingYards ?? 0,
        lots: t.lotsCount ?? t.LotsCount ?? 0,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      setTotalsError(status ? `Error ${status} al cargar los totales de embarques.` : 'No se pudieron cargar los totales de embarques.');
    }
  };
  useEffect(() => { loadShipTotals(); }, []);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: FabricShipment) => {
    setEditingId(item.id);
    setForm({
      ShipmentNumber: item.shipmentNumber,
      FabricPONumber: item.fabricPONumber ?? '', FGPONumber: item.fgpoNumber ?? '',
      Supplier: item.supplier ?? '',
      RollQty: item.rollQty,
      UOM: item.uom || 'Yards', ShippedWeight: item.shippedWeight,
      PackingList: item.packingList ?? '', InvoiceNumber: item.invoiceNumber ?? '',
      ContainerAWB: item.containerAWB ?? '', ShippingMethod: item.shippingMethod ?? '',
      ETD: item.etd?.split('T')[0] || '', ETA: item.eta?.split('T')[0] || '',
      ShipmentStatus: item.shipmentStatus || 'Planned',
      DeliveredToTexnicaDate: item.deliveredToTexnicaDate?.split('T')[0] || '',
      DataOwnerId: userList.find(o => o.label === item.dataOwner)?.id ?? 0, Remarks: item.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this shipment record?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.ShipmentNumber) { setFormError('Shipment Number is required.'); return; }
    const negField = firstNegativeField([
      { name: 'Roll Quantity', value: form.RollQty },
      { name: 'Shipped Weight', value: form.ShippedWeight },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        FabricPONumber: form.FabricPONumber.trim() || null,
        FGPONumber: form.FGPONumber.trim() || null,
        Supplier: form.Supplier.trim() || null,
        DataOwnerId: form.DataOwnerId || null,
        ETD: form.ETD ? new Date(form.ETD).toISOString() : new Date().toISOString(),
        ETA: form.ETA ? new Date(form.ETA).toISOString() : new Date().toISOString(),
        DeliveredToTexnicaDate: form.DeliveredToTexnicaDate ? new Date(form.DeliveredToTexnicaDate).toISOString() : null,
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Lotes del embarque ──
  const { options: styleOptions } = useStyleOptions();
  const { options: colorOptions } = useColorOptions();
  const emptyLotForm = {
    LineNumber: '', LotNumber: '', StyleId: 0, ColorId: 0,
    FabricDescription: '', Width: '', GSM: '', ShippedRolls: '', ShippedYards: '',
  };
  const [lotForm, setLotForm] = useState(emptyLotForm);
  const [lotsOpen, setLotsOpen] = useState(false);
  const [lotsShipment, setLotsShipment] = useState<FabricShipment | null>(null);
  const [lots, setLots] = useState<FabricShipmentLot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsError, setLotsError] = useState('');
  const [lotDialogOpen, setLotDialogOpen] = useState(false);
  const [editingLotId, setEditingLotId] = useState<number | null>(null);
  const [lotSaving, setLotSaving] = useState(false);
  const [lotFormError, setLotFormError] = useState('');

  const [rollsOpen, setRollsOpen] = useState(false);
  const [rollsLot, setRollsLot] = useState<FabricShipmentLot | null>(null);
  const [lotRolls, setLotRolls] = useState<RollRow[]>([]);
  const [rollsLoading, setRollsLoading] = useState(false);
  const [rollsError, setRollsError] = useState('');
  const [allRolls, setAllRolls] = useState<RollRow[]>([]);
  const [associateRollId, setAssociateRollId] = useState(0);
  const [associateSaving, setAssociateSaving] = useState(false);

  const mapLot = (raw: any): FabricShipmentLot => ({
    id: raw.id ?? raw.ID,
    fabricShipmentId: raw.fabricShipmentId ?? raw.FabricShipmentId ?? 0,
    shipmentNumber: raw.shipmentNumber ?? raw.ShipmentNumber ?? '',
    lineNumber: raw.lineNumber ?? raw.LineNumber ?? null,
    lotNumber: raw.lotNumber ?? raw.LotNumber ?? '',
    styleId: raw.styleId ?? raw.StyleId ?? null,
    styleCode: raw.styleCode ?? raw.StyleCode ?? '',
    colorId: raw.colorId ?? raw.ColorId ?? null,
    colorName: raw.colorName ?? raw.ColorName ?? '',
    fabricDescription: raw.fabricDescription ?? raw.FabricDescription ?? null,
    width: raw.width ?? raw.Width ?? null,
    gsm: raw.gsm ?? raw.GSM ?? null,
    shippedRolls: raw.shippedRolls ?? raw.ShippedRolls ?? 0,
    shippedYards: raw.shippedYards ?? raw.ShippedYards ?? 0,
    receivedRolls: raw.receivedRolls ?? raw.ReceivedRolls ?? 0,
    receivedYards: raw.receivedYards ?? raw.ReceivedYards ?? 0,
    balanceRolls: raw.balanceRolls ?? raw.BalanceRolls ?? 0,
    balanceYards: raw.balanceYards ?? raw.BalanceYards ?? 0,
    dataOwnerName: raw.dataOwnerName ?? raw.DataOwnerName ?? '',
    active: raw.active ?? raw.Active ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
    updatedAt: raw.updatedAt ?? raw.UpdatedAt,
  });

  const loadLots = async (shipmentId: number) => {
    setLotsLoading(true);
    setLotsError('');
    try {
      const res = await fabricShipmentLotsApi.getByShipment(shipmentId);
      setLots((res.data ?? []).map(mapLot));
    } catch (err: any) {
      setLotsError(errMsg(err, 'No se pudieron cargar los lotes.'));
    } finally {
      setLotsLoading(false);
    }
  };

  const openLots = (item: FabricShipment) => {
    setLotsShipment(item);
    setLots([]);
    setLotsError('');
    setLotsOpen(true);
    loadLots(item.id);
  };

  const openLotCreate = () => {
    setEditingLotId(null);
    setLotForm(emptyLotForm);
    setLotFormError('');
    setLotDialogOpen(true);
  };

  const openLotEdit = (lot: FabricShipmentLot) => {
    setEditingLotId(lot.id);
    setLotForm({
      LineNumber: lot.lineNumber != null ? String(lot.lineNumber) : '',
      LotNumber: lot.lotNumber,
      StyleId: lot.styleId ?? 0,
      ColorId: lot.colorId ?? 0,
      FabricDescription: lot.fabricDescription ?? '',
      Width: lot.width != null ? String(lot.width) : '',
      GSM: lot.gsm != null ? String(lot.gsm) : '',
      ShippedRolls: String(lot.shippedRolls),
      ShippedYards: String(lot.shippedYards),
    });
    setLotFormError('');
    setLotDialogOpen(true);
  };

  const setLotF = (field: string, value: any) => setLotForm(prev => ({ ...prev, [field]: value }));

  const handleLotDelete = async (lot: FabricShipmentLot) => {
    if (!window.confirm(`¿Eliminar el lote "${lot.lotNumber}"?`)) return;
    try {
      await fabricShipmentLotsApi.delete(lot.id);
      if (lotsShipment) await loadLots(lotsShipment.id);
    } catch (err: any) {
      setLotsError(err?.response?.data?.message || err?.message || 'Error al eliminar el lote.');
    }
  };

  const handleLotSave = async () => {
    setLotFormError('');
    if (!lotForm.LotNumber.trim()) { setLotFormError('El número de lote es obligatorio.'); return; }
    const rolls = Number(lotForm.ShippedRolls || '') || 0;
    const yards = Number(lotForm.ShippedYards || '') || 0;
    if (rolls < 0 || yards < 0) { setLotFormError('Rollos y yards no pueden ser negativos.'); return; }
    if (rolls === 0 && yards === 0) { setLotFormError('Debe indicar al menos una cantidad enviada (rollos o yardas).'); return; }
    const width = lotForm.Width === '' ? null : Number(lotForm.Width);
    const gsm = lotForm.GSM === '' ? null : Number(lotForm.GSM);
    if ((width != null && width < 0) || (gsm != null && gsm < 0)) { setLotFormError('Width y GSM no pueden ser negativos.'); return; }

    const payload: any = {
      lotNumber: lotForm.LotNumber.trim(),
      lineNumber: lotForm.LineNumber === '' ? null : Number(lotForm.LineNumber),
      styleId: lotForm.StyleId || null,
      colorId: lotForm.ColorId || null,
      fabricDescription: lotForm.FabricDescription || null,
      width,
      gsm,
      shippedRolls: rolls,
      shippedYards: yards,
    };

    setLotSaving(true);
    try {
      if (editingLotId) {
        await fabricShipmentLotsApi.update(editingLotId, payload);
      } else if (lotsShipment) {
        await fabricShipmentLotsApi.create({ ...payload, fabricShipmentId: lotsShipment.id });
      }
      setLotDialogOpen(false);
      if (lotsShipment) await loadLots(lotsShipment.id);
    } catch (err: any) {
      setLotFormError(err?.response?.data?.message || err?.response?.data || 'Error al guardar el lote.');
    } finally {
      setLotSaving(false);
    }
  };

  const mapRollRow = (raw: any): RollRow => ({
    id: raw.id ?? raw.ID ?? 0,
    rollNumber: raw.rollNumber ?? raw.RollNumber ?? '',
    supplierRollNumber: raw.supplierRollNumber ?? raw.SupplierRollNumber ?? '',
    receivingNumber: raw.receivingNumber ?? raw.ReceivingNumber ?? '',
    actualYardage: raw.actualYardage ?? raw.ActualYardage ?? 0,
    actualWidth: raw.actualWidth ?? raw.ActualWidth ?? 0,
    netWeight: raw.netWeight ?? raw.NetWeight ?? 0,
    condition: raw.condition ?? raw.Condition ?? '',
    receivedDate: raw.receivedDate ?? raw.ReceivedDate ?? '',
  });

  const openLotRolls = async (lot: FabricShipmentLot) => {
    setRollsLot(lot);
    setRollsError('');
    setAssociateRollId(0);
    setRollsOpen(true);
    setRollsLoading(true);
    try {
      const [lotRes, allRes] = await Promise.all([
        fabricShipmentLotsApi.getRolls(lot.id),
        rollReceivingsApi.getAll(),
      ]);
      setLotRolls((lotRes.data ?? []).map(mapRollRow));
      setAllRolls((allRes.data ?? []).map(mapRollRow));
    } catch (err: any) {
      setRollsError(errMsg(err, 'No se pudieron cargar los rollos.'));
    } finally {
      setRollsLoading(false);
    }
  };

  const handleAssociateRoll = async () => {
    if (!rollsLot || !associateRollId) return;
    setAssociateSaving(true);
    setRollsError('');
    try {
      await fabricShipmentLotsApi.associateRoll(rollsLot.id, associateRollId);
      setAssociateRollId(0);
      const res = await fabricShipmentLotsApi.getRolls(rollsLot.id);
      setLotRolls((res.data ?? []).map(mapRollRow));
      if (lotsShipment) await loadLots(lotsShipment.id);
    } catch (err: any) {
      setRollsError(errMsg(err, 'No se pudo asociar el rollo.'));
    } finally {
      setAssociateSaving(false);
    }
  };

  const handleUnlinkRoll = async (rollId: number) => {
    if (!rollsLot) return;
    try {
      await fabricShipmentLotsApi.unlinkRoll(rollsLot.id, rollId);
      const res = await fabricShipmentLotsApi.getRolls(rollsLot.id);
      setLotRolls((res.data ?? []).map(mapRollRow));
      if (lotsShipment) await loadLots(lotsShipment.id);
    } catch (err: any) {
      setRollsError(errMsg(err, 'No se pudo retirar el rollo.'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <LocalShippingIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Fabric Shipment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Record shipments and track in-transit quantities by lot
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Shipment</Button>
        </Box>
      </Box>

      {totalsError && <Alert severity="warning" sx={{ mb: 1 }}>{totalsError}</Alert>}
      <ModuleTotalsBar
        suffix="yd"
        items={[
          { label: 'Yardas enviadas', value: shipTotals.shipped.toLocaleString(), color: 'primary.main' },
          { label: 'Registradas físicamente', value: shipTotals.received.toLocaleString(), color: 'info.main' },
          { label: 'Pendientes de registrar', value: shipTotals.pending.toLocaleString(), color: 'warning.main' },
          { label: 'Lotes', value: shipTotals.lots.toLocaleString(), color: 'text.disabled' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component='form' onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Shipment, Lot, Invoice, Container..."
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
                {['Shipment #', 'Fabric PO', 'FGPO', 'Shipped Qty', 'In Transit', 'Remaining', 'ETD', 'Status', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No shipments found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first shipment</Button>
                </TableCell></TableRow>
              ) : items.map((item: FabricShipment) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.shipmentNumber}</Typography></TableCell>
                  <TableCell>{item.fabricPONumber}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{Number(item.shippedQuantity).toLocaleString()} {item.uom}</TableCell>
                  <TableCell>
                    <Chip label={Number(item.inTransitQuantity).toLocaleString()} size="small"
                      color={item.inTransitQuantity > 0 ? 'warning' : 'success'}
                      variant={item.inTransitQuantity > 0 ? 'filled' : 'outlined'} />
                  </TableCell>
                  <TableCell>{Number(item.remainingToDeliver).toLocaleString()}</TableCell>
                  <TableCell>{fmt(item.etd)}</TableCell>
                  <TableCell><Chip label={item.shipmentStatus || 'N/A'} size="small" color={sc(item.shipmentStatus ?? '')} variant="outlined" /></TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" title="Lotes" onClick={() => openLots(item)}><ListAltIcon fontSize="small" /></IconButton>
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
          {editingId ? 'Edit Shipment' : 'New Shipment'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            {/* ── References ── */}
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Shipment Number *" value={form.ShipmentNumber} onChange={e => setF('ShipmentNumber', e.target.value)} required placeholder="SHP-2026-001" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Fabric PO (opcional)" value={form.FabricPONumber}
                onChange={e => setF('FabricPONumber', e.target.value)} placeholder="PO-2026-001" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="FGPO (opcional)" value={form.FGPONumber}
                onChange={e => setF('FGPONumber', e.target.value)} placeholder="FGPO-2026-001" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Supplier" value={form.Supplier} onChange={e => setF('Supplier', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>UOM</InputLabel>
                <Select value={form.UOM} label="UOM" onChange={e => setF('UOM', e.target.value)}>
                  {UOM_OPTIONS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Shipping Method" value={form.ShippingMethod} onChange={e => setF('ShippingMethod', e.target.value)} placeholder="Sea / Air / Truck" /></Grid>

            {/* ── Shipment Quantities ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Shipment Quantities</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Roll Quantity" type="number" value={form.RollQty || ''} onChange={e => setF('RollQty', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Shipped Quantity (auto)" value="" disabled helperText="Calculado desde los lotes" /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Shipped Weight" type="number" value={form.ShippedWeight || ''} onChange={e => setF('ShippedWeight', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>

            {/* ── Documents & Container ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Documents & Container</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Packing List" value={form.PackingList} onChange={e => setF('PackingList', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Invoice Number" value={form.InvoiceNumber} onChange={e => setF('InvoiceNumber', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Container / AWB" value={form.ContainerAWB} onChange={e => setF('ContainerAWB', e.target.value)} /></Grid>

            {/* ── Dates & Status ── */}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Dates & Status</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="ETD *" type="date" value={form.ETD} onChange={e => setF('ETD', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="ETA *" type="date" value={form.ETA} onChange={e => setF('ETA', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Shipment Status</InputLabel>
                <Select value={form.ShipmentStatus} label="Shipment Status" onChange={e => setF('ShipmentStatus', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth size="small" label="Delivered to Texnica Date" type="date" value={form.DeliveredToTexnicaDate} onChange={e => setF('DeliveredToTexnicaDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
        <DialogTitle sx={{ fontWeight: 700 }}>Shipment Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Shipment Number</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.shipmentNumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{viewItem.supplier || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Roll Qty</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.rollQty}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shipped Qty</Typography><Typography sx={{ fontWeight: 600 }}>{Number(viewItem.shippedQuantity).toLocaleString()} {viewItem.uom}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Weight</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.shippedWeight}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shipping Method</Typography><Typography>{viewItem.shippingMethod || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Packing List</Typography><Typography>{viewItem.packingList || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Invoice</Typography><Typography>{viewItem.invoiceNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Container / AWB</Typography><Typography>{viewItem.containerAWB || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">ETD</Typography><Typography>{fmt(viewItem.etd)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">ETA</Typography><Typography>{fmt(viewItem.eta)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Delivered Date</Typography><Typography>{fmt(viewItem.deliveredToTexnicaDate)}</Typography></Grid>
              <Grid size={{ xs: 6 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.shipmentStatus} size="small" color={sc(viewItem.shipmentStatus ?? '')} /></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">In Transit</Typography><Chip label={Number(viewItem.inTransitQuantity).toLocaleString()} size="small" color={viewItem.inTransitQuantity > 0 ? 'warning' : 'success'} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Remaining to Deliver</Typography><Typography>{Number(viewItem.remainingToDeliver).toLocaleString()}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Data Owner</Typography><Typography>{viewItem.dataOwner || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Lots Dialog */}
      <Dialog open={lotsOpen} onClose={() => setLotsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Lotes del embarque — {lotsShipment?.shipmentNumber || ''}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {lotsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLotsError('')}>{lotsError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {lotsShipment?.fabricPONumber} · {lotsShipment?.fgpoNumber}
            </Typography>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openLotCreate}>Add Lot</Button>
          </Box>
          {lotsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : lots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No hay lotes registrados para este embarque.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    {['#', 'Lote', 'Style', 'Color', 'Fabric', 'Shipped Rolls', 'Rec. Rolls', 'Shipped Yards', 'Rec. Yards', 'Pend. Yards', 'Actions'].map(h =>
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1 }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lots.map((lot, idx) => (
                    <TableRow key={lot.id} hover>
                      <TableCell>{lot.lineNumber ?? idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{lot.lotNumber}</TableCell>
                      <TableCell>{lot.styleCode || '-'}</TableCell>
                      <TableCell>{lot.colorName || '-'}</TableCell>
                      <TableCell>{lot.fabricDescription || '-'}</TableCell>
                      <TableCell>{lot.shippedRolls}</TableCell>
                      <TableCell>{lot.receivedRolls}</TableCell>
                      <TableCell>{Number(lot.shippedYards).toLocaleString()}</TableCell>
                      <TableCell>{Number(lot.receivedYards).toLocaleString()}</TableCell>
                      <TableCell>
                        <Typography color={lot.balanceYards < 0 ? 'error.main' : 'text.primary'}>
                          {Math.max(0, Number(lot.shippedYards) - Number(lot.receivedYards)).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" title="Rollos" onClick={() => openLotRolls(lot)}><AllInboxIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="info" onClick={() => openLotEdit(lot)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleLotDelete(lot)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setLotsOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Rolls Dialog */}
      <Dialog open={rollsOpen} onClose={() => setRollsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Rollos del lote — {rollsLot?.lotNumber || ''}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {rollsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRollsError('')}>{rollsError}</Alert>}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
              <InputLabel>Asociar rollo existente</InputLabel>
              <Select value={associateRollId || ''} label="Asociar rollo existente" onChange={e => setAssociateRollId(Number(e.target.value))}>
                <MenuItem value=""><em>Seleccione un rollo...</em></MenuItem>
                {allRolls.filter(r => !lotRolls.some(lr => lr.id === r.id)).map(r => (
                  <MenuItem key={r.id} value={r.id}>{r.rollNumber || `Rollo ${r.id}`} — {r.receivingNumber}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" size="small" disabled={!associateRollId || associateSaving} onClick={handleAssociateRoll}>
              {associateSaving ? 'Asociando...' : 'Asociar'}
            </Button>
          </Box>
          {rollsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : lotRolls.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Este lote no tiene rollos asociados todavía.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    {['Roll #', 'Supplier Roll #', 'Receiving', 'Yardage', 'Width', 'Net Wt', 'Condition', 'Received', 'Actions'].map(h =>
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1 }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lotRolls.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.rollNumber || '-'}</TableCell>
                      <TableCell>{r.supplierRollNumber || '-'}</TableCell>
                      <TableCell>{r.receivingNumber || '-'}</TableCell>
                      <TableCell>{Number(r.actualYardage).toLocaleString()}</TableCell>
                      <TableCell>{Number(r.actualWidth).toLocaleString()}</TableCell>
                      <TableCell>{Number(r.netWeight).toLocaleString()}</TableCell>
                      <TableCell><Chip label={r.condition || 'N/A'} size="small" color={sc(r.condition ?? '')} variant="outlined" /></TableCell>
                      <TableCell>{fmt(r.receivedDate)}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" title="Retirar del lote" onClick={() => handleUnlinkRoll(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setRollsOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Lot Add/Edit Dialog */}
      <Dialog open={lotDialogOpen} onClose={() => setLotDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={(e) => { e.preventDefault(); handleLotSave(); }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingLotId ? 'Editar lote' : 'Nuevo lote'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {lotFormError && <Alert severity="error" sx={{ mb: 2 }}>{lotFormError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" label="Line #" type="number" value={lotForm.LineNumber}
                  onChange={e => setLotF('LineNumber', e.target.value)} sx={{ width: 120 }} />
                <TextField size="small" label="Lot Number *" fullWidth value={lotForm.LotNumber}
                  onChange={e => setLotF('LotNumber', e.target.value)} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Style</InputLabel>
                  <Select value={lotForm.StyleId || ''} label="Style" onChange={e => setLotF('StyleId', Number(e.target.value))}>
                    <MenuItem value=""><em>Sin estilo</em></MenuItem>
                    {styleOptions.map((o: any) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Color</InputLabel>
                  <Select value={lotForm.ColorId || ''} label="Color" onChange={e => setLotF('ColorId', Number(e.target.value))}>
                    <MenuItem value=""><em>Sin color</em></MenuItem>
                    {colorOptions.map((o: any) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <TextField size="small" label="Fabric Description" fullWidth value={lotForm.FabricDescription}
                onChange={e => setLotF('FabricDescription', e.target.value)} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" label="Width" type="number" fullWidth value={lotForm.Width}
                  onChange={e => setLotF('Width', e.target.value)} slotProps={{ htmlInput: { step: 'any' } }} />
                <TextField size="small" label="GSM" type="number" fullWidth value={lotForm.GSM}
                  onChange={e => setLotF('GSM', e.target.value)} slotProps={{ htmlInput: { step: 'any' } }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" label="Shipped Rolls *" type="number" fullWidth value={lotForm.ShippedRolls}
                  onChange={e => setLotF('ShippedRolls', e.target.value)} />
                <TextField size="small" label="Shipped Yards *" type="number" fullWidth value={lotForm.ShippedYards}
                  onChange={e => setLotF('ShippedYards', e.target.value)} slotProps={{ htmlInput: { step: 'any' } }} />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setLotDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={lotSaving} startIcon={lotSaving ? <CircularProgress size={18} /> : null}>
              {editingLotId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FabricShipmentPage;
