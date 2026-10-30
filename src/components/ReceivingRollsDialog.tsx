import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputLabel, MenuItem, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { rollReceivingsApi, fabricReceivingsApi } from '../utils/api';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../utils/validation';
import RollBulkGrid, { type RollBulkReceivingOption } from './RollBulkGrid';
import type { RollReceiving } from '../types';

const DEFAULT_CONDITIONS = ['Good', 'Damaged', 'Second Quality', 'Sample'];
const DEFAULT_SHADE_GROUPS = ['A', 'B', 'C', 'D'];

interface ReceivingRollsDialogProps {
  open: boolean;
  onClose: () => void;
  receivingId: number;
  receivingNumber: string;
}

const emptyEdit = {
  rollNumber: '', supplierRollNumber: '', lotNumber: '',
  grossWeight: 0, netWeight: 0, actualYardage: 0, actualWidth: 0, actualGSM: 0,
  shadeGroup: '', damagedQty: 0, condition: 'Good', warehouseLocation: '', receivedDate: '', comments: '',
};

const fmt = (v?: string) => (v ? v.split('T')[0] : '-');
const num = (v?: number) => (v == null ? '-' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));

/**
 * Gestión de rollos de UNA recepción (migra la funcionalidad del antiguo
 * "Inventario Físico de Tela" al submenú de Recepciones): ver, agregar, editar y borrar.
 */
const ReceivingRollsDialog: React.FC<ReceivingRollsDialogProps> = ({ open, onClose, receivingId, receivingNumber }) => {
  const [rolls, setRolls] = useState<RollReceiving[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [receivingMeta, setReceivingMeta] = useState<RollBulkReceivingOption | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState(emptyEdit);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rollsRes, metaRes] = await Promise.all([
        rollReceivingsApi.getByReceiving(receivingId),
        fabricReceivingsApi.getById(receivingId).catch(() => null),
      ]);
      setRolls(rollsRes.data ?? []);
      const m = metaRes?.data ?? {};
      setReceivingMeta({
        id: receivingId,
        label: receivingNumber,
        supplier: m.supplierName ?? m.SupplierName ?? m.supplier ?? m.Supplier ?? '',
        warehouseLocation: m.warehouseLocation ?? m.WarehouseLocation ?? '',
        fabricPONumber: m.fabricPONumber ?? m.FabricPONumber ?? '',
        fgpoNumber: m.fgpoNumber ?? m.FGPONumber ?? '',
        customerName: m.customerName ?? m.CustomerName ?? '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'No se pudieron cargar los rollos.');
    } finally {
      setLoading(false);
    }
  }, [receivingId, receivingNumber]);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, receivingId]);

  // Lote existente y siguiente número de rollo para prellenar el alta masiva.
  const existingLot = useMemo(() => rolls.find(r => r.lotNumber)?.lotNumber ?? '', [rolls]);
  const nextRollNumber = useMemo(() => {
    let max = 0;
    for (const r of rolls) {
      const n = Number(r.rollNumber);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max + 1;
  }, [rolls]);

  const openEdit = (r: RollReceiving) => {
    setEditId(r.id);
    setEdit({
      rollNumber: r.rollNumber ?? '',
      supplierRollNumber: r.supplierRollNumber ?? '',
      lotNumber: r.lotNumber ?? '',
      grossWeight: r.grossWeight,
      netWeight: r.netWeight,
      actualYardage: r.actualYardage,
      actualWidth: r.actualWidth,
      actualGSM: r.actualGSM,
      shadeGroup: r.shadeGroup ?? '',
      damagedQty: r.damagedQty,
      condition: r.condition || 'Good',
      warehouseLocation: r.warehouseLocation ?? '',
      receivedDate: r.receivedDate?.split('T')[0] || '',
      comments: r.comments ?? '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    setEditError('');
    if (!edit.rollNumber.trim()) { setEditError('Roll Number es obligatorio.'); return; }
    const neg = firstNegativeField([
      { name: 'Gross Weight', value: edit.grossWeight },
      { name: 'Net Weight', value: edit.netWeight },
      { name: 'Actual Yardage', value: edit.actualYardage },
      { name: 'Actual Width', value: edit.actualWidth },
      { name: 'Actual GSM', value: edit.actualGSM },
      { name: 'Damaged Qty', value: edit.damagedQty },
    ]);
    if (neg) { setEditError(`${neg} no puede ser negativo.`); return; }

    setEditSaving(true);
    try {
      await rollReceivingsApi.update(editId!, {
        receivingId,
        lotNumber: edit.lotNumber || null,
        rollNumber: edit.rollNumber.trim(),
        supplierRollNumber: edit.supplierRollNumber || null,
        grossWeight: edit.grossWeight,
        netWeight: edit.netWeight,
        actualYardage: edit.actualYardage,
        actualWidth: edit.actualWidth,
        actualGSM: edit.actualGSM,
        shadeGroup: edit.shadeGroup || null,
        damagedQty: edit.damagedQty,
        condition: edit.condition,
        warehouseLocation: edit.warehouseLocation || null,
        receivedDate: edit.receivedDate ? new Date(edit.receivedDate).toISOString() : new Date().toISOString(),
        comments: edit.comments || null,
      });
      setEditOpen(false);
      await load();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || err?.response?.data || err?.message || 'Error al guardar.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este rollo?')) return;
    try {
      await rollReceivingsApi.delete(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al eliminar.');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Rollos — {receivingNumber}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBulkOpen(true)}>
              Agregar rollos
            </Button>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : rolls.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Esta recepción no tiene rollos registrados todavía.
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', maxHeight: 440, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    {['Roll #', 'Supplier Roll #', 'Lot', 'Yardage', 'Width', 'Net Wt', 'GSM', 'Shade', 'Condition', 'Received', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rolls.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.rollNumber || '-'}</TableCell>
                      <TableCell>{r.supplierRollNumber || '-'}</TableCell>
                      <TableCell>{r.lotNumber || '-'}</TableCell>
                      <TableCell>{num(r.actualYardage)}</TableCell>
                      <TableCell>{num(r.actualWidth)}</TableCell>
                      <TableCell>{num(r.netWeight)}</TableCell>
                      <TableCell>{num(r.actualGSM)}</TableCell>
                      <TableCell>{r.shadeGroup || '-'}</TableCell>
                      <TableCell><Chip label={r.condition || 'N/A'} size="small" variant="outlined" /></TableCell>
                      <TableCell>{fmt(r.receivedDate)}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="info" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
      </Dialog>

      <RollBulkGrid
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`Agregar rollos — ${receivingNumber}`}
        receivingId={receivingId}
        receivingList={receivingMeta ? [receivingMeta] : [{ id: receivingId, label: receivingNumber }]}
        conditionOptions={DEFAULT_CONDITIONS}
        shadeOptions={DEFAULT_SHADE_GROUPS}
        lotNumberPreset={existingLot}
        rollNumberStart={nextRollNumber}
        onSaved={async () => { setBulkOpen(false); await load(); }}
      />

      {/* Edición de un rollo */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar rollo</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField size="small" label="Roll Number *" value={edit.rollNumber} onChange={e => setEdit(p => ({ ...p, rollNumber: e.target.value }))} />
            <TextField size="small" label="Supplier Roll #" value={edit.supplierRollNumber} onChange={e => setEdit(p => ({ ...p, supplierRollNumber: e.target.value }))} />
            <TextField size="small" label="Lot Number" value={edit.lotNumber} onChange={e => setEdit(p => ({ ...p, lotNumber: e.target.value }))} />
            <TextField size="small" label="Received Date" type="date" value={edit.receivedDate} onChange={e => setEdit(p => ({ ...p, receivedDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" label="Gross Weight" type="number" value={edit.grossWeight || ''} onChange={e => setEdit(p => ({ ...p, grossWeight: Number(e.target.value) }))} onKeyDown={blockNegativeKey} slotProps={{ htmlInput: nonNegativeInputProps }} />
            <TextField size="small" label="Net Weight" type="number" value={edit.netWeight || ''} onChange={e => setEdit(p => ({ ...p, netWeight: Number(e.target.value) }))} onKeyDown={blockNegativeKey} slotProps={{ htmlInput: nonNegativeInputProps }} />
            <TextField size="small" label="Actual Yardage" type="number" value={edit.actualYardage || ''} onChange={e => setEdit(p => ({ ...p, actualYardage: Number(e.target.value) }))} onKeyDown={blockNegativeKey} slotProps={{ htmlInput: nonNegativeInputProps }} />
            <TextField size="small" label="Actual Width" type="number" value={edit.actualWidth || ''} onChange={e => setEdit(p => ({ ...p, actualWidth: Number(e.target.value) }))} onKeyDown={blockNegativeKey} slotProps={{ htmlInput: nonNegativeInputProps }} />
            <TextField size="small" label="Actual GSM" type="number" value={edit.actualGSM || ''} onChange={e => setEdit(p => ({ ...p, actualGSM: Number(e.target.value) }))} onKeyDown={blockNegativeKey} slotProps={{ htmlInput: nonNegativeInputProps }} />
            <FormControl size="small">
              <InputLabel>Shade Group</InputLabel>
              <Select value={edit.shadeGroup} label="Shade Group" onChange={e => setEdit(p => ({ ...p, shadeGroup: e.target.value }))}>
                <MenuItem value=""><em>None</em></MenuItem>
                {DEFAULT_SHADE_GROUPS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Damaged Qty" type="number" value={edit.damagedQty || ''} onChange={e => setEdit(p => ({ ...p, damagedQty: Number(e.target.value) }))} onKeyDown={blockNegativeKey} slotProps={{ htmlInput: nonNegativeInputProps }} />
            <FormControl size="small">
              <InputLabel>Condition</InputLabel>
              <Select value={edit.condition} label="Condition" onChange={e => setEdit(p => ({ ...p, condition: e.target.value }))}>
                {DEFAULT_CONDITIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Warehouse Location" value={edit.warehouseLocation} onChange={e => setEdit(p => ({ ...p, warehouseLocation: e.target.value }))} />
            <TextField size="small" label="Comments" value={edit.comments} onChange={e => setEdit(p => ({ ...p, comments: e.target.value }))} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving} startIcon={editSaving ? <CircularProgress size={18} /> : null}>
            {editSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReceivingRollsDialog;
