import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { rollReceivingsApi } from '../utils/api';
import { blockNegativeKey } from '../utils/validation';

export interface RollBulkReceivingOption {
  id: number;
  label: string;
  supplier?: string;
  warehouseLocation?: string;
  fabricPONumber?: string;
  fgpoNumber?: string;
  customerName?: string;
}

export interface RollRowDraft {
  key: string;
  rollNumber: string;
  supplierRollNumber: string;
  lotNumber: string;
  shipmentLotId: number | null;
  grossWeight: string;
  netWeight: string;
  actualYardage: string;
  actualWidth: string;
  actualGSM: string;
  shadeGroup: string;
  damagedQty: string;
  condition: string;
  warehouseLocation: string;
  comments: string;
}

interface RollBulkGridProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Recepción preseleccionada (0 = sin selección). */
  receivingId?: number;
  receivingList: RollBulkReceivingOption[];
  conditionOptions: string[];
  shadeOptions: string[];
  defaultCondition?: string;
  /** Lote predefinido para cada fila nueva (p. ej. al crear desde un lote de embarque). */
  lotNumberPreset?: string;
  /** Número inicial sugerido para Roll Number (continúa la numeración existente). */
  rollNumberStart?: number;
  /** Callback mostrado cuando no hay ninguna Recepción disponible. */
  onGoToReceiving?: () => void;
  onSaved: (createdIds: number[]) => void | Promise<void>;
}

const newKey = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const today = () => new Date().toISOString().split('T')[0];

const NEGATIVE_FIELDS: { key: keyof RollRowDraft; name: string }[] = [
  { key: 'grossWeight', name: 'Gross Weight' },
  { key: 'netWeight', name: 'Net Weight' },
  { key: 'actualYardage', name: 'Actual Yardage' },
  { key: 'actualWidth', name: 'Actual Width' },
  { key: 'actualGSM', name: 'Actual GSM' },
  { key: 'damagedQty', name: 'Damaged Qty' },
];

/** Crea una fila de rollo vacía (para grids embebidas). */
export const newRollRow = (opts: { lotNumber?: string; shipmentLotId?: number | null; condition?: string; warehouseLocation?: string } = {}): RollRowDraft => ({
  key: newKey(),
  rollNumber: '',
  supplierRollNumber: '',
  lotNumber: opts.lotNumber ?? '',
  shipmentLotId: opts.shipmentLotId ?? null,
  grossWeight: '',
  netWeight: '',
  actualYardage: '',
  actualWidth: '',
  actualGSM: '',
  shadeGroup: '',
  damagedQty: '',
  condition: opts.condition ?? 'Good',
  warehouseLocation: opts.warehouseLocation ?? '',
  comments: '',
});

/** Valida las filas: devuelve un mensaje de error o '' si todo está bien. */
export const validateRollRows = (rows: RollRowDraft[]): string => {
  const errs: string[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    if (!r.rollNumber.trim()) errs.push(`Fila ${i + 1}: Roll Number es obligatorio.`);
    else {
      const k = r.rollNumber.trim().toLowerCase();
      if (seen.has(k)) errs.push(`Fila ${i + 1}: Roll Number "${r.rollNumber.trim()}" duplicado.`);
      seen.add(k);
    }
    for (const f of NEGATIVE_FIELDS) {
      if (Number(r[f.key]) < 0) errs.push(`Fila ${i + 1}: ${f.name} no puede ser negativo.`);
    }
  });
  return errs.length ? errs.slice(0, 6).join(' | ') + (errs.length > 6 ? ' …' : '') : '';
};

/** Construye el payload del endpoint de alta masiva de rollos. */
export const buildRollsPayload = (receivingId: number, rows: RollRowDraft[], receivedDate: string, shipmentLotId?: number | null) => ({
  rolls: rows.map(r => ({
    receivingId,
    shipmentLotId: r.shipmentLotId ?? shipmentLotId ?? null,
    lotNumber: r.lotNumber || null,
    rollNumber: r.rollNumber.trim(),
    supplierRollNumber: r.supplierRollNumber || null,
    grossWeight: Number(r.grossWeight) || 0,
    netWeight: Number(r.netWeight) || 0,
    actualYardage: Number(r.actualYardage) || 0,
    actualWidth: Number(r.actualWidth) || 0,
    actualGSM: Number(r.actualGSM) || 0,
    shadeGroup: r.shadeGroup || null,
    damagedQty: Number(r.damagedQty) || 0,
    condition: r.condition,
    warehouseLocation: r.warehouseLocation || null,
    receivedDate: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
    comments: r.comments || null,
  })),
});

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

interface RollGridRowProps {
  row: RollRowDraft;
  index: number;
  duplicate: boolean;
  isOnlyRow: boolean;
  lockLot: boolean;
  lockRollNumber: boolean;
  lotOptions?: { id: number; lotNumber: string }[];
  onLotChange: (key: string, lotId: number) => void;
  shadeOptions: string[];
  conditionOptions: string[];
  onChange: (key: string, patch: Partial<RollRowDraft>) => void;
  onRemove: (key: string) => void;
}

/**
 * Fila memoizada y LIVIANA: usa inputs nativos (no TextField/Select de MUI) para que
 * se puedan renderizar cientos de filas sin congelar la página. Sólo se re-renderiza
 * cuando cambia su propia fila (o su flag de duplicado).
 */
const RollGridRow = React.memo(function RollGridRow({
  row, index, duplicate, isOnlyRow, lockLot, lockRollNumber, lotOptions, onLotChange, shadeOptions, conditionOptions, onChange, onRemove,
}: RollGridRowProps) {
  const rollErr = !row.rollNumber.trim() || duplicate;
  const set = (patch: Partial<RollRowDraft>) => onChange(row.key, patch);
  return (
    <TableRow hover>
      <TableCell sx={{ p: 0.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>{index + 1}</TableCell>
      <TableCell sx={{ p: 0.5 }}>
        {lockRollNumber ? (
          <Typography variant="body2" sx={{ px: 1, fontWeight: 600 }}>{row.rollNumber || index + 1}</Typography>
        ) : (
          <input
            style={rollErr ? cellErrStyle : cellStyle}
            value={row.rollNumber}
            onChange={e => set({ rollNumber: e.target.value })}
            placeholder="Roll #"
            title={rollErr ? (duplicate ? 'Duplicado' : 'Requerido') : ''}
          />
        )}
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} value={row.supplierRollNumber} onChange={e => set({ supplierRollNumber: e.target.value })} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        {lotOptions && lotOptions.length > 0 ? (
          <select style={cellStyle} value={row.shipmentLotId ?? ''} onChange={e => onLotChange(row.key, Number(e.target.value) || 0)}>
            <option value="">—</option>
            {lotOptions.map(l => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}
          </select>
        ) : lockLot ? (
          <Typography variant="body2" sx={{ px: 1, fontWeight: 600 }}>{row.lotNumber || '-'}</Typography>
        ) : (
          <input style={cellStyle} value={row.lotNumber} onChange={e => set({ lotNumber: e.target.value })} />
        )}
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} inputMode="decimal" value={row.grossWeight} onChange={e => set({ grossWeight: e.target.value })} onKeyDown={blockNegativeKey} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} inputMode="decimal" value={row.netWeight} onChange={e => set({ netWeight: e.target.value })} onKeyDown={blockNegativeKey} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} inputMode="decimal" value={row.actualYardage} onChange={e => set({ actualYardage: e.target.value })} onKeyDown={blockNegativeKey} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} inputMode="decimal" value={row.actualWidth} onChange={e => set({ actualWidth: e.target.value })} onKeyDown={blockNegativeKey} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} inputMode="decimal" value={row.actualGSM} onChange={e => set({ actualGSM: e.target.value })} onKeyDown={blockNegativeKey} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <select style={cellStyle} value={row.shadeGroup} onChange={e => set({ shadeGroup: e.target.value })}>
          <option value="">—</option>
          {shadeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} inputMode="decimal" value={row.damagedQty} onChange={e => set({ damagedQty: e.target.value })} onKeyDown={blockNegativeKey} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <select style={cellStyle} value={row.condition} onChange={e => set({ condition: e.target.value })}>
          {conditionOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} value={row.warehouseLocation} onChange={e => set({ warehouseLocation: e.target.value })} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <input style={cellStyle} value={row.comments} onChange={e => set({ comments: e.target.value })} />
      </TableCell>
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

interface RollGridTableProps {
  rows: RollRowDraft[];
  onChange: (rows: RollRowDraft[]) => void;
  shadeOptions: string[];
  conditionOptions: string[];
  makeRow: () => RollRowDraft;
  maxHeight?: number;
  /** Si es true, los Roll Number se reenumeran automáticamente 1..N al agregar/quitar filas. */
  autoRollNumber?: boolean;
  /** Si es true, la columna de Lote es de solo lectura (lote fijo desde el embarque). */
  lockLot?: boolean;
  /** Lotes disponibles del embarque para asignar uno distinto por fila. */
  lotOptions?: { id: number; lotNumber: string }[];
}

/** Grid de rollos reutilizable (controlada): filas nativas + controles de agregar. */
export const RollGridTable: React.FC<RollGridTableProps> = ({
  rows, onChange, shadeOptions, conditionOptions, makeRow, maxHeight = 420, autoRollNumber = false, lockLot = false, lotOptions,
}) => {
  const [addCount, setAddCount] = useState(1);

  const renumber = useCallback((list: RollRowDraft[]) => (
    autoRollNumber ? list.map((r, i) => ({ ...r, rollNumber: String(i + 1) })) : list
  ), [autoRollNumber]);

  const handleRowChange = useCallback((key: string, patch: Partial<RollRowDraft>) => {
    onChange(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  }, [rows, onChange]);

  const handleLotChange = useCallback((key: string, lotId: number) => {
    const lot = lotId ? lotOptions?.find(l => l.id === lotId) : undefined;
    onChange(rows.map(r => (r.key === key
      ? { ...r, shipmentLotId: lotId || null, lotNumber: lot?.lotNumber ?? '' }
      : r)));
  }, [rows, onChange, lotOptions]);

  const handleRowRemove = useCallback((key: string) => {
    if (rows.length > 1) onChange(renumber(rows.filter(r => r.key !== key)));
  }, [rows, onChange, renumber]);

  const addRows = () => {
    const n = Math.max(1, Math.min(2000, Math.floor(Number(addCount) || 1)));
    onChange(renumber([...rows, ...Array.from({ length: n }, () => makeRow())]));
  };

  const addSingleRow = () => onChange(renumber([...rows, makeRow()]));

  const rollNumberDup = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(r => {
      const k = r.rollNumber.trim().toLowerCase();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [rows]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <TextField size="small" label="Filas a agregar" type="number" value={addCount} onChange={e => setAddCount(Number(e.target.value))} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 1, max: 2000 } }} />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addRows}>Agregar</Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addSingleRow}>+1 fila</Button>
      </Box>
      <TableContainer sx={{ maxHeight, border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              {['#', 'Roll Number *', 'Supplier Roll #', 'Lot Number', 'Gross Wt', 'Net Wt',
                'Yardage', 'Width', 'GSM', 'Shade', 'Damaged Qty', 'Condition',
                'Warehouse', 'Comments', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <RollGridRow
                key={r.key}
                row={r}
                index={i}
                duplicate={rollNumberDup.has(r.rollNumber.trim().toLowerCase())}
                isOnlyRow={rows.length <= 1}
                lockLot={lockLot}
                lockRollNumber={autoRollNumber}
                lotOptions={lotOptions}
                onLotChange={handleLotChange}
                shadeOptions={shadeOptions}
                conditionOptions={conditionOptions}
                onChange={handleRowChange}
                onRemove={handleRowRemove}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {rows.length} fila(s) — Las celdas en rojo se corrigen antes de guardar.
      </Typography>
    </Box>
  );
};

const RollBulkGrid: React.FC<RollBulkGridProps> = ({
  open, onClose, title, receivingId = 0, receivingList, conditionOptions, shadeOptions,
  defaultCondition = 'Good', lotNumberPreset = '', rollNumberStart, onGoToReceiving, onSaved,
}) => {
  const [receivingIdState, setReceivingIdState] = useState(receivingId);
  const [receivedDate, setReceivedDate] = useState(today());
  const [rows, setRows] = useState<RollRowDraft[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Contador de Roll Number para continuar la numeración existente.
  const rollSeqRef = useRef(rollNumberStart ?? 1);

  const selectedReceiving = useMemo(
    () => receivingList.find(r => r.id === receivingIdState),
    [receivingList, receivingIdState],
  );

  const makeRow = (warehouse?: string): RollRowDraft => ({
    key: newKey(),
    rollNumber: rollNumberStart != null ? String(rollSeqRef.current++) : '',
    supplierRollNumber: '',
    lotNumber: lotNumberPreset,
    shipmentLotId: null,
    grossWeight: '',
    netWeight: '',
    actualYardage: '',
    actualWidth: '',
    actualGSM: '',
    shadeGroup: '',
    damagedQty: '',
    condition: defaultCondition,
    warehouseLocation: warehouse ?? selectedReceiving?.warehouseLocation ?? '',
    comments: '',
  });

  // Al abrir: resetear estado y dejar una fila inicial.
  useEffect(() => {
    if (open) {
      setReceivingIdState(receivingId);
      setReceivedDate(today());
      setError('');
      setSaving(false);
      rollSeqRef.current = rollNumberStart ?? 1;
      const rec = receivingList.find(r => r.id === receivingId);
      setRows([makeRow(rec?.warehouseLocation)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    setError('');
    if (!receivingIdState) { setError('Seleccione la Recepción de tela.'); return; }

    const vErr = validateRollRows(rows);
    if (vErr) { setError(vErr); return; }

    setSaving(true);
    try {
      const res = await rollReceivingsApi.createBulk(buildRollsPayload(receivingIdState, rows, receivedDate));
      const ids: number[] = res.data?.createdIds ?? res.data?.CreatedIds ?? [];
      await onSaved(ids);
    } catch (err: any) {
      setError(
        err?.response?.data?.message
        || (typeof err?.response?.data === 'string' ? err.response.data : null)
        || err?.message
        || 'Error al guardar los rollos.',
      );
    } finally {
      setSaving(false);
    }
  };

  const noReceiving = receivingList.length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {noReceiving ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Este embarque aún no tiene una Recepción de tela registrada. Regístrala primero para poder ingresar los rollos.
            </Typography>
            {onGoToReceiving && (
              <Button variant="contained" onClick={onGoToReceiving}>Ir a Recepción</Button>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Recepción de tela *</InputLabel>
                <Select
                  value={receivingIdState || ''}
                  label="Recepción de tela *"
                  onChange={e => setReceivingIdState(Number(e.target.value))}
                >
                  <MenuItem value=""><em>Seleccione una Recepción...</em></MenuItem>
                  {receivingList.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.label}{r.supplier ? ` — ${r.supplier}` : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" label="Received Date *" type="date"
                value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Box sx={{ flexGrow: 1 }} />
            </Box>

            {selectedReceiving && (
              <Box sx={{ mb: 2 }}>
                <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <InfoOutlinedIcon fontSize="inherit" /> Heredado del Fabric Receiving (no editable)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Box><Typography variant="caption" color="text.secondary">Fabric PO</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.fabricPONumber || '-'}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.fgpoNumber || '-'} {selectedReceiving.customerName ? `(${selectedReceiving.customerName})` : ''}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedReceiving.supplier || '-'}</Typography></Box>
                  </Box>
                </Paper>
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <RollGridTable
              rows={rows}
              onChange={setRows}
              shadeOptions={shadeOptions}
              conditionOptions={conditionOptions}
              makeRow={makeRow}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || noReceiving}
          startIcon={saving ? <CircularProgress size={18} /> : null}
        >
          {saving ? 'Guardando...' : `Crear ${rows.length} rollo${rows.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RollBulkGrid;
