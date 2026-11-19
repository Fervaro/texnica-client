import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Grid, Select
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
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

interface ExitImportRow {
  rowNumber: number;
  sourceRows: number[];
  rollReceivingId: number;
  uniqueId: string;
  rollNumber: string;
  quantity: number;
  error?: string;
}

interface ExitImportRejectedRow {
  uniqueId: string;
  rollNumber: string;
  quantity: number;
  availableYards: number;
  shortageYards: number;
  sourceRows: number[];
  reason: string;
}

const normalizeHeader = (value: unknown) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<ExitImportRow[]>([]);
  const [rejectedImportRows, setRejectedImportRows] = useState<ExitImportRejectedRow[]>([]);
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [importReference, setImportReference] = useState('');
  const [importComments, setImportComments] = useState('');
  const [importError, setImportError] = useState('');

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

  const openImport = () => {
    setImportRows([]); setImportFileName(''); setImportError(''); setImportReference(''); setImportComments('');
    setImportDate(new Date().toISOString().split('T')[0]); setImportOpen(true);
  };

  const downloadExitTemplate = async () => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([['ID', 'SALIDA EN YDS']]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'SALIDAS');
    XLSX.writeFile(workbook, 'fabric-exit-template.xlsx');
  };

  const downloadRejectedExits = async () => {
    const XLSX = await import('xlsx');
    const rows = rejectedImportRows.map(row => ({
      ID: row.uniqueId,
      'SALIDA EN YDS': row.quantity,
      'ROLL NUMBER': row.rollNumber,
      'AVAILABLE YDS': row.availableYards,
      'OVERAGE YDS': row.shortageYards,
      'EXCEL ROWS': row.sourceRows.join(', '),
      REASON: row.reason,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'SALIDAS');
    XLSX.writeFile(workbook, 'fabric-exit-rejected-rolls.xlsx');
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setImportError(''); setImportRows([]); setRejectedImportRows([]); setImportFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetName = workbook.SheetNames.find(name => normalizeHeader(name) === 'salidas');
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error('The workbook must contain the SALIDAS worksheet.');
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      const headerIndex = matrix.findIndex(row => {
        const headers = row.map(normalizeHeader);
        return headers.includes('id') && headers.includes('salidaenyds');
      });
      if (headerIndex < 0) throw new Error('The SALIDAS worksheet must include the ID and SALIDA EN YDS columns. ID Ticket is not the roll ID.');
      const headers = matrix[headerIndex].map(value => String(value ?? '').trim());
      const idIndex = headers.findIndex(value => normalizeHeader(value) === 'id');
      const quantityIndex = headers.findIndex(value => normalizeHeader(value) === 'salidaenyds');

      const rollMap = new Map<string, RollReceiving[]>();
      rolls.forEach(roll => {
        const key = String(roll.uniqueId ?? '').trim().toLowerCase();
        if (key) rollMap.set(key, [...(rollMap.get(key) ?? []), roll]);
      });
      const rows: ExitImportRow[] = [];
      const rowsByRollId = new Map<number, ExitImportRow>();
      matrix.slice(headerIndex + 1).forEach((record, index) => {
        const rowNumber = headerIndex + index + 2;
        const rawId = String(record[idIndex] ?? '').trim();
        const rawQuantity = record[quantityIndex];
        if (!rawId && (rawQuantity === '' || rawQuantity == null)) return;
        const matches = rollMap.get(rawId.toLowerCase()) ?? [];
        const quantity = typeof rawQuantity === 'number' ? rawQuantity : Number(String(rawQuantity).replace(/,/g, '').trim());
        let error = '';
        if (!rawId) error = 'ID is required.';
        else if (matches.length === 0) error = 'ID was not found in active roll receipts.';
        else if (matches.length > 1) error = 'ID is ambiguous; it appears more than once.';
        else if (!(quantity > 0) || !Number.isFinite(quantity)) error = 'Quantity must be greater than zero.';
        if (!error && matches.length === 1) {
          const existing = rowsByRollId.get(matches[0].id);
          if (existing) {
            existing.quantity += quantity;
            existing.sourceRows.push(rowNumber);
            return;
          }
        }
        const parsedRow: ExitImportRow = {
          rowNumber,
          sourceRows: [rowNumber],
          rollReceivingId: matches.length === 1 ? matches[0].id : 0,
          uniqueId: rawId,
          rollNumber: matches.length === 1 ? String(matches[0].rollNumber ?? '') : '',
          quantity,
          error: error || undefined,
        };
        rows.push(parsedRow);
        if (!error && matches.length === 1) rowsByRollId.set(matches[0].id, parsedRow);
      });
      if (!rows.length) throw new Error('The SALIDAS worksheet has no non-empty data rows.');
      setImportRows(rows);
    } catch (err: any) {
      setImportError(err?.message || 'Could not read the Excel file.');
    }
  };

  const handleImport = async () => {
    setImportError('');
    if (!importDate) { setImportError('Movement date is required.'); return; }
    const invalid = importRows.filter(row => row.error);
    if (invalid.length) { setImportError(`Correct the ${invalid.length} invalid row(s) before importing.`); return; }
    if (!importRows.length) { setImportError('Select an Excel file with valid rows first.'); return; }
    const batchKey = `EXCEL-OUT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setImporting(true);
    try {
      const result = await fabricMovementsApi.importAdjustmentOut({
        movementDate: new Date(importDate).toISOString(),
        referenceNumber: importReference || null,
        comments: importComments || `Bulk fabric exit from ${importFileName}`,
        rows: importRows.map((row, index) => ({
          rollReceivingId: row.rollReceivingId,
          quantity: row.quantity,
          excelRows: row.sourceRows,
          idempotencyKey: `${batchKey}-${index + 1}`,
        })),
      });
      const data = result.data ?? {};
      const rejected = data.rejected ?? data.Rejected ?? [];
      const rejectedRows: ExitImportRejectedRow[] = rejected.map((row: any) => ({
        uniqueId: row.uniqueId ?? row.UniqueId ?? '',
        rollNumber: row.rollNumber ?? row.RollNumber ?? '',
        quantity: Number(row.quantity ?? row.Quantity ?? 0),
        availableYards: Number(row.availableYards ?? row.AvailableYards ?? 0),
        shortageYards: Number(row.shortageYards ?? row.ShortageYards ?? 0),
        sourceRows: row.excelRows ?? row.ExcelRows ?? [],
        reason: row.reason ?? row.Reason ?? 'Requested yards exceed the available balance.',
      }));
      setRejectedImportRows(rejectedRows);
      setImportRows([]);
      const created = data.created ?? data.Created ?? 0;
      const totalYards = data.totalYards ?? data.TotalYards ?? 0;
      setSuccess(`Fabric exit imported: ${created} roll(s), ${num(totalYards)} yd. ${rejectedRows.length} roll(s) rejected for insufficient balance.`);
      if (rejectedRows.length === 0) setImportOpen(false);
      await Promise.all([load(), loadMovTotals()]);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || err?.response?.data || err?.message || 'Error importing fabric exit. No rows were imported.');
    } finally { setImporting(false); }
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
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={openImport}>Import Exit Excel</Button>
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

      <Dialog open={importOpen} onClose={() => !importing && setImportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Import Fabric Exit</DialogTitle>
        <DialogContent>
          {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
          {rejectedImportRows.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>
            {rejectedImportRows.length} roll(s) exceeded their available balance. The other rolls were imported. Download the rejected rows to review or correct them.
          </Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload the SALIDAS worksheet. Each row is matched by its unique ID (not ID Ticket), and SALIDA EN YDS is deducted from that roll. Rolls with enough balance are imported; overages are returned for review and download.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={downloadExitTemplate}>Download Template</Button>
            {rejectedImportRows.length > 0 && <Button variant="outlined" color="warning" startIcon={<FileDownloadIcon />} onClick={downloadRejectedExits}>Download Rejected Rolls ({rejectedImportRows.length})</Button>}
            <Button component="label" variant="contained" startIcon={<UploadFileIcon />}>
              Select Excel
              <input hidden type="file" accept=".xlsx,.xls" onChange={event => {
                void handleImportFile(event.target.files?.[0]);
                event.target.value = '';
              }} />
            </Button>
            {importFileName && <Typography variant="body2" sx={{ alignSelf: 'center' }}>{importFileName}</Typography>}
          </Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Movement Date *" type="date" value={importDate} onChange={event => setImportDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Reference Number" value={importReference} onChange={event => setImportReference(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Comments" value={importComments} onChange={event => setImportComments(event.target.value)} />
            </Grid>
          </Grid>
          {rejectedImportRows.length > 0 && <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>
                {['Excel Row(s)', 'ID', 'Roll Number', 'Requested (yd)', 'Available (yd)', 'Overage (yd)'].map(label => <TableCell key={label}>{label}</TableCell>)}
              </TableRow></TableHead>
              <TableBody>{rejectedImportRows.map((row, index) => (
                <TableRow key={`${row.uniqueId}-${index}`}>
                  <TableCell>{row.sourceRows.join(', ')}</TableCell>
                  <TableCell>{row.uniqueId || '-'}</TableCell>
                  <TableCell>{row.rollNumber || '-'}</TableCell>
                  <TableCell>{num(row.quantity)}</TableCell>
                  <TableCell>{num(row.availableYards)}</TableCell>
                  <TableCell>{num(row.shortageYards)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>}
          {importRows.length > 0 && <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {importRows.length} roll(s) to import from {importRows.reduce((total, row) => total + row.sourceRows.length, 0)} Excel row(s) · {importRows.filter(row => !row.error).length} valid · {importRows.filter(row => row.error).length} invalid
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>
                  {['Excel Row(s)', 'ID', 'Roll Number', 'Quantity (yd)', 'Validation'].map(label => <TableCell key={label}>{label}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>{importRows.map(row => (
                  <TableRow key={`${row.rowNumber}-${row.rollReceivingId}`}>
                    <TableCell>{row.sourceRows.join(', ')}</TableCell>
                    <TableCell>{row.uniqueId || '-'}</TableCell>
                    <TableCell>{row.rollNumber || '-'}</TableCell>
                    <TableCell>{Number.isFinite(row.quantity) ? num(row.quantity) : '-'}</TableCell>
                    <TableCell sx={{ color: row.error ? 'error.main' : 'success.main' }}>{row.error || 'Ready'}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </TableContainer>
          </>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>{rejectedImportRows.length > 0 ? 'Close' : 'Cancel'}</Button>
          <Button variant="contained" onClick={handleImport} disabled={importing || importRows.length === 0 || importRows.some(row => !!row.error)} startIcon={importing ? <CircularProgress size={18} /> : <UploadFileIcon />}>
            {importing ? 'Importing...' : `Import ${importRows.length} row(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FabricMovementsPage;
