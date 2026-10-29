import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { packingControlsApi, boxTypesApi } from '../utils/api';
import { blockNegativeKey } from '../utils/validation';

export interface PackingFgpoOption {
  id: number;
  label: string;
  style?: string;
  color?: string;
}

export interface PackingUserOption {
  id: number;
  label: string;
}

interface PackingBoxOption {
  id: number;
  boxCode: string;
  style?: string;
  color?: string;
  size?: string;
  qtyPerBox: number;
}

interface PackingRowDraft {
  key: string;
  fgpoId: number;
  boxTypeId: number;
  boxes: string;
  remarks: string;
}

interface PackingBulkGridProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fgpoOptions: PackingFgpoOption[];
  userOptions: PackingUserOption[];
  onSaved: () => void | Promise<void>;
}

const newKey = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().split('T')[0];

const cellStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 88,
  padding: '6px 8px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: '#1f2937',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
};
const cellErrStyle: React.CSSProperties = { ...cellStyle, borderColor: '#d32f2f', backgroundColor: '#fff7f7' };
const cellReadonlyStyle: React.CSSProperties = { ...cellStyle, backgroundColor: '#f1f5f9', color: '#64748b' };

const makeRow = (): PackingRowDraft => ({ key: newKey(), fgpoId: 0, boxTypeId: 0, boxes: '', remarks: '' });

const fmtNum = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });

interface RowProps {
  row: PackingRowDraft;
  index: number;
  isOnlyRow: boolean;
  fgpoOptions: PackingFgpoOption[];
  boxOptions: PackingBoxOption[];
  onChange: (key: string, patch: Partial<PackingRowDraft>) => void;
  onRemove: (key: string) => void;
}

const PackingRow = React.memo(function PackingRow({
  row, index, isOnlyRow, fgpoOptions, boxOptions, onChange, onRemove,
}: RowProps) {
  const set = (patch: Partial<PackingRowDraft>) => onChange(row.key, patch);

  const fgpo = fgpoOptions.find(f => f.id === row.fgpoId);
  const fgpoErr = !row.fgpoId;

  // Cajas compatibles: Style y Color iguales a la FGPO (la talla NO se filtra).
  const compatible = boxOptions.filter(b =>
    (b.style ?? '') === (fgpo?.style ?? '') && (b.color ?? '') === (fgpo?.color ?? ''),
  );

  const box = boxOptions.find(b => b.id === row.boxTypeId);
  const boxErr = !row.boxTypeId;
  const boxes = Number(row.boxes) || 0;
  const boxesErr = boxes <= 0;
  const qtyPerBox = box?.qtyPerBox ?? 0;
  const packedQty = qtyPerBox * boxes;

  return (
    <TableRow hover>
      <TableCell sx={{ p: 0.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>{index + 1}</TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <select
          style={fgpoErr ? cellErrStyle : cellStyle}
          value={row.fgpoId || ''}
          onChange={e => set({ fgpoId: Number(e.target.value), boxTypeId: 0 })}
          title={fgpoErr ? 'Requerido' : ''}
        >
          <option value="">Seleccione FGPO...</option>
          {fgpoOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <select
          style={boxErr ? cellErrStyle : cellStyle}
          value={row.boxTypeId || ''}
          onChange={e => set({ boxTypeId: Number(e.target.value) })}
          title={boxErr ? 'Requerido' : ''}
        >
          <option value="">Seleccione caja...</option>
          {compatible.map(b => (
            <option key={b.id} value={b.id}>{b.boxCode}{b.size ? ` (${b.size})` : ''} — {b.qtyPerBox}/caja</option>
          ))}
        </select>
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={boxesErr ? cellErrStyle : cellStyle} inputMode="numeric" value={row.boxes} onChange={e => set({ boxes: e.target.value })} onKeyDown={blockNegativeKey} title={boxesErr ? 'Debe ser ≥ 1' : ''} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}><div style={{ ...cellReadonlyStyle, textAlign: 'right' }}>{fmtNum(packedQty)}</div></TableCell>
      <TableCell sx={{ p: 0.5 }}><div style={cellReadonlyStyle}>0</div></TableCell>
      <TableCell sx={{ p: 0.5 }}><div style={cellReadonlyStyle}>0</div></TableCell>
      <TableCell sx={{ p: 0.5 }}><div style={cellReadonlyStyle}>0</div></TableCell>
      <TableCell sx={{ p: 0.5 }}><div style={cellReadonlyStyle}>0</div></TableCell>
      <TableCell sx={{ p: 0.5 }}><input style={cellStyle} value={row.remarks} onChange={e => set({ remarks: e.target.value })} /></TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <button
          type="button"
          onClick={() => onRemove(row.key)}
          disabled={isOnlyRow}
          title="Quitar fila"
          style={{ border: 'none', background: 'none', color: '#d32f2f', fontSize: 16, lineHeight: 1, padding: '2px 6px', cursor: isOnlyRow ? 'default' : 'pointer', opacity: isOnlyRow ? 0.35 : 1 }}
        >✕</button>
      </TableCell>
    </TableRow>
  );
});

const PackingBulkGrid: React.FC<PackingBulkGridProps> = ({ open, onClose, title, fgpoOptions, userOptions, onSaved }) => {
  const [packingDate, setPackingDate] = useState(today());
  const [responsiblePersonId, setResponsiblePersonId] = useState(0);
  const [boxOptions, setBoxOptions] = useState<PackingBoxOption[]>([]);
  const [rows, setRows] = useState<PackingRowDraft[]>([makeRow()]);
  const [addCount, setAddCount] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPackingDate(today());
      setResponsiblePersonId(0);
      setRows([makeRow()]);
      setAddCount(1);
      setError('');
      setSaving(false);
      setBoxOptions([]);
      boxTypesApi.getAll()
        .then(res => setBoxOptions((res.data ?? []).map((raw: any): PackingBoxOption => ({
          id: raw.id ?? raw.ID ?? 0,
          boxCode: raw.boxCode ?? raw.BoxCode ?? '',
          style: raw.style ?? raw.Style ?? '',
          color: raw.color ?? raw.Color ?? '',
          size: raw.size ?? raw.Size ?? '',
          qtyPerBox: raw.qtyPerBox ?? raw.QtyPerBox ?? 0,
        }))))
        .catch(() => setBoxOptions([]));
    }
  }, [open]);

  const handleRowChange = (key: string, patch: Partial<PackingRowDraft>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const handleRowRemove = (key: string) =>
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : prev));

  const addRows = () => {
    const n = Math.max(1, Math.min(2000, Math.floor(Number(addCount) || 1)));
    setRows(prev => [...prev, ...Array.from({ length: n }, () => makeRow())]);
  };
  const addSingleRow = () => setRows(prev => [...prev, makeRow()]);

  const handleSave = async () => {
    setError('');
    const errs: string[] = [];
    rows.forEach((r, i) => {
      if (!r.fgpoId) errs.push(`Fila ${i + 1}: FGPO es obligatorio.`);
      if (!r.boxTypeId) errs.push(`Fila ${i + 1}: Box Type es obligatorio.`);
      const box = boxOptions.find(b => b.id === r.boxTypeId);
      if (box && box.qtyPerBox <= 0) errs.push(`Fila ${i + 1}: la caja "${box.boxCode}" no tiene Qty/Box configurado.`);
      const boxes = Number(r.boxes) || 0;
      if (boxes <= 0) errs.push(`Fila ${i + 1}: la cantidad de cajas debe ser mayor que 0.`);
    });
    if (errs.length) { setError(errs.slice(0, 6).join(' | ') + (errs.length > 6 ? ' …' : '')); return; }

    setSaving(true);
    try {
      await packingControlsApi.createBulk({
        records: rows.map(r => {
          const box = boxOptions.find(b => b.id === r.boxTypeId);
          const qpb = box?.qtyPerBox ?? 0;
          const boxes = Number(r.boxes) || 0;
          return {
            packingDate: packingDate ? new Date(packingDate).toISOString() : new Date().toISOString(),
            fgpoId: r.fgpoId,
            boxTypeId: r.boxTypeId || null,
            qcPassedQty: 0,
            receivedByPackingQty: 0,
            foldedQty: 0,
            polybaggedQty: 0,
            packedQty: qpb * boxes,
            pcsPerCarton: qpb,
            responsiblePersonId: responsiblePersonId || null,
            remarks: r.remarks || null,
          };
        }),
      });
      await onSaved();
    } catch (err: any) {
      setError(
        err?.response?.data?.message
        || (typeof err?.response?.data === 'string' ? err.response.data : null)
        || err?.message
        || 'Error al guardar.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField size="small" label="Packing Date *" type="date" value={packingDate} onChange={e => setPackingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Responsible Person</InputLabel>
            <Select value={responsiblePersonId || ''} label="Responsible Person" onChange={e => setResponsiblePersonId(Number(e.target.value))}>
              <MenuItem value=""><em>Seleccione...</em></MenuItem>
              {userOptions.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField size="small" label="Filas a agregar" type="number" value={addCount} onChange={e => setAddCount(Number(e.target.value))} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 1, max: 2000 } }} />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addRows}>Agregar</Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addSingleRow}>+1 fila</Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <TableContainer sx={{ maxHeight: 460, border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                {['#', 'FGPO *', 'Box Type *', 'Cajas *', 'Packed Qty', 'QC Passed', 'Rec. by Packing', 'Folded', 'Polybagged', 'Remarks', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <PackingRow
                  key={r.key}
                  row={r}
                  index={i}
                  isOnlyRow={rows.length <= 1}
                  fgpoOptions={fgpoOptions}
                  boxOptions={boxOptions}
                  onChange={handleRowChange}
                  onRemove={handleRowRemove}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {rows.length} fila(s) — Packed Qty = Qty/Box × cajas. La fecha y el responsable aplican a todas las filas.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>
          {saving ? 'Guardando...' : `Crear ${rows.length} registro${rows.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PackingBulkGrid;
