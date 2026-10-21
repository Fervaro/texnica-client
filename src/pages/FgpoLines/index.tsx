import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem, FormControl, InputLabel, Select, Tooltip
} from '@mui/material';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fgpoLinesApi, pricesApi } from '../../utils/api';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { useStyleOptions } from '../../hooks/styles/useStyleOptions';
import { useColorOptions } from '../../hooks/colors/useColorOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';
import { FgpoLine, Price } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const mapPrice = (raw: any): Price => ({
  id: raw.id ?? raw.ID ?? 0,
  styleId: raw.styleId ?? raw.StyleId ?? 0,
  styleCode: raw.styleCode ?? raw.StyleCode ?? '',
  colorId: raw.colorId ?? raw.ColorId ?? 0,
  colorName: raw.colorName ?? raw.ColorName ?? '',
  sizeId: raw.sizeId ?? raw.SizeId ?? 0,
  sizeCode: raw.sizeCode ?? raw.SizeCode ?? '',
  sku: raw.sku ?? raw.Sku ?? '',
  unitPrice: raw.unitPrice ?? raw.UnitPrice ?? 0,
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const mapFgpoLine = (raw: any): FgpoLine => ({
  id: raw.id ?? raw.ID ?? 0,
  fgpoId: raw.fgpoId ?? raw.FgpoId ?? 0,
  fgpoNumber: raw.fgpoNumber ?? raw.FgpoNumber ?? '',
  customerName: raw.customerName ?? raw.CustomerName ?? '',
  styleId: raw.styleId ?? raw.StyleId ?? 0,
  styleCode: raw.styleCode ?? raw.StyleCode ?? '',
  colorId: raw.colorId ?? raw.ColorId ?? 0,
  colorName: raw.colorName ?? raw.ColorName ?? '',
  sizeId: raw.sizeId ?? raw.SizeId ?? 0,
  sizeCode: raw.sizeCode ?? raw.SizeCode ?? '',
  quantity: raw.quantity ?? raw.Quantity ?? 0,
  unitPrice: raw.unitPrice ?? raw.UnitPrice,
  totalValue: raw.totalValue ?? raw.TotalValue ?? 0,
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = { FgpoId: 0, StyleId: 0, ColorId: 0, SizeId: 0, Quantity: '', UnitPrice: '' };

const FgpoLinesPage: React.FC = () => {
  const [items, setItems] = useState<FgpoLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const { options: fgpos } = useFgpoOptions();
  const { options: styles } = useStyleOptions();
  const { options: colors } = useColorOptions();
  const { options: sizes } = useSizeOptions();

  // Catálogo de precios (costing) para auto-completar el Unit Price
  const [prices, setPrices] = useState<Price[]>([]);
  const [catalogPrice, setCatalogPrice] = useState<Price | null>(null);
  const autoFilledCombo = useRef('');

  const loadPrices = async () => {
    try { const res = await pricesApi.getAll(); setPrices((res.data ?? []).map(mapPrice)); } catch { /* vacío */ }
  };
  useEffect(() => { loadPrices(); }, []);

  // Al cambiar Style/Color/Size: si existe precio en el catálogo, se auto-completa
  useEffect(() => {
    const combo = `${form.StyleId}-${form.ColorId}-${form.SizeId}`;
    if (form.StyleId && form.ColorId && form.SizeId) {
      const match = prices.find(p => p.styleId === form.StyleId && p.colorId === form.ColorId && p.sizeId === form.SizeId) ?? null;
      setCatalogPrice(match);
      if (match && combo !== autoFilledCombo.current) {
        autoFilledCombo.current = combo;
        setForm(prev => ({ ...prev, UnitPrice: match.unitPrice.toString() }));
      }
    } else {
      setCatalogPrice(null);
      autoFilledCombo.current = '';
    }
  }, [form.StyleId, form.ColorId, form.SizeId, prices]);

  const load = async () => {
    setLoading(true);
    try { const res = await fgpoLinesApi.getAll(); setItems((res.data ?? []).map(mapFgpoLine)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error cargando.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.fgpoNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.styleCode.toLowerCase().includes(search.toLowerCase()) ||
    i.colorName.toLowerCase().includes(search.toLowerCase()) ||
    i.sizeCode.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.FgpoId || !form.StyleId || !form.ColorId || !form.SizeId) { setFormError('FGPO, Style, Color y Size son obligatorios.'); return; }
    const negField = firstNegativeField([
      { name: 'Quantity', value: form.Quantity },
      { name: 'Unit Price', value: form.UnitPrice },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    setFormError(''); setSaving(true);
    try {
      const payload = {
        FgpoId: Number(form.FgpoId), StyleId: Number(form.StyleId), ColorId: Number(form.ColorId), SizeId: Number(form.SizeId),
        Quantity: Number(form.Quantity), UnitPrice: form.UnitPrice === '' ? null : Number(form.UnitPrice),
      };
      if (editingId) await fgpoLinesApi.update(editingId, payload); else await fgpoLinesApi.create(payload);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar esta línea?')) return;
    try { await fgpoLinesApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (l: FgpoLine) => {
    setEditingId(l.id);
    // Conserva el precio guardado de la línea (no lo sobrescribe el catálogo)
    autoFilledCombo.current = `${l.styleId}-${l.colorId}-${l.sizeId}`;
    setForm({ FgpoId: l.fgpoId, StyleId: l.styleId, ColorId: l.colorId, SizeId: l.sizeId, Quantity: l.quantity?.toString() ?? '', UnitPrice: l.unitPrice?.toString() ?? '' });
    setFormError(''); setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <FormatListNumberedIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> FGPO Lines
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Líneas de PO: Style + Color + Size + Cantidad (unidad de producción)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Line</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Buscar por FGPO, Style, Color o Size..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['FGPO', 'Style', 'Color', 'Size', 'Qty', 'Unit Price', 'Total', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No lines found</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{l.fgpoNumber}</TableCell>
                  <TableCell>{l.styleCode}</TableCell>
                  <TableCell>{l.colorName}</TableCell>
                  <TableCell>{l.sizeCode}</TableCell>
                  <TableCell>{l.quantity}</TableCell>
                  <TableCell>{l.unitPrice != null ? `$${l.unitPrice.toFixed(3)}` : '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>${l.totalValue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar"><IconButton size="small" color="info" onClick={() => openEdit(l)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(l.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Line' : 'New Line'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FgpoId || ''} label="FGPO *" onChange={e => setForm({ ...form, FgpoId: Number(e.target.value) })}>
                  <MenuItem value=""><em>Select...</em></MenuItem>
                  {fgpos.map((f: any) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Style *</InputLabel>
                  <Select value={form.StyleId || ''} label="Style *" onChange={e => setForm({ ...form, StyleId: Number(e.target.value) })}>
                    <MenuItem value=""><em>Select...</em></MenuItem>
                    {styles.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Color *</InputLabel>
                  <Select value={form.ColorId || ''} label="Color *" onChange={e => setForm({ ...form, ColorId: Number(e.target.value) })}>
                    <MenuItem value=""><em>Select...</em></MenuItem>
                    {colors.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Size *</InputLabel>
                  <Select value={form.SizeId || ''} label="Size *" onChange={e => setForm({ ...form, SizeId: Number(e.target.value) })}>
                    <MenuItem value=""><em>Select...</em></MenuItem>
                    {sizes.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth size="small" label="Quantity *" type="number" value={form.Quantity} onChange={e => setForm({ ...form, Quantity: e.target.value })} required onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
                <TextField fullWidth size="small" label="Unit Price" type="number" value={form.UnitPrice} onChange={e => setForm({ ...form, UnitPrice: e.target.value })} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: { min: 0, step: 'any' } }} />
              </Box>
              {form.StyleId && form.ColorId && form.SizeId && (
                <Typography variant="caption" color={catalogPrice ? 'success.main' : 'text.secondary'}>
                  {catalogPrice
                    ? `Precio del catálogo: $${catalogPrice.unitPrice.toFixed(3)} (${catalogPrice.sku || 'sin SKU'}) — aplicado automáticamente`
                    : 'No hay precio en el catálogo para esta combinación Style/Color/Size'}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" type="submit" disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FgpoLinesPage;
