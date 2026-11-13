import React, { useState, FormEvent, useContext } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useShipmentControls } from '../../hooks/shipmentControls/useShipmentControls';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { useWarehouseFgpos } from '../../hooks/packingControls/useWarehouseFgpos';
import { AuthContext } from '../../context/AuthContext';
import { packingControlsApi, shipmentControlsApi } from '../../utils/api';
import { ShipmentControl } from '../../types';
import { getCurrentUserName } from '../../utils/session';

const STATUS_OPTIONS = ['Planned', 'Booking Confirmed', 'Loaded', 'In Transit', 'Delivered', 'Partially Delivered', 'Cancelled'];
const CONTAINER_OPTIONS = ['20ft', '40ft', '40ft HC', '45ft', 'LCL', 'Air'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    Delivered: 'success', 'Partially Delivered': 'info', 'In Transit': 'info', Loaded: 'primary',
    Planned: 'default', 'Booking Confirmed': 'warning', Cancelled: 'error',
  };
  return m[s] ?? 'default';
};

const emptyForm = {
  ShipmentNumber: '',
  FGPOId: 0,
  PlannedQty: 0, ActualLoadedQty: 0, InTransitQty: 0, CustomerReceivedQty: 0, TotalShippedQty: 0,
  PlannedLoadingDate: '', ActualLoadingDate: '', ETD: '', ETA: '',
  ContainerType: '40ft HC', ContainerNumber: '', BookingNumber: '',
  Destination: '', ShipmentStatus: 'Planned', PackingList: '', InvoiceNumber: '', LoadPlan: '',
  DataOwnerId: 0, Remarks: '',
};

interface BoxOption {
  id: number;
  fgpoId: number;
  fgpoNumber: string;
  style: string;
  color: string;
  size: string;
  boxCode: string;
  cartons: number;
  pcsPerCarton: number;
  packedQty: number;
}

const ShipmentControlPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useShipmentControls();

  const { user } = useContext(AuthContext);
  const isSuperAdmin = !!user?.isSuperAdmin;

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<ShipmentControl | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fgpoList } = useFgpoOptions();
  const { options: userList } = useUserOptions();

  const [form, setForm] = useState(emptyForm);

  const warehouseFgpos = useWarehouseFgpos();
  const [boxes, setBoxes] = useState<BoxOption[]>([]);
  const [selectedFgpoIds, setSelectedFgpoIds] = useState<number[]>([]);
  const [boxQuantities, setBoxQuantities] = useState<Record<string, string>>({});

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => {
    setEditingId(null); resetForm(); setBoxes([]); setSelectedFgpoIds([]); setBoxQuantities({});
    setFormError(''); setDialogOpen(true);
  };

  const boxKey = (b: BoxOption) => `${b.fgpoId}-${b.id}`;

  const loadBoxesForFgpo = async (fgpoId: number) => {
    if (!fgpoId) return;
    try {
      const res = await packingControlsApi.getByFgpo(fgpoId);
      const label = warehouseFgpoOptions.find(f => f.id === fgpoId)?.label ?? '';
      const rows: BoxOption[] = (res.data ?? []).map((p: any): BoxOption => ({
        id: p.id ?? p.ID ?? 0,
        fgpoId,
        fgpoNumber: label,
        style: p.style ?? p.Style ?? '',
        color: p.color ?? p.Color ?? '',
        size: p.size ?? p.Size ?? '',
        boxCode: p.boxCode ?? p.BoxCode ?? '',
        cartons: p.availableCartons ?? ((p.fullCartons ?? p.FullCartons ?? 0) + (p.partialCartons ?? p.PartialCartons ?? 0)),
        pcsPerCarton: p.pcsPerCarton ?? p.PcsPerCarton ?? 0,
        packedQty: p.packedQty ?? p.PackedQty ?? 0,
      }));
      setBoxes(prev => [...prev.filter(b => b.fgpoId !== fgpoId), ...rows]);
    } catch { /* vacío */ }
  };

  const handleFgpoMultiChange = (ids: number[]) => {
    const added = ids.filter(id => !selectedFgpoIds.includes(id));
    const removed = selectedFgpoIds.filter(id => !ids.includes(id));
    setSelectedFgpoIds(ids);
    setForm(prev => ({ ...prev, FGPOId: ids[0] ?? 0 }));
    if (removed.length > 0) {
      setBoxes(b => b.filter(x => !removed.includes(x.fgpoId)));
      setBoxQuantities(q => {
        const next = { ...q };
        Object.keys(next).forEach(k => {
          removed.forEach(id => { if (k.startsWith(`${id}-`)) delete next[k]; });
        });
        return next;
      });
    }
    added.forEach(id => loadBoxesForFgpo(id));
  };

  const setBoxQty = (b: BoxOption, value: string) => setBoxQuantities(prev => ({ ...prev, [boxKey(b)]: value }));

  const totalPieces = boxes.reduce((s, b) => s + (Number(boxQuantities[boxKey(b)] ?? '') || 0) * b.pcsPerCarton, 0);

  const handleFgpoChange = (val: number) => {
    setForm(prev => ({ ...prev, FGPOId: val }));
    if (editingId === null) {
      setSelectedFgpoIds([]);
      setBoxes([]);
      setBoxQuantities({});
      setForm(prev => ({ ...prev, PlannedQty: 0, ActualLoadedQty: 0, InTransitQty: 0, CustomerReceivedQty: 0, TotalShippedQty: 0 }));
    }
  };

  // En creación se seleccionan los FGPOs que están en warehouse (con cajas por enviar).
  const warehouseFgpoOptions = warehouseFgpos.map(f => ({ id: f.fgpoId, label: f.fgpoNumber }));
  const fgpoOptions = editingId === null ? warehouseFgpoOptions : fgpoList;
  const openEdit = (item: ShipmentControl) => {
    setEditingId(item.id);
    setForm({
      ShipmentNumber: item.shipmentNumber,
      FGPOId: item.fgpoId,
      PlannedQty: item.plannedQty, ActualLoadedQty: item.actualLoadedQty,
      InTransitQty: item.inTransitQty, CustomerReceivedQty: item.customerReceivedQty, TotalShippedQty: item.totalShippedQty,
      PlannedLoadingDate: item.plannedLoadingDate?.split('T')[0] || '',
      ActualLoadingDate: item.actualLoadingDate?.split('T')[0] || '',
      ETD: item.etd?.split('T')[0] || '', ETA: item.eta?.split('T')[0] || '',
      ContainerType: item.containerType || '40ft HC', ContainerNumber: item.containerNumber ?? '',
      BookingNumber: item.bookingNumber ?? '', Destination: item.destination ?? '',
      ShipmentStatus: item.shipmentStatus || 'Planned', PackingList: item.packingList ?? '',
      InvoiceNumber: item.invoiceNumber ?? '', LoadPlan: item.loadPlan ?? '',
      DataOwnerId: userList.find(o => o.label === item.dataOwnerName)?.id ?? 0,
      Remarks: item.remarks ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this shipment?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleClose = async (id: number) => {
    if (!window.confirm('Close this shipment? Once closed it cannot be edited or deleted.')) return;
    try { await shipmentControlsApi.close(id); await refresh(); }
    catch (err: any) { setError(err.response?.data?.message || err.response?.data || 'Error closing.'); }
  };

  const handleReopen = async (id: number) => {
    if (!window.confirm('Reopen this shipment?')) return;
    try { await shipmentControlsApi.reopen(id); await refresh(); }
    catch (err: any) { setError(err.response?.data?.message || err.response?.data || 'Error reopening.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.ShipmentNumber.trim()) { setFormError('Shipment Number is required.'); return; }
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    if (form.PlannedQty < 0 || form.ActualLoadedQty < 0 || form.InTransitQty < 0 || form.CustomerReceivedQty < 0 || form.TotalShippedQty < 0) {
      setFormError('Quantities cannot be negative.'); return;
    }

    const lines = boxes
      .map(b => ({ b, qty: Number(boxQuantities[boxKey(b)] ?? '') || 0 }))
      .filter(x => x.qty > 0)
      .map(x => ({
        fgpoId: x.b.fgpoId,
        packingControlId: x.b.id,
        style: x.b.style,
        color: x.b.color,
        size: x.b.size,
        boxCode: x.b.boxCode,
        boxesToShip: x.qty,
        pcsPerCarton: x.b.pcsPerCarton,
      }));

    if (editingId === null && lines.length === 0) {
      setFormError('Select at least one FGPO and enter boxes to ship.');
      return;
    }

    try {
      const payload: any = {
        ...form,
        DataOwnerId: form.DataOwnerId || null,
        PlannedLoadingDate: form.PlannedLoadingDate ? new Date(form.PlannedLoadingDate).toISOString() : null,
        ActualLoadingDate: form.ActualLoadingDate ? new Date(form.ActualLoadingDate).toISOString() : null,
        ETD: form.ETD ? new Date(form.ETD).toISOString() : null,
        ETA: form.ETA ? new Date(form.ETA).toISOString() : null,
      };
      if (editingId === null) {
        payload.lines = lines;
        payload.plannedQty = totalPieces;
        payload.totalShippedQty = totalPieces;
      }
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const num = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Vistas previas de las columnas calculadas
  const variance = form.TotalShippedQty - form.PlannedQty;
  const pending = Math.max(0, form.PlannedQty - form.TotalShippedQty);
  const overship = Math.max(0, form.TotalShippedQty - form.PlannedQty);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <FlightTakeoffIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Shipment Control
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Shipment control — planned vs loaded, containers, ETD/ETA and destination
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Shipment</Button>
        </Box>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small" placeholder="Search by Shipment #, FGPO, Container, Booking, Destination..."
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
          sx={{ flex: 1, maxWidth: 520 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
        />
        <Button type="submit" variant="contained" color="primary">Search</Button>
        <Button variant="outlined" color="inherit" onClick={handleClearSearch}><ClearIcon /></Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                {['Shipment #', 'FGPO', 'Style / Color', 'Size', 'Planned', 'Loaded', 'In Transit', 'Recv', 'Shipped', 'Variance', 'Pending', 'Over-ship', 'Container', 'ETD', 'Destination', 'Status', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={17} align="center"><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={17} align="center" sx={{ color: 'text.secondary', py: 4 }}>No shipments found.</TableCell></TableRow>
              ) : items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.shipmentNumber}</TableCell>
                  <TableCell>{item.fgpoNumber}{item.fgpoCount && item.fgpoCount > 1 ? ` +${item.fgpoCount - 1}` : ''}</TableCell>
                  <TableCell>{item.style || '-'} / {item.color || '-'}</TableCell>
                  <TableCell>{item.size || '-'}</TableCell>
                  <TableCell>{num(item.plannedQty)}</TableCell>
                  <TableCell>{num(item.actualLoadedQty)}</TableCell>
                  <TableCell>{num(item.inTransitQty)}</TableCell>
                  <TableCell>{num(item.customerReceivedQty)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{num(item.totalShippedQty)}</TableCell>
                  <TableCell>{num(item.shipmentVariance)}</TableCell>
                  <TableCell>{num(item.pendingToShip)}</TableCell>
                  <TableCell>{num(item.overshipmentQty)}</TableCell>
                  <TableCell>{item.containerType || '-'}<br /><Typography variant="caption" color="text.secondary">{item.containerNumber || ''}</Typography></TableCell>
                  <TableCell>{fmt(item.etd)}</TableCell>
                  <TableCell>{item.destination || '-'}</TableCell>
                  <TableCell>
                    <Chip label={item.shipmentStatus || 'N/A'} size="small" color={sc(item.shipmentStatus ?? '')} />
                    {item.isClosed && <Chip label="Closed" size="small" color="default" sx={{ ml: 0.5 }} icon={<LockIcon />} />}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(item); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    {item.isClosed ? (
                      isSuperAdmin && (
                        <IconButton size="small" color="warning" title="Reopen" onClick={() => handleReopen(item.id)}><LockOpenIcon fontSize="small" /></IconButton>
                      )
                    ) : (
                      <>
                        <IconButton size="small" color="info" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="success" title="Close shipment" onClick={() => handleClose(item.id)}><LockIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={totalCount} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Paper>

      {/* ── Dialog Nuevo/Editar ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Shipment' : 'New Shipment'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Shipment Number *" value={form.ShipmentNumber} onChange={e => setF('ShipmentNumber', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                {editingId === null ? (
                  <Select multiple value={selectedFgpoIds} label="FGPO *"
                    onChange={e => handleFgpoMultiChange(e.target.value as number[])}
                    renderValue={(sel) => {
                      const ids = sel as number[];
                      if (ids.length === 0) return <em>Select FGPOs (warehouse)...</em>;
                      return warehouseFgpoOptions.filter(o => ids.includes(o.id)).map(o => o.label).join(', ');
                    }}>
                    {warehouseFgpoOptions.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                  </Select>
                ) : (
                  <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => handleFgpoChange(Number(e.target.value))}>
                    <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                    {fgpoOptions.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                  </Select>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.ShipmentStatus} label="Status" onChange={e => setF('ShipmentStatus', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {editingId === null ? (
              <>
                <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Boxes to ship</Typography></Divider></Grid>
                <Grid size={{ xs: 12 }}>
                  {selectedFgpoIds.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Select one or more FGPOs to view available boxes.</Typography>
                  ) : boxes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No boxes available for the selected FGPOs.</Typography>
                  ) : (
                    <TableContainer sx={{ maxHeight: 260 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {['FGPO', 'Style / Color', 'Size', 'Box', 'Cartons', 'Pcs/Box', 'Boxes to ship', 'Pieces'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {boxes.map(b => {
                            const qty = Number(boxQuantities[boxKey(b)] ?? '') || 0;
                            return (
                              <TableRow key={boxKey(b)} hover>
                                <TableCell>{b.fgpoNumber}</TableCell>
                                <TableCell>{b.style || '-'} / {b.color || '-'}</TableCell>
                                <TableCell>{b.size || '-'}</TableCell>
                                <TableCell>{b.boxCode || '-'}</TableCell>
                                <TableCell>{b.cartons}</TableCell>
                                <TableCell>{b.pcsPerCarton}</TableCell>
                                <TableCell>
                                  <TextField size="small" type="number" value={boxQuantities[boxKey(b)] ?? ''}
                                    onChange={e => setBoxQty(b, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0, max: b.cartons } }} sx={{ width: 90 }} />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{num(qty * b.pcsPerCarton)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Total pieces planned: {num(totalPieces)}
                  </Typography>
                </Grid>
              </>
            ) : (
              <>
                <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Quantities</Typography></Divider></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Planned Qty" type="number" value={form.PlannedQty} onChange={e => setF('PlannedQty', Number(e.target.value))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Actual Loaded Qty" type="number" value={form.ActualLoadedQty} onChange={e => setF('ActualLoadedQty', Number(e.target.value))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="In Transit Qty" type="number" value={form.InTransitQty} onChange={e => setF('InTransitQty', Number(e.target.value))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Customer Received Qty" type="number" value={form.CustomerReceivedQty} onChange={e => setF('CustomerReceivedQty', Number(e.target.value))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Total Shipped Qty" type="number" value={form.TotalShippedQty} onChange={e => setF('TotalShippedQty', Number(e.target.value))} />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Dates</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Planned Loading" type="date" value={form.PlannedLoadingDate} onChange={e => setF('PlannedLoadingDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Actual Loading" type="date" value={form.ActualLoadingDate} onChange={e => setF('ActualLoadingDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="ETD" type="date" value={form.ETD} onChange={e => setF('ETD', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="ETA" type="date" value={form.ETA} onChange={e => setF('ETA', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Container and Logistics</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Container Type</InputLabel>
                <Select value={form.ContainerType} label="Container Type" onChange={e => setF('ContainerType', e.target.value)}>
                  {CONTAINER_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Container Number" value={form.ContainerNumber} onChange={e => setF('ContainerNumber', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Booking Number" value={form.BookingNumber} onChange={e => setF('BookingNumber', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth size="small" label="Destination" value={form.Destination} onChange={e => setF('Destination', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Packing List" value={form.PackingList} onChange={e => setF('PackingList', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Invoice Number" value={form.InvoiceNumber} onChange={e => setF('InvoiceNumber', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Load Plan" value={form.LoadPlan} onChange={e => setF('LoadPlan', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth size="small" label="Remarks" value={form.Remarks} onChange={e => setF('Remarks', e.target.value)} />
            </Grid>

            {/* Previa de columnas calculadas */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip label={`Variance: ${num(variance)}`} size="small" color={variance >= 0 ? 'info' : 'error'} variant="outlined" />
                <Chip label={`Pending to Ship: ${num(pending)}`} size="small" color={pending > 0 ? 'warning' : 'default'} variant="outlined" />
                <Chip label={`Over-shipment: ${num(overship)}`} size="small" color={overship > 0 ? 'warning' : 'default'} variant="outlined" />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Ver ── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Shipment</DialogTitle>
        <DialogContent>
          {viewItem && (
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Shipment #</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.shipmentNumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              {(viewItem.lines ?? []).length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" color="text.secondary">Boxes by FGPO / size</Typography>
                  <TableContainer sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['FGPO', 'Style / Color', 'Size', 'Box', 'Boxes', 'Pcs/Box', 'Pieces'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(viewItem.lines ?? []).map((l, i) => (
                          <TableRow key={i}>
                            <TableCell>{l.fgpoNumber || l.fgpoId}</TableCell>
                            <TableCell>{l.style || '-'} / {l.color || '-'}</TableCell>
                            <TableCell>{l.size || '-'}</TableCell>
                            <TableCell>{l.boxCode || '-'}</TableCell>
                            <TableCell>{l.boxesToShip}</TableCell>
                            <TableCell>{l.pcsPerCarton}</TableCell>
                            <TableCell>{num(l.pieces ?? l.boxesToShip * l.pcsPerCarton)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color / Size</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'} / {viewItem.size || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.shipmentStatus || '-'} size="small" color={sc(viewItem.shipmentStatus ?? '')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Planned</Typography><Typography>{num(viewItem.plannedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Loaded</Typography><Typography>{num(viewItem.actualLoadedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">In Transit</Typography><Typography>{num(viewItem.inTransitQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Received</Typography><Typography>{num(viewItem.customerReceivedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Shipped</Typography><Typography sx={{ fontWeight: 600 }}>{num(viewItem.totalShippedQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Variance</Typography><Typography>{num(viewItem.shipmentVariance)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Pending</Typography><Typography>{num(viewItem.pendingToShip)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Over-ship</Typography><Typography>{num(viewItem.overshipmentQty)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">ETD</Typography><Typography>{fmt(viewItem.etd)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">ETA</Typography><Typography>{fmt(viewItem.eta)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Container</Typography><Typography>{viewItem.containerType || '-'} {viewItem.containerNumber || ''}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Booking</Typography><Typography>{viewItem.bookingNumber || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Destination</Typography><Typography>{viewItem.destination || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Data Owner</Typography><Typography>{viewItem.dataOwnerName || '-'}</Typography></Grid>
              {viewItem.remarks && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Remarks</Typography><Typography>{viewItem.remarks}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShipmentControlPage;
