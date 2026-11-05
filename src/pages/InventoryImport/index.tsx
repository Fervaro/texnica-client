import React, { useRef, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, TextField,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import * as XLSX from 'xlsx';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { fabricInventoryImportApi } from '../../utils/api';

type RowDto = {
  fecha?: string;
  contenedor?: string;
  factura?: string;
  descripcion?: string;
  proveedor?: string;
  origen?: string;
  locacion?: string;
  tono?: string;
  estilo?: string;
  color?: string;
  familia?: string;
  bacht?: string;
  rollNumber?: string;
  uniqueId?: string;
  yardasRecibidas?: number;
  kgTicket?: number;
  lbTicket?: number;
  lbsFisico?: number;
  anchoTicket?: number;
  anchoReal?: number;
  gms?: number;
  orden?: string;
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const HEADER_MAP: Record<string, keyof RowDto> = {
  fecha: 'fecha',
  contenedor: 'contenedor',
  'numero de factura/remision': 'factura',
  descripcion: 'descripcion',
  proveedor: 'proveedor',
  origen: 'origen',
  locacion: 'locacion',
  tono: 'tono',
  estilo: 'estilo',
  color: 'color',
  familia: 'familia',
  bacht: 'bacht',
  'id ticket': 'rollNumber',
  id: 'uniqueId',
  'yardas recibidas': 'yardasRecibidas',
  'kg ticket': 'kgTicket',
  'kg tiket': 'kgTicket',
  'lb ticket': 'lbTicket',
  'lb tiket': 'lbTicket',
  'lbs fisico': 'lbsFisico',
  'ancho ticket': 'anchoTicket',
  'ancho real': 'anchoReal',
  gms: 'gms',
  orden: 'orden',
};

const NUMERIC_FIELDS = new Set([
  'yardasRecibidas', 'kgTicket', 'lbTicket', 'lbsFisico', 'anchoTicket', 'anchoReal', 'gms',
]);

// Campos que el modo Actualizar puede sobrescribir (solo físicos).
const UPDATE_FIELDS = [
  'yardasRecibidas', 'kgTicket', 'lbTicket', 'lbsFisico', 'anchoTicket', 'anchoReal', 'gms', 'tono', 'locacion',
] as const;

// Llaves para identificar el rollo existente en modo Actualizar.
const KEY_FIELDS = ['rollNumber', 'bacht', 'uniqueId'] as const;

const toIso = (v: any): string | undefined => {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString();
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

const toNum = (v: any): number | undefined => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const InventoryImport: React.FC = () => {
  const { options: fgpoList } = useFgpoOptions();
  const [mode, setMode] = useState<'import' | 'update'>('import');
  const [fgpoId, setFgpoId] = useState(0);
  const [campoMaster, setCampoMaster] = useState('');
  const [rows, setRows] = useState<RowDto[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    setRows([]);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets['INGRESOS'] ?? wb.Sheets[wb.SheetNames[0]];
      if (!ws) {
        setError('The INGRESOS sheet was not found in the file.');
        return;
      }
      const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
      const headers = (aoa[0] || []).map((h: any) => norm(String(h ?? '')));
      const idx: Record<string, number> = {};
      headers.forEach((h, i) => {
        if (h && idx[h] === undefined) idx[h] = i;
      });

      const mapped: RowDto[] = [];
      aoa.slice(1).forEach((r) => {
        if (!r || !r.some((c: any) => c !== '' && c != null)) return;
        const row: RowDto = {};
        for (const [header, field] of Object.entries(HEADER_MAP)) {
          const col = idx[header];
          if (col === undefined) continue;
          const raw = r[col];
          if (field === 'fecha') {
            row.fecha = toIso(raw);
          } else if (NUMERIC_FIELDS.has(field)) {
            (row as any)[field] = toNum(raw);
          } else {
            (row as any)[field] = raw == null ? undefined : String(raw).trim();
          }
        }
        mapped.push(row);
      });
      setRows(mapped);
      if (mapped.length === 0) setError('The file contains no data rows.');
    } catch (e: any) {
      setError(e?.message || 'Error reading the file.');
    }
  };

  const handleImport = async () => {
    setError('');
    setResult(null);
    if (!fgpoId && !campoMaster.trim()) {
      setError('Select a FGPO or enter CampoMaster (administrators only).');
      return;
    }
    if (!rows.length) {
      setError('There are no rows to import.');
      return;
    }
    setImporting(true);
    try {
      const res = await fabricInventoryImportApi.import({
        fgpoId: campoMaster.trim() ? 0 : fgpoId,
        campoMaster: campoMaster.trim() || null,
        rows,
      });
      setResult(res.data ?? res);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data || e?.message || 'Error importing.');
    } finally {
      setImporting(false);
    }
  };

  const handleUpdate = async () => {
    setError('');
    setResult(null);
    if (!rows.length) {
      setError('There are no rows to update.');
      return;
    }
    const payload = rows.map((r) => {
      const key: Record<string, string | undefined> = {};
      for (const f of KEY_FIELDS) {
        const v = (r as any)[f];
        if (v !== undefined && v !== '') key[f] = String(v).trim();
      }
      const fields: Record<string, any> = {};
      for (const f of UPDATE_FIELDS) {
        const v = (r as any)[f];
        if (v !== undefined) fields[f] = v;
      }
      return { key, fields };
    });

    if (payload.some((p) => !p.key.rollNumber && !p.key.bacht && !p.key.uniqueId)) {
      setError('Each row must include at least ID Ticket, Batch or ID to identify the roll.');
      return;
    }

    setImporting(true);
    try {
      const res = await fabricInventoryImportApi.update({
        fgpoId: campoMaster.trim() ? 0 : fgpoId || null,
        campoMaster: campoMaster.trim() || null,
        rows: payload,
      });
      setResult(res.data ?? res);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data || e?.message || 'Error updating.');
    } finally {
      setImporting(false);
    }
  };

  const fmt = (v: any) => (v == null ? '-' : String(v));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <ImportExportIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Import Inventory (INGRESOS)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mode === 'update'
              ? 'Updates the physical fields of existing rolls (key: ID Ticket + Batch + ID).'
              : 'Loads the fabric warehouse inventory Excel. One row = one received roll.'}
          </Typography>
        </Box>
      </Box>

      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        onChange={(_, v) => {
          if (!v) return;
          setMode(v);
          setRows([]);
          setResult(null);
          setError('');
          setFileName('');
        }}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="import">Import (receipts)</ToggleButton>
        <ToggleButton value="update">Update</ToggleButton>
      </ToggleButtonGroup>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>FGPO</InputLabel>
          <Select value={fgpoId || ''} label="FGPO" onChange={e => setFgpoId(Number(e.target.value))}>
            <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
            {fgpoList.map(f => (
              <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="CampoMaster (without FGPO)"
          value={campoMaster}
          onChange={e => setCampoMaster(e.target.value)}
          helperText="Administrators only"
          sx={{ minWidth: 240 }}
        />

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()}>
          Select Excel
        </Button>
        {fileName && <Typography variant="body2" color="text.secondary">{fileName} — {rows.length} row(s)</Typography>}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {result && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {mode === 'update' ? (
            <>
              Update completed: {result.updated ?? result.Updated ?? 0} updated,{' '}
              {result.notFound ?? result.NotFound ?? 0} not found,{' '}
              {result.skipped ?? result.Skipped ?? 0} skipped.
            </>
          ) : (
            <>
              Import completed: {result.createdRolls ?? result.CreatedRolls ?? 0} rolls,{' '}
              {result.createdReceivings ?? result.CreatedReceivings ?? 0} receivings,{' '}
              {result.createdLots ?? result.CreatedLots ?? 0} lots,{' '}
              {result.createdFamilies ?? result.CreatedFamilies ?? 0} families,{' '}
              {result.skippedRolls ?? result.SkippedRolls ?? 0} skipped (already existed).
            </>
          )}
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <Paper sx={{ overflow: 'hidden', mb: 2 }}>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    {['Batch', 'ID Ticket', 'ID', 'Yards', 'Color', 'Style', 'Family', 'Container', 'Invoice', 'Date'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.slice(0, 200).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{fmt(r.bacht)}</TableCell>
                      <TableCell>{fmt(r.rollNumber)}</TableCell>
                      <TableCell>{fmt(r.uniqueId)}</TableCell>
                      <TableCell>{fmt(r.yardasRecibidas)}</TableCell>
                      <TableCell>{fmt(r.color)}</TableCell>
                      <TableCell>{fmt(r.estilo)}</TableCell>
                      <TableCell>{fmt(r.familia)}</TableCell>
                      <TableCell>{fmt(r.contenedor)}</TableCell>
                      <TableCell>{fmt(r.factura)}</TableCell>
                      <TableCell>{r.fecha ? new Date(r.fecha).toLocaleDateString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="contained"
              onClick={mode === 'update' ? handleUpdate : handleImport}
              disabled={importing || (mode === 'import' && !fgpoId && !campoMaster.trim())}
              startIcon={importing ? <CircularProgress size={18} /> : <ImportExportIcon />}
            >
              {importing
                ? (mode === 'update' ? 'Updating...' : 'Importing...')
                : `${mode === 'update' ? 'Update' : 'Import'} ${rows.length} roll(s)`}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default InventoryImport;
