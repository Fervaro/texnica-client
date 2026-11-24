import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, InputLabel, MenuItem, Select, TextField,
  Typography,
} from '@mui/material';
import { packingControlsApi } from '../utils/api';
import { PackingIrrBoxOptions } from '../types';

interface Option { id: number; label: string; }
interface Props {
  open: boolean;
  onClose: () => void;
  userOptions: Option[];
  onSaved: () => Promise<void> | void;
}

const today = () => new Date().toISOString().split('T')[0];

const PackingIrrBoxDialog: React.FC<Props> = ({ open, onClose, userOptions, onSaved }) => {
  const [fgpoId, setFgpoId] = useState(0);
  const [fgpoOptions, setFgpoOptions] = useState<Option[]>([]);
  const [fgpoLoading, setFgpoLoading] = useState(false);
  const [options, setOptions] = useState<PackingIrrBoxOptions | null>(null);
  const [fieldNo, setFieldNo] = useState(0);
  const [variantKey, setVariantKey] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [packingDate, setPackingDate] = useState(today());
  const [responsiblePersonId, setResponsiblePersonId] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [manualCapacity, setManualCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFgpoId(0); setOptions(null); setFieldNo(0); setVariantKey(''); setQuantities({});
    setPackingDate(today()); setResponsiblePersonId(0); setRemarks(''); setManualCapacity(''); setError('');
    let active = true;
    setFgpoOptions([]);
    setFgpoLoading(true);
    packingControlsApi.getFgpos()
      .then(res => {
        if (!active) return;
        setFgpoOptions((res.data ?? []).map((f: any) => ({
          id: f.fgpoId ?? f.FgpoId ?? 0,
          label: f.fgpoNumber ?? f.FgpoNumber ?? '',
        })));
      })
      .catch(() => { if (active) setFgpoOptions([]); })
      .finally(() => { if (active) setFgpoLoading(false); });
    return () => { active = false; };
  }, [open]);

  const selectedVariant = useMemo(() => options?.variants.find(v => `${v.style}\u0000${v.color}` === variantKey), [options, variantKey]);
  const sizes = selectedVariant?.sizes.filter(s => s.fieldNo === fieldNo) ?? [];
  const capacity = Number(manualCapacity) || 0;
  const total = sizes.reduce((sum, s) => sum + (Number(quantities[s.size] ?? '') || 0), 0);

  const loadOptions = async (id: number) => {
    setFgpoId(id); setOptions(null); setFieldNo(0); setVariantKey(''); setQuantities({}); setError('');
    if (!id) return;
    setLoading(true);
    try {
      const res = await packingControlsApi.getIrrBoxOptions(id);
      const raw = res.data ?? res;
      setOptions({
        fgpoId: raw.fgpoId ?? raw.FGPOId ?? id,
        categories: (raw.categories ?? raw.Categories ?? []).map((c: any) => ({ fieldNo: c.fieldNo ?? c.FieldNo, label: c.label ?? c.Label })),
        variants: (raw.variants ?? raw.Variants ?? []).map((v: any) => ({
          style: v.style ?? v.Style ?? '', color: v.color ?? v.Color ?? '',
          pcsPerCarton: v.pcsPerCarton ?? v.PcsPerCarton ?? 0,
          sizes: (v.sizes ?? v.Sizes ?? []).map((s: any) => ({ fieldNo: s.fieldNo ?? s.FieldNo, size: s.size ?? s.Size ?? '', availableQty: s.availableQty ?? s.AvailableQty ?? 0 })),
        })),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || err?.message || 'Could not load IRR availability.');
    } finally { setLoading(false); }
  };

  const selectCategory = (value: number) => { setFieldNo(value); setQuantities({}); };
  const selectVariant = (value: string) => {
    const variant = options?.variants.find(v => `${v.style}\u0000${v.color}` === value);
    setVariantKey(value);
    setQuantities({});
    setManualCapacity(variant?.pcsPerCarton ? String(variant.pcsPerCarton) : '');
  };

  const autoFill = () => {
    let remaining = capacity;
    const next: Record<string, string> = {};
    for (const size of sizes) {
      const take = Math.min(remaining, size.availableQty);
      if (take > 0) next[size.size] = String(take);
      remaining -= take;
      if (remaining <= 0) break;
    }
    setQuantities(next);
  };

  const submit = async () => {
    setError('');
    if (!fgpoId || !fieldNo || !selectedVariant) { setError('Select an FGPO, IRR category, style and color.'); return; }
    if (!packingDate) { setError('Packing Date is required.'); return; }
    if (capacity <= 0) { setError('Box capacity must be greater than zero.'); return; }
    const lines = sizes.map(s => ({ size: s.size, quantity: Number(quantities[s.size] ?? '') || 0 })).filter(l => l.quantity > 0);
    if (!lines.length) { setError('Enter at least one size quantity.'); return; }
    const over = lines.find(l => l.quantity > (sizes.find(s => s.size === l.size)?.availableQty ?? 0));
    if (over) { setError(`Requested quantity exceeds available ${over.size} pieces.`); return; }
    if (total > capacity) { setError(`Total (${total}) exceeds box capacity (${capacity}).`); return; }
    setSaving(true);
    try {
      await packingControlsApi.createIrrBox({
        packingDate: new Date(packingDate).toISOString(), fgpoId, fieldNo,
        style: selectedVariant.style, color: selectedVariant.color,
        pcsPerCarton: capacity,
        responsiblePersonId: responsiblePersonId || null, remarks: remarks || null, lines,
      });
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || err?.message || 'Error creating IRR box.');
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>Create IRR Box</DialogTitle>
    <DialogContent>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{String(error)}</Alert>}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" disabled={fgpoLoading}><InputLabel>FGPO *</InputLabel>
            <Select value={fgpoId || ''} label="FGPO *" onChange={e => loadOptions(Number(e.target.value))}>
              <MenuItem value=""><em>Select an FGPO...</em></MenuItem>
              {fgpoOptions.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {fgpoLoading && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption">Loading FGPOs...</Typography></Box></Grid>}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Packing Date *" type="date" value={packingDate} onChange={e => setPackingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </Grid>
        {loading && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /><Typography variant="body2">Loading available IRR quantities...</Typography></Box></Grid>}
        {options && <>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" disabled={!options.categories.length}><InputLabel>IRR category *</InputLabel>
              <Select value={fieldNo || ''} label="IRR category *" onChange={e => selectCategory(Number(e.target.value))}>
                <MenuItem value=""><em>Select category...</em></MenuItem>
                {options.categories.map(c => <MenuItem key={c.fieldNo} value={c.fieldNo}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        {fgpoLoading && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption">Loading FGPOs...</Typography></Box></Grid>}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" disabled={!fieldNo}><InputLabel>Style / Color *</InputLabel>
              <Select value={variantKey} label="Style / Color *" onChange={e => selectVariant(String(e.target.value))}>
                <MenuItem value=""><em>Select style and color...</em></MenuItem>
                {options.variants.filter(v => v.sizes.some(s => s.fieldNo === fieldNo)).map(v => {
                  const key = `${v.style}\u0000${v.color}`;
                  return <MenuItem key={key} value={key}>{v.style} / {v.color}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Grid>
          {!options.variants.some(v => v.sizes.length > 0) && <Grid size={{ xs: 12 }}><Alert severity="info">No IRR pieces are available for this FGPO.</Alert></Grid>}
        </>}
        {selectedVariant && <>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Box capacity (pcs) *" type="number" value={manualCapacity} onChange={e => setManualCapacity(e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} helperText="Suggested for this style/color; adjust as needed" />
          </Grid>
          <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Pieces by size · {options?.categories.find(c => c.fieldNo === fieldNo)?.label}</Typography></Divider></Grid>
          {sizes.length === 0 ? <Grid size={{ xs: 12 }}><Typography variant="body2" color="text.secondary">No remaining pieces for this category, style and color.</Typography></Grid> : sizes.map(s => <Grid size={{ xs: 6, sm: 4 }} key={s.size}>
            <TextField fullWidth size="small" type="number" label={`${s.size} · available ${s.availableQty}`} value={quantities[s.size] ?? ''} onChange={e => setQuantities(prev => ({ ...prev, [s.size]: e.target.value }))} slotProps={{ htmlInput: { min: 0, max: s.availableQty } }} />
          </Grid>)}
          {sizes.length > 0 && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Button variant="outlined" size="small" onClick={autoFill} disabled={capacity <= 0}>Auto-fill</Button><Chip size="small" variant="outlined" color={total > capacity ? 'error' : total === capacity ? 'success' : 'default'} label={`Total: ${total} / ${capacity}`} /></Box></Grid>}
        </>}
        <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth size="small"><InputLabel>Responsible Person</InputLabel><Select value={responsiblePersonId || ''} label="Responsible Person" onChange={e => setResponsiblePersonId(Number(e.target.value))}><MenuItem value=""><em>Select a user...</em></MenuItem>{userOptions.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}</Select></FormControl></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} /></Grid>
      </Grid>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={submit} disabled={saving || loading || !options}>{saving ? 'Creating...' : 'Create IRR Box'}</Button></DialogActions>
  </Dialog>;
};

export default PackingIrrBoxDialog;
