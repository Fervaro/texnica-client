import React, { useEffect, useMemo, useState, FormEvent } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { fabricPOsApi } from '../../utils/api';
import { useSupplierOptions } from '../../hooks/suppliers/useSupplierOptions';
import { useUserOptions } from '../../hooks/users/useUserOptions';
import { getCurrentUserName } from '../../utils/session';
import FabricRequirementPicker from './FabricRequirementPicker';
import type {
  CreateFabricPOInput, FabricPO, FabricPOLineInput, FabricRequirementAvailability,
} from '../../types/fabricPO';
import { BUYER_NAME } from '../../types/fabricPO';

// ─────────────────────────────────────────────────────────────────────────────
// Modelo del formulario
// ─────────────────────────────────────────────────────────────────────────────

export interface FormLine {
  /** Clave local para React (la línea aún no existe en BD). */
  key: string;
  fabricRequirementId: number;
  fgpoId: number;
  fgpoNumber: string;
  style: string;
  color: string;
  componentId: number | null;
  componentCode: string;
  fabricName: string;
  yarn: string;
  composition: string;
  requiredWidth: string;
  gsm: number;
  quantity: number;
  unitPrice: number;
  approval: string;
  remarks: string;
  customerName?: string;
  /**
   * Máximo que esta línea puede pedir. Al crear viene del Remaining del
   * Fabric Requirement; al EDITAR viene del Remaining calculado EXCLUYENDO
   * esta misma PO, de modo que sus cantidades pueden reasignarse.
   */
  maxQuantity: number;
}

interface FormState {
  fabricPONumber: string;
  supplierId: number;
  orderDate: string;
  requiredCompletion: string;
  currency: string;
  incoterm: string;
  checkedBy: string;
  program: string;
  paymentTerms: string;
  poStatus: string;
  uom: string;
  /**
   * Se conserva SOLO para no borrar el Remark de Fabric PO históricas: ya no se
   * edita ni se muestra. El Remark vigente es el de cada línea (FabricPOLine).
   */
  remarks: string;
  lines: FormLine[];
}

const uomOptions = ['Yards', 'Meters', 'Kilograms', 'Pounds', 'Rolls', 'Pieces'];

const poStatusOptions = [
  'Not Started', 'Pending', 'In Progress', 'Partially Completed', 'Completed',
  'Approved', 'Conditionally Approved', 'Rejected', 'On Hold', 'Closed', 'Cancelled'
];

const approvalOptions = ['Confirmed', 'Pending Confirmation'];

const today = () => new Date().toISOString().slice(0, 10);

const newKey = () => `l${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const emptyForm = (): FormState => ({
  fabricPONumber: '',
  supplierId: 0,
  orderDate: today(),
  requiredCompletion: '',
  currency: 'USD',
  incoterm: '',
  checkedBy: '',
  program: '',
  paymentTerms: '',
  poStatus: 'In Progress',
  uom: 'Yards',
  remarks: '',
  lines: [],
});

const fmtQty = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMoney = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  /** null = crear; con valor = editar esa PO completa (header + líneas). */
  editing: FabricPO | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const FabricPOFormDialog: React.FC<Props> = ({ open, editing, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preparedBy, setPreparedBy] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);

  const { options: supplierList } = useSupplierOptions();
  const { options: userList } = useUserOptions();

  const isEdit = editing !== null;

  // ── Carga inicial del formulario ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    setFormError('');
    setPreviewOpen(false);
    setPreparedBy(getCurrentUserName());

    if (!editing) {
      setForm(emptyForm());
      return;
    }

    // Editar: precargar header + líneas
    setForm({
      fabricPONumber: editing.fabricPONumber,
      supplierId: editing.supplierId ?? 0,
      orderDate: editing.orderDate ? editing.orderDate.slice(0, 10) : today(),
      requiredCompletion: editing.requiredCompletion ? editing.requiredCompletion.slice(0, 10) : '',
      currency: editing.currency || 'USD',
      incoterm: editing.incoterm || '',
      checkedBy: editing.checkedBy || '',
      program: editing.program || '',
      paymentTerms: editing.paymentTerms || '',
      poStatus: editing.poStatus || '',
      uom: editing.uom || 'Yards',
      remarks: editing.remarks || '',
      lines: editing.lines.map(l => ({
        key: newKey(),
        fabricRequirementId: l.fabricRequirementId ?? 0,
        fgpoId: l.fgpoId,
        fgpoNumber: l.fgpoNumber || '',
        style: l.style || '',
        color: l.color || '',
        componentId: l.componentId ?? null,
        componentCode: l.componentCode || '',
        fabricName: l.fabricName || '',
        yarn: l.yarn || '',
        composition: l.composition || '',
        requiredWidth: l.requiredWidth || '',
        gsm: l.gsm ?? 0,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        approval: l.approval || 'Confirmed',
        remarks: l.remarks || '',
        customerName: editing.customerName,
        // Provisional: mientras no llegue la disponibilidad, la propia cantidad
        // es el máximo razonable (evita bloquear la edición si el FR ya no existe).
        maxQuantity: l.quantity,
      })),
    });

    // Refresca la disponibilidad EXCLUYENDO esta PO, para que sus propias
    // cantidades puedan reasignarse dentro de la misma edición.
    const refreshEditAvailability = async () => {
      setLoadingEdit(true);
      try {
        const res = await fabricPOsApi.getAvailableRequirements({
          onlyWithRemaining: false,
          excludeFabricPOId: editing.id,
        });
        const byFr = new Map<number, FabricRequirementAvailability>(
          (res.data ?? []).map((a: FabricRequirementAvailability) => [a.fabricRequirementId, a]),
        );
        setForm(prev => ({
          ...prev,
          lines: prev.lines.map(l => {
            const a = byFr.get(l.fabricRequirementId);
            if (!a) return l;
            return {
              ...l,
              maxQuantity: a.remainingToPurchase,
              unitPrice: l.unitPrice,
              fabricName: l.fabricName || a.fabricName || '',
              yarn: l.yarn || a.yarn || '',
              composition: l.composition || a.composition || '',
              requiredWidth: l.requiredWidth || a.requiredWidth || '',
              gsm: l.gsm || a.gsm || 0,
              customerName: a.customerName,
            };
          }),
        }));
      } catch {
        /* Si falla, se conserva el máximo provisional (la cantidad actual). */
      } finally {
        setLoadingEdit(false);
      }
    };
    void refreshEditAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // ── Derivados ───────────────────────────────────────────────────────────
  const totalQty = useMemo(() => form.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0), [form.lines]);
  const totalAmount = useMemo(
    () => form.lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    [form.lines],
  );
  const totalCustomers = useMemo(() => {
    const names = Array.from(new Set(form.lines.map(l => l.customerName).filter(Boolean) as string[]));
    if (names.length === 0) return '';
    return names.length === 1 ? names[0] : `${names.length} customers`;
  }, [form.lines]);

  const alreadyAddedIds = useMemo(() => form.lines.map(l => l.fabricRequirementId), [form.lines]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addRequirements = (items: FabricRequirementAvailability[]) => {
    setForm(prev => {
      const existing = new Set(prev.lines.map(l => l.fabricRequirementId));
      const added: FormLine[] = items
        .filter(i => !existing.has(i.fabricRequirementId))
        .map(i => ({
          key: newKey(),
          fabricRequirementId: i.fabricRequirementId,
          fgpoId: i.fgpoId,
          fgpoNumber: i.fgpoNumber,
          style: i.style || '',
          color: i.color || '',
          componentId: i.componentId ?? null,
          componentCode: i.componentCode || '',
          fabricName: i.fabricName || '',
          yarn: i.yarn || '',
          composition: i.composition || '',
          requiredWidth: i.requiredWidth || '',
          gsm: i.gsm ?? 0,
          // #13 y #18: inicia en Remaining y el usuario puede reducirlo
          quantity: i.remainingToPurchase,
          // Precio inicial por defecto de una línea NUEVA. Sigue siendo visible,
          // editable e independiente por línea; Amount = Qty x USD/Yd se recalcula
          // solo. No afecta a líneas ya guardadas: al editar se carga el UnitPrice
          // almacenado en la BD (ver los otros dos puntos donde se construyen líneas).
          unitPrice: 1,
          approval: 'Confirmed',
          remarks: '',
          customerName: i.customerName,
          maxQuantity: i.remainingToPurchase,
        }));
      return { ...prev, lines: [...prev.lines, ...added] };
    });
    setFormError('');
  };

  const updateLine = (key: string, patch: Partial<FormLine>) =>
    setForm(prev => ({
      ...prev,
      lines: prev.lines.map(l => (l.key === key ? { ...l, ...patch } : l)),
    }));

  const removeLine = (key: string) =>
    setForm(prev => ({ ...prev, lines: prev.lines.filter(l => l.key !== key) }));

  const buildPayload = (): CreateFabricPOInput => ({
    fabricPONumber: form.fabricPONumber.trim(),
    lines: form.lines.map<FabricPOLineInput>(l => ({
      fgpoId: l.fgpoId,
      fabricRequirementId: l.fabricRequirementId,
      componentId: l.componentId,
      style: l.style || null,
      color: l.color || null,
      fabricName: l.fabricName || null,
      yarn: l.yarn || null,
      composition: l.composition || null,
      requiredWidth: l.requiredWidth || null,
      gsm: l.gsm,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      approval: l.approval || null,
      remarks: l.remarks || null,
    })),
    supplierId: form.supplierId || null,
    // FabricMill NO se envía: el backend lo deriva del Supplier seleccionado.
    uom: form.uom,
    orderDate: form.orderDate,
    requiredCompletion: form.requiredCompletion,
    poStatus: form.poStatus || null,
    currency: form.currency || null,
    incoterm: form.incoterm || null,
    preparedBy: preparedBy || null,
    checkedBy: form.checkedBy || null,
    program: form.program || null,
    paymentTerms: form.paymentTerms || null,
    remarks: form.remarks || null,
  });

  /** Validación de cliente. El backend sigue siendo la autoridad final. */
  const validate = (): string => {
    if (!form.fabricPONumber.trim()) return 'PO No. es obligatorio.';
    if (!form.orderDate) return 'Issue Date es obligatoria.';
    if (!form.requiredCompletion) return 'Delivery es obligatoria.';
    if (!form.uom) return 'UOM es obligatorio.';
    if (form.lines.length === 0) return 'Agrega al menos un Fabric Requirement como línea.';

    for (const l of form.lines) {
      const label = `${l.fgpoNumber} / ${l.style || '-'} / ${l.color || '-'} / ${l.componentCode || '-'}`;
      if (!(Number(l.quantity) > 0)) return `La cantidad de la línea ${label} debe ser mayor que 0.`;
      if (Number(l.quantity) > l.maxQuantity) {
        return `La cantidad excede el requerimiento pendiente. Disponible para ordenar: ${fmtQty(l.maxQuantity)} ${form.uom} (${label}).`;
      }
      if (!(Number(l.unitPrice) > 0)) return `El USD/Yd de la línea ${label} debe ser mayor que 0.`;
    }
    return '';
  };

  const handlePreview = (e?: FormEvent) => {
    e?.preventDefault();
    const msg = validate();
    if (msg) { setFormError(msg); return; }
    setFormError('');
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    const msg = validate();
    if (msg) { setFormError(msg); setPreviewOpen(false); return; }

    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload();
      if (isEdit && editing) {
        await fabricPOsApi.update(editing.id, payload);
        onSaved(`Fabric PO ${payload.fabricPONumber} actualizada correctamente.`);
      } else {
        await fabricPOsApi.create(payload);
        onSaved(`Fabric PO ${payload.fabricPONumber} creada correctamente.`);
      }
      setPreviewOpen(false);
      onClose();
    } catch (err: any) {
      // #24: mostrar el mensaje util del backend, no un genérico
      const data = err?.response?.data;
      const message =
        (typeof data === 'string' && data) ||
        data?.message ||
        err?.message ||
        'No fue posible guardar la Fabric PO.';
      setFormError(message);
      setPreviewOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {isEdit ? `Edit Fabric PO — ${editing?.fabricPONumber}` : 'New Fabric PO'}
        </DialogTitle>

        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>{formError}</Alert>}
          {loadingEdit && (
            <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
              Actualizando disponibilidad de los Fabric Requirements...
            </Alert>
          )}

          {/* ── Purchase Order Information ─────────────────────────────── */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
            Purchase Order Information
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              label="PO No. *" size="small" required value={form.fabricPONumber}
              placeholder="PO-2026-006"
              onChange={e => setField('fabricPONumber', e.target.value)}
            />

            <Autocomplete
              size="small"
              options={supplierList}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={supplierList.find(s => s.id === form.supplierId) ?? null}
              onChange={(_, v) => setField('supplierId', v?.id ?? 0)}
              renderInput={(params) => <TextField {...params} label="Supplier" placeholder="Search supplier..." />}
            />

            <TextField
              label="Issue Date *" size="small" type="date" required value={form.orderDate}
              onChange={e => setField('orderDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Delivery *" size="small" type="date" required value={form.requiredCompletion}
              onChange={e => setField('requiredCompletion', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Currency" size="small" value={form.currency}
              onChange={e => setField('currency', e.target.value)}
            />
            {/*
              Buyer = empresa compradora (formato oficial). Es un valor fijo y
              readonly: NO es un usuario del sistema. Se conserva el estilo de los
              demás campos derivados (Customer, Prepared).
            */}
            <TextField
              label="Buyer" size="small" value={BUYER_NAME}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Incoterm" size="small" value={form.incoterm}
              onChange={e => setField('incoterm', e.target.value)}
            />
            <TextField
              label="Customer (derived)" size="small" value={totalCustomers}
              slotProps={{ input: { readOnly: true } }}
              helperText="Se deriva de las FGPO seleccionadas"
            />
            <TextField
              label="Prepared" size="small" value={preparedBy}
              slotProps={{ input: { readOnly: true } }}
            />

            <Autocomplete
              freeSolo
              size="small"
              options={userList.map(u => u.label)}
              value={form.checkedBy}
              onChange={(_, v) => setField('checkedBy', (v as string) ?? '')}
              onInputChange={(_, v) => setField('checkedBy', v ?? '')}
              renderInput={(params) => <TextField {...params} label="Checked" placeholder="Name..." />}
            />

            <TextField
              label="Program" size="small" value={form.program}
              onChange={e => setField('program', e.target.value)}
            />
            <TextField
              label="Payment Terms" size="small" value={form.paymentTerms}
              onChange={e => setField('paymentTerms', e.target.value)}
            />
            <FormControl size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.poStatus} label="Status" onChange={e => setField('poStatus', e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {poStatusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" required>
              <InputLabel>UOM *</InputLabel>
              <Select value={form.uom} label="UOM *" onChange={e => setField('uom', e.target.value)}>
                {uomOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* ── Fabric Requirements / PO Lines ─────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Fabric Requirements / PO Lines
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
              Select Fabric Requirements
            </Button>
          </Box>

          {form.lines.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: 'action.hover' }}>
              <Typography variant="body2" color="text.secondary">
                Aún no hay líneas. Usa <strong>Select Fabric Requirements</strong> para agregar una o varias.
              </Typography>
            </Paper>
          ) : (
            <TableContainer sx={{ maxHeight: 380, border: '1px solid', borderColor: 'divider' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['No.', 'FGPO', 'Style', 'Color', 'Category', 'Fabric', 'Yarn', 'Content',
                      'Width', 'GSM', 'Qty Yd', 'USD/Yd', 'Amount USD', 'Approval', 'Remarks', ''].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.lines.map((line, idx) => {
                    const amount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                    const exceeds = Number(line.quantity) > line.maxQuantity;
                    return (
                      <TableRow key={line.key} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{line.fgpoNumber}</TableCell>
                        <TableCell>{line.style || '-'}</TableCell>
                        <TableCell>{line.color || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{line.componentCode || '-'}</TableCell>
                        <TableCell>{line.fabricName || '-'}</TableCell>
                        <TableCell>{line.yarn || '-'}</TableCell>
                        <TableCell>{line.composition || '-'}</TableCell>
                        <TableCell>{line.requiredWidth || '-'}</TableCell>
                        <TableCell align="right">{line.gsm || '-'}</TableCell>

                        <TableCell>
                          <TextField
                            size="small" type="number" value={line.quantity}
                            onChange={e => updateLine(line.key, { quantity: Number(e.target.value) })}
                            error={exceeds || !(Number(line.quantity) > 0)}
                            sx={{ width: 130 }}
                            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                            helperText={`Máx: ${fmtQty(line.maxQuantity)}`}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" type="number" value={line.unitPrice}
                            onChange={e => updateLine(line.key, { unitPrice: Number(e.target.value) })}
                            error={!(Number(line.unitPrice) > 0)}
                            sx={{ width: 110 }}
                            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          />
                        </TableCell>

                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {fmtMoney(amount)}
                        </TableCell>

                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                              value={line.approval}
                              onChange={e => updateLine(line.key, { approval: e.target.value })}
                            >
                              {approvalOptions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" value={line.remarks}
                            onChange={e => updateLine(line.key, { remarks: e.target.value })}
                            sx={{ minWidth: 180 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Remove de la PO (no elimina el Fabric Requirement)">
                            <IconButton size="small" color="error" onClick={() => removeLine(line.key)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {form.lines.length > 0 && (
            <Paper elevation={0} sx={{ mt: 2, p: 2, backgroundColor: 'primary.light' }}>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Typography variant="body2">
                  <strong>Total Qty:</strong> {fmtQty(totalQty)}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Amount:</strong> {fmtMoney(totalAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({form.lines.length} línea(s) · valores recalculados por el backend al guardar)
                </Typography>
              </Box>
            </Paper>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="outlined" color="primary" startIcon={<VisibilityIcon />}
            onClick={() => handlePreview()} disabled={form.lines.length === 0}
          >
            Preview
          </Button>
          <Button variant="contained" color="primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : (isEdit ? 'Update Fabric PO' : 'Save Fabric PO')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Selector de Fabric Requirements ───────────────────────────── */}
      <FabricRequirementPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addRequirements}
        excludeFabricPOId={isEdit ? editing?.id ?? null : null}
        alreadyAddedIds={alreadyAddedIds}
      />

      {/* ── Preview (vista previa en la app, NO el PDF oficial) ───────── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Preview — {form.fabricPONumber || '(sin PO No.)'}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Vista previa dentro de la aplicación. El documento PDF oficial se generará en una etapa posterior.
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Header</Typography>
          <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: 'action.hover' }}>
            <Grid container spacing={2}>
              {[
                ['PO No.', form.fabricPONumber || '-'],
                ['Supplier', supplierList.find(s => s.id === form.supplierId)?.label || '-'],
                ['Issue Date', form.orderDate || '-'],
                ['Delivery', form.requiredCompletion || '-'],
                ['Currency', form.currency || '-'],
                ['Buyer', BUYER_NAME],
                ['Incoterm', form.incoterm || '-'],
                ['Customer', totalCustomers || '-'],
                ['Prepared', preparedBy || '-'],
                ['Checked', form.checkedBy || '-'],
                ['Program', form.program || '-'],
                ['Payment Terms', form.paymentTerms || '-'],
                ['Status', form.poStatus || '-'],
                ['UOM', form.uom || '-'],
              ].map(([label, value]) => (
                <Grid key={label} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Lines</Typography>
          <TableContainer sx={{ maxHeight: 340, border: '1px solid', borderColor: 'divider' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['No.', 'FGPO', 'Style', 'Color', 'Category', 'Fabric / Yarn', 'Content',
                    'Width', 'GSM', 'Qty Yd', 'USD/Yd', 'Amount USD', 'Approval', 'Remarks'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {form.lines.map((l, idx) => (
                  <TableRow key={l.key}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{l.fgpoNumber}</TableCell>
                    <TableCell>{l.style || '-'}</TableCell>
                    <TableCell>{l.color || '-'}</TableCell>
                    <TableCell>{l.componentCode || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{l.fabricName || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">{l.yarn || '-'}</Typography>
                    </TableCell>
                    <TableCell>{l.composition || '-'}</TableCell>
                    <TableCell>{l.requiredWidth || '-'}</TableCell>
                    <TableCell align="right">{l.gsm || '-'}</TableCell>
                    <TableCell align="right">{fmtQty(Number(l.quantity) || 0)}</TableCell>
                    <TableCell align="right">{fmtMoney(Number(l.unitPrice) || 0)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {fmtMoney((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small" variant="outlined"
                        color={l.approval === 'Confirmed' ? 'success' : 'warning'}
                        label={l.approval}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{l.remarks || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper elevation={0} sx={{ mt: 2, p: 2, backgroundColor: 'primary.light' }}>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Typography variant="body2"><strong>Total Qty:</strong> {fmtQty(totalQty)}</Typography>
              <Typography variant="body2"><strong>Total Amount:</strong> {fmtMoney(totalAmount)}</Typography>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Back</Button>
          <Button variant="contained" color="primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : (isEdit ? 'Update Fabric PO' : 'Save Fabric PO')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FabricPOFormDialog;
