import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, InputLabel, MenuItem, Select, TextField,
  Typography, ListItemText,
} from '@mui/material';
import { packingControlsApi } from '../utils/api';
import { PackingFqBoxOptions } from '../types';

interface Option { id: number; label: string; }
interface Props {
  open: boolean;
  onClose: () => void;
  userOptions: Option[];
  isVolcano: boolean;
  onSaved: () => Promise<void> | void;
}

const today = () => new Date().toISOString().split('T')[0];

const PackingFqBoxDialog: React.FC<Props> = ({ open, onClose, userOptions, isVolcano, onSaved }) => {
  const [fgpos, setFgpos] = useState<Option[]>([]);
  const [fgpoLoading, setFgpoLoading] = useState(false);
  const [selectedFgpoIds, setSelectedFgpoIds] = useState<number[]>([]);
  const [options, setOptions] = useState<PackingFqBoxOptions | null>(null);
  const [variantKey, setVariantKey] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [packingDate, setPackingDate] = useState(today());
  const [responsiblePersonId, setResponsiblePersonId] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [manualCapacity, setManualCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const optionsRequestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    optionsRequestId.current++;
    setFgpos([]); setFgpoLoading(true); setSelectedFgpoIds([]); setOptions(null); setVariantKey('');
    setQuantities({}); setPackingDate(today()); setResponsiblePersonId(0); setRemarks('');
    setManualCapacity(''); setError('');
    packingControlsApi.getFgpos()
      .then(res => {
        if (active) setFgpos((res.data ?? []).map((f: any) => ({
          id: f.fgpoId ?? f.FgpoId ?? 0,
          label: f.fgpoNumber ?? f.FgpoNumber ?? '',
        })));
      })
      .catch(() => { if (active) setFgpos([]); })
      .finally(() => { if (active) setFgpoLoading(false); });
    return () => { active = false; };
  }, [open]);

  const variant = useMemo(() => options?.variants.find(v => `${v.style}\u0000${v.color}` === variantKey), [options, variantKey]);
  const sizes = variant?.sizes ?? [];
  const capacity = isVolcano ? (Number(manualCapacity) || 0) : (variant?.pcsPerCarton ?? 0);
  const total = sizes.reduce((sum, size) => sum + (Number(quantities[size.size] ?? '') || 0), 0);

  const loadOptions = async (ids: number[]) => {
    const requestId = ++optionsRequestId.current;
    setSelectedFgpoIds(ids); setOptions(null); setVariantKey(''); setQuantities({}); setManualCapacity(''); setError('');
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const res = await packingControlsApi.getFqBoxOptions(ids);
      const raw = res.data ?? res;
      if (requestId !== optionsRequestId.current) return;
      setOptions({
        fgpoIds: raw.fgpoIds ?? raw.FGPOIds ?? ids,
        variants: (raw.variants ?? raw.Variants ?? []).map((v: any) => ({
          fgpoIds: v.fgpoIds ?? v.FGPOIds ?? [],
          style: v.style ?? v.Style ?? '', color: v.color ?? v.Color ?? '',
          pcsPerCarton: v.pcsPerCarton ?? v.PcsPerCarton ?? 0,
          sizes: (v.sizes ?? v.Sizes ?? []).map((s: any) => ({
            size: s.size ?? s.Size ?? '', availableQty: s.availableQty ?? s.AvailableQty ?? 0,
          })),
        })),
      });
    } catch (err: any) {
      if (requestId === optionsRequestId.current) setError(err?.response?.data?.message || err?.response?.data || err?.message || 'Could not load FQ availability.');
    } finally { if (requestId === optionsRequestId.current) setLoading(false); }
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
    if (selectedFgpoIds.length === 0 || !variant) { setError('Select one or more FGPOs, style and color.'); return; }
    if (!packingDate) { setError('Packing Date is required.'); return; }
    if (capacity <= 0) { setError('Box capacity must be greater than zero.'); return; }
    const lines = sizes.map(s => ({ size: s.size, quantity: Number(quantities[s.size] ?? '') || 0 })).filter(line => line.quantity > 0);
    if (!lines.length) { setError('Enter at least one FQ quantity by size.'); return; }
    const over = lines.find(line => line.quantity > (sizes.find(s => s.size === line.size)?.availableQty ?? 0));
    if (over) { setError(`Requested quantity exceeds available FQ ${over.size} pieces.`); return; }
    if (total > capacity) { setError(`Total (${total}) exceeds box capacity (${capacity}).`); return; }
    setSaving(true);
    try {
      await packingControlsApi.createFqBox({
        packingDate: new Date(packingDate).toISOString(), fgpoIds: selectedFgpoIds,
        style: variant.style, color: variant.color,
        pcsPerCarton: isVolcano ? capacity : null,
        responsiblePersonId: responsiblePersonId || null, remarks: remarks || null, lines,
      });
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || err?.message || 'Error creating FQ box.');
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>Create FQ Box</DialogTitle>
    <DialogContent>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{String(error)}</Alert>}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" disabled={fgpoLoading}><InputLabel>FGPO *</InputLabel>
            <Select
              multiple
              value={selectedFgpoIds}
              label="FGPO *"
              onChange={e => {
                const value = e.target.value;
                const ids = (Array.isArray(value) ? value : String(value).split(',')).map(Number);
                void loadOptions(ids);
              }}
              renderValue={selected => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as number[]).map(id => <Chip key={id} size="small" label={fgpos.find(f => f.id === id)?.label ?? String(id)} />)}</Box>}
            >
              {fgpos.map(f => <MenuItem key={f.id} value={f.id}><Checkbox checked={selectedFgpoIds.includes(f.id)} /><ListItemText primary={f.label} /></MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Packing Date *" type="date" value={packingDate} onChange={e => setPackingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
        {fgpoLoading && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption">Loading FGPOs...</Typography></Box></Grid>}
        {variant && variant.fgpoIds.length > 1 && <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary">This box will use FQ from {variant.fgpoIds.map(id => fgpos.find(f => f.id === id)?.label ?? id).join(', ')} and will be listed under the first contributing FGPO.</Typography></Grid>}
        {loading && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography variant="caption">Loading available FQ quantities...</Typography></Box></Grid>}
        {options && <>
          <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth size="small" disabled={!options.variants.length}><InputLabel>Style / Color *</InputLabel>
            <Select value={variantKey} label="Style / Color *" onChange={e => { setVariantKey(String(e.target.value)); setQuantities({}); setManualCapacity(''); }}>
              <MenuItem value=""><em>Select style and color...</em></MenuItem>
              {options.variants.map(v => <MenuItem key={`${v.style}\u0000${v.color}`} value={`${v.style}\u0000${v.color}`}>{v.style} / {v.color}</MenuItem>)}
            </Select>
          </FormControl></Grid>
          {!options.variants.length && <Grid size={{ xs: 12 }}><Alert severity="info">No FQ pieces are available for this FGPO.</Alert></Grid>}
        </>}
        {variant && <>
          <Grid size={{ xs: 12, sm: 6 }}>
            {isVolcano ? <TextField fullWidth size="small" label="Box capacity (pcs) *" type="number" value={manualCapacity} onChange={e => setManualCapacity(e.target.value)} slotProps={{ htmlInput: { min: 1 } }} /> :
              <TextField fullWidth size="small" label="Box capacity (pcs)" value={capacity || ''} disabled helperText="Configured capacity for this style/color" />}
          </Grid>
          <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">FQ pieces by size</Typography></Divider></Grid>
          {sizes.map(s => <Grid size={{ xs: 6, sm: 4 }} key={s.size}><TextField fullWidth size="small" type="number" label={`${s.size} · available ${s.availableQty}`} value={quantities[s.size] ?? ''} onChange={e => setQuantities(prev => ({ ...prev, [s.size]: e.target.value }))} slotProps={{ htmlInput: { min: 0, max: s.availableQty } }} /></Grid>)}
          {sizes.length > 0 && <Grid size={{ xs: 12 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Button variant="outlined" size="small" onClick={autoFill} disabled={capacity <= 0}>Auto-fill</Button><Chip size="small" variant="outlined" color={total > capacity ? 'error' : total === capacity ? 'success' : 'default'} label={`Total: ${total} / ${capacity}`} /></Box></Grid>}
        </>}
        <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth size="small"><InputLabel>Responsible Person</InputLabel><Select value={responsiblePersonId || ''} label="Responsible Person" onChange={e => setResponsiblePersonId(Number(e.target.value))}><MenuItem value=""><em>Select a user...</em></MenuItem>{userOptions.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}</Select></FormControl></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} /></Grid>
      </Grid>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={submit} disabled={saving || loading || !options}>{saving ? 'Creating...' : 'Create FQ Box'}</Button></DialogActions>
  </Dialog>;
};

export default PackingFqBoxDialog;
