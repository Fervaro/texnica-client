import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFabricReservations } from '../../hooks/fabricReservations/useFabricReservations';
import { useFabricPOOptions } from '../../hooks/fabricPOs/useFabricPOOptions';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useLotOptions } from '../../hooks/lots/useLotOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { fabricMovementsApi, fabricReservationsApi } from '../../utils/api';
import { FabricReservation, RollBalance } from '../../types';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';

const RESERVATION_STATUS = ['Pending', 'Approved', 'Released for Cutting', 'Rejected', 'On Hold'];

const sc = (s: string) => {
  const m: Record<string, any> = { Approved: 'success', Rejected: 'error', 'On Hold': 'warning', Pending: 'warning', 'Released for Cutting': 'info' };
  return m[s] ?? 'default';
};

const emptyForm = {
  ReservationDate: new Date().toISOString().split('T')[0],
  FabricPOId: 0, FGPOId: 0, LotIds: [] as number[],
  ReservedQuantity: '', ReleasedQuantity: '',
  Status: 'Pending', ReservedByUserId: 0, ApprovedByUserId: 0,
  LastUpdated: '', Comments: '',
};

const FabricReservationPage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useFabricReservations();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<FabricReservation | null>(null);
  const [formError, setFormError] = useState('');

  const { options: fabricPOList } = useFabricPOOptions();
  const { options: fgpoList } = useFgpoOptions();
  const { options: lotList } = useLotOptions();
  const { options: userList } = useUserOptions();
  const [form, setForm] = useState(emptyForm);
  const [balances, setBalances] = useState<RollBalance[]>([]);
  const [balancesError, setBalancesError] = useState('');
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [rollInputs, setRollInputs] = useState<Record<number, string>>({});
  const [rollSearch, setRollSearch] = useState('');
  const ROLLS_PER_PAGE = 30;
  const [rollVisible, setRollVisible] = useState(ROLLS_PER_PAGE);

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseItem, setReleaseItem] = useState<FabricReservation | null>(null);
  const [releaseQty, setReleaseQty] = useState('');
  const [releaseError, setReleaseError] = useState('');
  const [releasing, setReleasing] = useState(false);

  const loadBalances = async (fgpoId?: number) => {
    setLoadingBalances(true); setBalancesError('');
    try { const res = await fabricMovementsApi.getBalances(fgpoId); setBalances(res.data ?? []); }
    catch (err: any) { setBalancesError(err?.response?.data?.message || err?.message || 'Could not load roll balances.'); }
    finally { setLoadingBalances(false); }
  };

  const [resTotals, setResTotals] = useState({ reserved: 0, released: 0, pending: 0, count: 0 });
  const [totalsError, setTotalsError] = useState('');
  const loadResTotals = async () => {
    setTotalsError('');
    try {
      const res = await fabricReservationsApi.getTotals();
      const t = res.data ?? {};
      setResTotals({
        reserved: t.reservedYards ?? t.ReservedYards ?? 0,
        released: t.releasedYards ?? t.ReleasedYards ?? 0,
        pending: t.pendingYards ?? t.PendingYards ?? 0,
        count: t.activeCount ?? t.ActiveCount ?? 0,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      setTotalsError(status === 403 ? 'No access to this Module.' : status ? `Error ${status} loading reservation totals.` : 'Could not load reservation totals.');
    }
  };

  useEffect(() => { loadResTotals(); }, []);

  // Rollos compatibles con la FGPO seleccionada (Fabric PO y Lote opcionales)
  const availableRolls = balances.filter(b =>
    b.fgpoId === form.FGPOId &&
    (!form.FabricPOId || b.fabricPOId === form.FabricPOId) &&
    (!form.LotIds.length || (b.lotId != null && form.LotIds.includes(b.lotId))));
  const filteredRolls = availableRolls.filter(r =>
    !rollSearch.trim() || r.rollNumber.toLowerCase().includes(rollSearch.trim().toLowerCase()));
  const visibleRolls = filteredRolls.slice(0, rollVisible);
  const setRollQty = (rollId: number, value: string) => setRollInputs(prev => ({ ...prev, [rollId]: value }));

  // Asigna a todos los rollos compatibles su cantidad disponible de una vez
  // (los rollos sin disponibilidad quedan vacíos).
  const handleSelectAllRolls = () => {
    const next: Record<number, string> = { ...rollInputs };
    availableRolls.forEach(r => {
      next[r.rollReceivingId] = r.availableQuantity > 0 ? String(r.availableQuantity) : '';
    });
    setRollInputs(next);
  };
  const handleClearRolls = () => setRollInputs({});

  useEffect(() => { setRollVisible(ROLLS_PER_PAGE); setRollSearch(''); }, [form.FGPOId, form.FabricPOId, form.LotIds]);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setRollInputs({}); setRollSearch(''); setFormError(''); setBalances([]); setDialogOpen(true); };
  const openEdit = (r: FabricReservation) => {
    setEditingId(r.id);
    // Lotes derivados de los rollos asignados (lotId) o, como respaldo, del número de lote
    // (datos antiguos donde el rollo tenía LotNumber pero no LotId).
    const lotIds = Array.from(new Set((r.rolls ?? []).flatMap(l => {
      if (l.lotId) return [l.lotId];
      if (l.lotNumber) {
        const opt = lotList.find(o => o.label === l.lotNumber);
        return opt ? [opt.id] : [];
      }
      return [];
    })));
    setForm({
      ReservationDate: r.reservationDate?.split('T')[0] || '', FabricPOId: r.fabricPOId ?? 0, FGPOId: r.fgpoId,
      LotIds: lotIds.length > 0 ? lotIds : (r.lotId ? [r.lotId] : []),
      ReservedQuantity: r.reservedQuantity?.toString() ?? '', ReleasedQuantity: r.releasedQuantity?.toString() ?? '',
      Status: r.status || 'Pending', ReservedByUserId: r.reservedByUserId ?? 0, ApprovedByUserId: r.approvedByUserId ?? 0,
      LastUpdated: r.lastUpdated?.split('T')[0] || '', Comments: r.comments ?? '',
    });
    const initRollInputs: Record<number, string> = {};
    (r.rolls ?? []).forEach(l => { initRollInputs[l.rollReceivingId] = l.reservedQuantity.toString(); });
    setRollInputs(initRollInputs);
    setRollSearch('');
    setFormError(''); setDialogOpen(true);
    loadBalances(r.fgpoId);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this reservation?')) return;
    try { await remove(id); } catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const openRelease = (r: FabricReservation) => { setReleaseItem(r); setReleaseQty(''); setReleaseError(''); setReleaseOpen(true); };
  const handleRelease = async () => {
    setReleaseError('');
    const q = Number(releaseQty);
    if (!(q > 0)) { setReleaseError('Quantity must be greater than zero.'); return; }
    if (releaseItem && q > (releaseItem.remainingReservation ?? 0)) {
      setReleaseError(`Quantity cannot exceed the pending amount (${releaseItem.remainingReservation}).`); return;
    }
    setReleasing(true);
    try {
      await fabricReservationsApi.release(releaseItem!.id, { quantity: q });
      setReleaseOpen(false);
      await refresh();
    } catch (err: any) {
      setReleaseError(err?.response?.data?.message || err?.response?.data || 'Error releasing the reservation.');
    } finally { setReleasing(false); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    try {
      const num = (v: string) => v === '' ? 0 : Number(v);
      const rolls = availableRolls
        .map(r => ({ rollReceivingId: r.rollReceivingId, reservedQuantity: Number(rollInputs[r.rollReceivingId] || '') || 0 }))
        .filter(l => l.reservedQuantity > 0);
      const payload = {
        ...form,
        FabricPOId: form.FabricPOId || null,
        LotId: form.LotIds.length === 1 ? form.LotIds[0] : null,
        ReservedByUserId: form.ReservedByUserId || null, ApprovedByUserId: form.ApprovedByUserId || null,
        ReservedQuantity: num(form.ReservedQuantity), ReleasedQuantity: num(form.ReleasedQuantity),
        ReservationDate: form.ReservationDate ? new Date(form.ReservationDate).toISOString() : new Date().toISOString(),
        LastUpdated: form.LastUpdated ? new Date(form.LastUpdated).toISOString() : null,
        rolls: rolls.length > 0 ? rolls : undefined,
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Datos derivados del Fabric PO seleccionado (componente, UOM)
  const selectedPo = fabricPOList.find((f: any) => f.id === form.FabricPOId) as any;
  const derivedComponent = selectedPo?.meta?.fabricComponent || '';
  const derivedUom = selectedPo?.meta?.uom || '';

  // Total de yardas disponibles por lote (para ocultar lotes sin tela por usar).
  const lotAvailableMap: Record<number, number> = {};
  balances.forEach(b => {
    if (b.lotId != null) {
      lotAvailableMap[b.lotId] = (lotAvailableMap[b.lotId] ?? 0) + (b.availableQuantity ?? 0);
    }
  });

  // Lotes de la FGPO seleccionada (el campo Lots se habilita solo con FGPO).
  // Se omiten los lotes sin yardas disponibles, salvo los ya seleccionados o
  // cuando aún no hay datos de saldos confiables (cargando o con error).
  const lotsForFgpo = lotList.filter(o => {
    if (o.fgpoId !== form.FGPOId) return false;
    if (form.LotIds.includes(o.id)) return true;
    if (loadingBalances || balancesError) return true;
    return (lotAvailableMap[o.id] ?? 0) > 0;
  });

  // Primer rollo que pertenece a un lote seleccionado: provee la información
  // de la tela (descripción, estilo, color, familia) para el panel informativo.
  const selectedLotRoll = balances.find(b => b.lotId != null && form.LotIds.includes(b.lotId));

  // Vistas previas de columnas calculadas (fórmula del Excel)
  const n = (s: string) => s === '' ? 0 : Number(s);
  const remaining = Math.max(0, n(form.ReservedQuantity) - n(form.ReleasedQuantity));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <BookmarkAddIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Fabric Reservation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Fabric reservation approved for cutting (pending calculated automatically)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Reservation</Button>
        </Box>
      </Box>

      {totalsError && <Alert severity="warning" sx={{ mb: 1 }}>{totalsError}</Alert>}
      <ModuleTotalsBar
        suffix="yd"
        items={[
          { label: 'Reserved', value: resTotals.reserved.toLocaleString(), color: 'warning.main' },
          { label: 'Released', value: resTotals.released.toLocaleString(), color: 'info.main' },
          { label: 'Active pending', value: resTotals.pending.toLocaleString(), color: 'primary.main' },
          { label: 'Active reservations', value: resTotals.count.toLocaleString(), color: 'text.disabled', suffix: '' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {balancesError && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setBalancesError('')}>{balancesError}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Fabric PO, FGPO, Component, Lot, Status..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment> : null } }}
            sx={{ flex: 1, maxWidth: 500 }} />
          <Button variant="outlined" type="submit">Search</Button>
        </Box>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Date', 'Fabric PO', 'FGPO', 'Component', 'Lot', 'Reserved', 'UOM', 'Released', 'Remaining', 'Status', 'Reserved By', 'Rolls', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No reservations found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first reservation</Button>
                </TableCell></TableRow>
              ) : items.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{fmt(r.reservationDate)}</TableCell>
                  <TableCell>{r.fabricPONumber || '-'}</TableCell>
                  <TableCell>{r.fgpoNumber || '-'}</TableCell>
                  <TableCell>{r.componentCode || '-'}</TableCell>
                  <TableCell>{r.lotNumber || '-'}</TableCell>
                  <TableCell>{r.reservedQuantity}</TableCell>
                  <TableCell>{r.uom || '-'}</TableCell>
                  <TableCell>{r.releasedQuantity}</TableCell>
                  <TableCell><Typography color="warning.main" sx={{ fontWeight: 600 }}>{r.remainingReservation}</Typography></TableCell>
                  <TableCell><Chip label={r.status || 'N/A'} size="small" color={sc(r.status ?? '')} /></TableCell>
                  <TableCell>{r.reservedByName || '-'}</TableCell>
                  <TableCell>
                    {r.hasRollAssignment
                      ? <Chip label={`${(r.rolls ?? []).length} roll(s)`} size="small" variant="outlined" color="info" />
                      : <Chip label="No roll" size="small" variant="outlined" color="default" />}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="success" title="Release" onClick={() => openRelease(r)}><UnarchiveIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(r); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingId ? 'Edit Reservation' : 'New Reservation'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary">References</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Reservation Date *" type="date" value={form.ReservationDate} onChange={e => setF('ReservationDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Fabric PO</InputLabel>
                <Select value={form.FabricPOId || ''} label="Fabric PO" onChange={e => setF('FabricPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>No Fabric PO (customer fabric)</em></MenuItem>
                  {fabricPOList.map((f: any) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => {
                  const id = Number(e.target.value);
                  setF('FGPOId', id);
                  setF('LotIds', []);
                  if (id) loadBalances(id); else setBalances([]);
                }}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((o: any) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Lots</InputLabel>
                <Select multiple value={form.LotIds} label="Lots"
                  disabled={!form.FGPOId}
                  onChange={e => setF('LotIds', e.target.value as number[])}
                  renderValue={(sel) => {
                    const ids = sel as number[];
                    if (ids.length === 0) return <em>No lot</em>;
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {ids.map(id => {
                          const opt = lotList.find(o => o.id === id);
                          return <Chip key={id} label={opt?.label ?? id} size="small" />;
                        })}
                      </Box>
                    );
                  }}>
                  {lotsForFgpo.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Component (from Fabric PO)" value={derivedComponent} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="UOM (from Fabric PO)" value={derivedUom} slotProps={{ input: { readOnly: true } }} /></Grid>

            {selectedLotRoll && (
              <Grid size={{ xs: 12 }}>
                <Paper elevation={1} sx={{ p: 2, backgroundColor: 'primary.light' }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Description</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedLotRoll.fabricDescription || '-'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Style</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedLotRoll.style || '-'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Color</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedLotRoll.color || '-'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">Family</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedLotRoll.family || '-'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Quantities (input)</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Reserved Quantity" type="number" value={form.ReservedQuantity} onChange={e => setF('ReservedQuantity', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Released Quantity" type="number" value={form.ReleasedQuantity} onChange={e => setF('ReleasedQuantity', e.target.value)} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Roll assignment (optional)</Typography></Divider></Grid>
            {loadingBalances ? (
              <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption" color="text.secondary">Loading rolls...</Typography></Box></Grid>
            ) : availableRolls.length === 0 ? (
              <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary">
                {form.FGPOId ? 'No rolls available for the selected filters (FGPO/Fabric PO/Lots).' : 'Select FGPO to view available rolls.'}
              </Typography></Grid>
            ) : (
              <>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField size="small" placeholder={`Search roll (${availableRolls.length} available)...`}
                      value={rollSearch}
                      onChange={e => { setRollSearch(e.target.value); setRollVisible(ROLLS_PER_PAGE); }}
                      sx={{ flex: 1, minWidth: 220 }}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }} />
                    <Button variant="outlined" size="small" onClick={handleSelectAllRolls}>
                      Select all ({availableRolls.length})
                    </Button>
                    <Button variant="text" size="small" color="inherit" onClick={handleClearRolls}>
                      Clear
                    </Button>
                  </Box>
                </Grid>
                {visibleRolls.map(r => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.rollReceivingId}>
                    <TextField fullWidth size="small"
                      label={`${r.rollNumber}${r.lotNumber ? ` · lot ${r.lotNumber}` : ''} — avail. ${r.availableQuantity} / reserved ${r.reservedQuantity} / physical ${r.physicalQuantity}`}
                      type="number" value={rollInputs[r.rollReceivingId] ?? ''}
                      onChange={e => setRollQty(r.rollReceivingId, e.target.value)} />
                  </Grid>
                ))}
                {visibleRolls.length < filteredRolls.length && (
                  <Grid size={{ xs: 12 }}>
                    <Button variant="text" size="small" onClick={() => setRollVisible(v => v + ROLLS_PER_PAGE)}>
                      Show more ({filteredRolls.length - visibleRolls.length} remaining)
                    </Button>
                  </Grid>
                )}
                {filteredRolls.length === 0 && (
                  <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary">
                    No rolls match the search.
                  </Typography></Grid>
                )}
              </>
            )}

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Calculated automatically</Typography></Divider></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><TextField fullWidth size="small" label="Remaining Reservation" value={remaining} slotProps={{ input: { readOnly: true } }} /></Grid>

            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Status & Responsible</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.Status} label="Status" onChange={e => setF('Status', e.target.value)}>
                  {RESERVATION_STATUS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Reserved By</InputLabel>
                <Select value={form.ReservedByUserId || ''} label="Reserved By" onChange={e => setF('ReservedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Approved By</InputLabel>
                <Select value={form.ApprovedByUserId || ''} label="Approved By" onChange={e => setF('ApprovedByUserId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a User...</em></MenuItem>
                  {userList.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Last Updated" type="date" value={form.LastUpdated} onChange={e => setF('LastUpdated', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setF('Comments', e.target.value)} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>{editingId ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reservation Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Date</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(viewItem.reservationDate)}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fabricPONumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Component / Lot / UOM</Typography><Typography>{viewItem.componentCode || '-'} / {viewItem.lotNumber || '-'} / {viewItem.uom || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Reserved</Typography><Typography>{viewItem.reservedQuantity}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Released</Typography><Typography>{viewItem.releasedQuantity}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Remaining</Typography><Typography color="warning.main" sx={{ fontWeight: 600 }}>{viewItem.remainingReservation}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={viewItem.status || '-'} size="small" color={sc(viewItem.status ?? '')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Reserved By</Typography><Typography>{viewItem.reservedByName || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Approved By</Typography><Typography>{viewItem.approvedByName || '-'}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Assigned rolls</Typography></Grid>
              {(viewItem.rolls && viewItem.rolls.length > 0) ? viewItem.rolls.map(l => (
                <Grid size={{ xs: 12, sm: 6 }} key={l.id}>
                  <Typography variant="body2">{l.rollNumber} — reserved {l.reservedQuantity} / released {l.releasedQuantity}</Typography>
                </Grid>
              )) : (
                <Grid size={{ xs: 12 }}><Typography variant="body2" color="text.secondary">Historical reservation without an assigned roll</Typography></Grid>
              )}
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={releaseOpen} onClose={() => setReleaseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Release reservation</DialogTitle>
        <DialogContent>
          {releaseError && <Alert severity="error" sx={{ mb: 2 }}>{releaseError}</Alert>}
          {releaseItem && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2">Fabric PO <b>{releaseItem.fabricPONumber}</b> · FGPO <b>{releaseItem.fgpoNumber}</b></Typography>
                <Typography variant="body2" color="text.secondary">Reserved {releaseItem.reservedQuantity} · Released {releaseItem.releasedQuantity}</Typography>
                <Typography variant="body2" color="warning.main">Pending {releaseItem.remainingReservation}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Quantity to release" type="number" value={releaseQty}
                  onChange={e => setReleaseQty(e.target.value)} slotProps={{ htmlInput: { min: 0, max: releaseItem.remainingReservation } }} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReleaseOpen(false)} disabled={releasing}>Cancel</Button>
          <Button variant="contained" onClick={handleRelease} disabled={releasing} startIcon={releasing ? <CircularProgress size={18} /> : null}>
            {releasing ? 'Releasing...' : 'Release'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FabricReservationPage;
