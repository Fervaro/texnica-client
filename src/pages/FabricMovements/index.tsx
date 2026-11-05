import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Grid, Select
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fabricMovementsApi, rollReceivingsApi } from '../../utils/api';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';
import { FabricMovement, RollReceiving } from '../../types';

// Tipos permitidos por el negocio. Receipt y Consumption están bloqueados en el backend.
const MOVEMENT_TYPES = ['AdjustmentIn', 'AdjustmentOut', 'ReturnIn', 'Reversal'];

const sc = (s: string) => {
  const m: Record<string, any> = {
    Receipt: 'success', AdjustmentIn: 'success', AdjustmentOut: 'warning',
    ReturnIn: 'info', Reversal: 'default', Consumption: 'error',
  };
  return m[s] ?? 'default';
};

const emptyForm = {
  RollReceivingId: 0, MovementType: 'AdjustmentIn', Quantity: '',
  UnitOfMeasure: '', MovementDate: new Date().toISOString().split('T')[0],
  ReferenceType: '', ReferenceNumber: '', Comments: '', IsReversalOfId: 0,
};

const FabricMovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<FabricMovement[]>([]);
  const [rolls, setRolls] = useState<RollReceiving[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Filtros (cliente)
  const [filterRoll, setFilterRoll] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [mv, rl] = await Promise.all([fabricMovementsApi.getAll(), rollReceivingsApi.getAll()]);
      setMovements(mv.data ?? []);
      setRolls(rl.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error loading movements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); loadMovTotals(); }, []);

  const [movTotals, setMovTotals] = useState({ adjIn: 0, adjOut: 0, returnIn: 0, count: 0 });
  const [totalsError, setTotalsError] = useState('');
  const loadMovTotals = async () => {
    setTotalsError('');
    try {
      const res = await fabricMovementsApi.getTotals();
      const t = res.data ?? {};
      setMovTotals({
        adjIn: t.adjustmentIn ?? t.AdjustmentIn ?? 0,
        adjOut: t.adjustmentOut ?? t.AdjustmentOut ?? 0,
        returnIn: t.returnIn ?? t.ReturnIn ?? 0,
        count: t.movementsCount ?? t.MovementsCount ?? 0,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      setTotalsError(status === 403 ? 'No access to this Module.' : status ? `Error ${status} loading movement totals.` : 'Could not load movement totals.');
    }
  };

  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setSuccess('');
    // Clave de idempotencia estable por operación: evita duplicados si se reintenta el envío.
    setIdempotencyKey(`WEB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    setDialogOpen(true);
  };

  const selectedRollMovements = movements.filter(
    m => m.rollReceivingId === form.RollReceivingId && m.movementType !== 'Reversal'
  );

  const handleSave = async () => {
    setFormError('');
    if (!form.RollReceivingId) { setFormError('Roll is required.'); return; }
    const qty = Number(form.Quantity);
    if (!(qty > 0)) { setFormError('Quantity must be greater than zero.'); return; }
    if (form.MovementType === 'Reversal' && !form.IsReversalOfId) {
      setFormError('Select the original movement to reverse.'); return;
    }
    setSaving(true);
    try {
      await fabricMovementsApi.create({
        rollReceivingId: form.RollReceivingId,
        movementType: form.MovementType,
        quantity: qty,
        unitOfMeasure: form.UnitOfMeasure || null,
        movementDate: form.MovementDate ? new Date(form.MovementDate).toISOString() : new Date().toISOString(),
        referenceType: form.ReferenceType || null,
        referenceNumber: form.ReferenceNumber || null,
        idempotencyKey,
        isReversalOfId: form.MovementType === 'Reversal' ? (form.IsReversalOfId || null) : null,
        comments: form.Comments || null,
      });
      setDialogOpen(false);
      setSuccess('Movement registered successfully.');
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.response?.data || 'Error saving movement.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = movements.filter(m => {
    if (filterRoll && m.rollReceivingId !== filterRoll) return false;
    if (filterType && m.movementType !== filterType) return false;
    const d = (m.movementDate || '').split('T')[0];
    if (filterFrom && d < filterFrom) return false;
    if (filterTo && d > filterTo) return false;
    return true;
  });

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const num = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <SwapHorizIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Fabric Movements
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Physical movement history by roll — balance derived from movements
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Movement</Button>
        </Box>
      </Box>

      {totalsError && <Alert severity="warning" sx={{ mb: 1 }}>{totalsError}</Alert>}
      <ModuleTotalsBar
        suffix="yd"
        items={[
          { label: 'Positive adjustments', value: movTotals.adjIn.toLocaleString(), color: 'success.main' },
          { label: 'Negative adjustments', value: movTotals.adjOut.toLocaleString(), color: 'error.main' },
          { label: 'Returns', value: movTotals.returnIn.toLocaleString(), color: 'info.main' },
          { label: 'Movements', value: movTotals.count.toLocaleString(), color: 'text.disabled', suffix: '' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Roll</InputLabel>
          <Select value={filterRoll || ''} label="Roll" onChange={e => setFilterRoll(Number(e.target.value) || 0)}>
            <MenuItem value=""><em>All</em></MenuItem>
            {rolls.map(r => <MenuItem key={r.id} value={r.id}>{r.rollNumber || `Roll ${r.id}`}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filterType} label="Type" onChange={e => setFilterType(e.target.value)}>
            <MenuItem value=""><em>All</em></MenuItem>
            {MOVEMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="From" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="To" type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Date', 'Roll', 'Type', 'Quantity', 'UOM', 'Reference', 'Idempotency', 'Comments'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No movements found</Typography>
                </TableCell></TableRow>
              ) : filtered.map(m => (
                <TableRow key={m.id} hover>
                  <TableCell>{fmt(m.movementDate)}</TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{m.rollNumber || '-'}</Typography></TableCell>
                  <TableCell><Chip label={m.movementType} size="small" color={sc(m.movementType)} /></TableCell>
                  <TableCell>{num(m.quantity)}</TableCell>
                  <TableCell>{m.unitOfMeasure || '-'}</TableCell>
                  <TableCell>{m.referenceNumber || m.referenceType || '-'}</TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{m.idempotencyKey}</Typography></TableCell>
                  <TableCell>{m.comments || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Movement</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Roll *</InputLabel>
                <Select value={form.RollReceivingId || ''} label="Roll *" onChange={e => setF('RollReceivingId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a roll...</em></MenuItem>
                  {rolls.map(r => <MenuItem key={r.id} value={r.id}>{r.rollNumber || `Roll ${r.id}`}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type *</InputLabel>
                <Select value={form.MovementType} label="Type *" onChange={e => setF('MovementType', e.target.value)}>
                  {MOVEMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Quantity *" type="number" value={form.Quantity} onChange={e => setF('Quantity', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="UOM (optional)" value={form.UnitOfMeasure} onChange={e => setF('UnitOfMeasure', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Date" type="date" value={form.MovementDate} onChange={e => setF('MovementDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            {form.MovementType === 'Reversal' && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Original movement to reverse *</InputLabel>
                  <Select value={form.IsReversalOfId || ''} label="Original movement to reverse *" onChange={e => setF('IsReversalOfId', Number(e.target.value))}>
                    <MenuItem value=""><em>Select...</em></MenuItem>
                    {selectedRollMovements.map(m => <MenuItem key={m.id} value={m.id}>{m.movementType} — {num(m.quantity)} ({fmt(m.movementDate)})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Reference type" value={form.ReferenceType} onChange={e => setF('ReferenceType', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Reference number" value={form.ReferenceNumber} onChange={e => setF('ReferenceNumber', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setF('Comments', e.target.value)} multiline rows={2} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Idempotency: {idempotencyKey}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FabricMovementsPage;
