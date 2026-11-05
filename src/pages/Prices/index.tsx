import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem, FormControl, InputLabel, Select, Tooltip
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { pricesApi } from '../../utils/api';
import { useStyleOptions } from '../../hooks/styles/useStyleOptions';
import { useColorOptions } from '../../hooks/colors/useColorOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';
import { Price } from '../../types';

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

const emptyForm = { StyleId: 0, ColorId: 0, SizeId: 0, Sku: '', UnitPrice: '', Comments: '' };

const PricesPage: React.FC = () => {
  const [items, setItems] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const { options: styles } = useStyleOptions();
  const { options: colors } = useColorOptions();
  const { options: sizes } = useSizeOptions();

  const load = async () => {
    setLoading(true);
    try { const res = await pricesApi.getAll(); setItems((res.data ?? []).map(mapPrice)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error loading.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.styleCode.toLowerCase().includes(search.toLowerCase()) ||
    i.colorName.toLowerCase().includes(search.toLowerCase()) ||
    i.sizeCode.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku ?? '').toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.StyleId || !form.ColorId || !form.SizeId) { setFormError('Style, Color and Size are required.'); return; }
    setFormError(''); setSaving(true);
    try {
      const payload = {
        StyleId: Number(form.StyleId), ColorId: Number(form.ColorId), SizeId: Number(form.SizeId),
        Sku: form.Sku, UnitPrice: Number(form.UnitPrice), Comments: form.Comments,
      };
      if (editingId) await pricesApi.update(editingId, payload); else await pricesApi.create(payload);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this Price?')) return;
    try { await pricesApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (p: Price) => {
    setEditingId(p.id);
    setForm({ StyleId: p.styleId, ColorId: p.colorId, SizeId: p.sizeId, Sku: p.sku ?? '', UnitPrice: p.unitPrice?.toString() ?? '', Comments: p.comments ?? '' });
    setFormError(''); setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <AttachMoneyIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Prices
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Costing por Style + Color + Size</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Price</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Search by Style, Color, Size or SKU..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Style', 'Color', 'Size', 'SKU', 'Unit Price', 'Comments', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No prices found</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{p.styleCode}</TableCell>
                  <TableCell>{p.colorName}</TableCell>
                  <TableCell>{p.sizeCode}</TableCell>
                  <TableCell>{p.sku || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>${p.unitPrice.toFixed(3)}</TableCell>
                  <TableCell>{p.comments || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit"><IconButton size="small" color="info" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Price' : 'New Price'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                <TextField fullWidth size="small" label="SKU (ej. B1001BLK01)" value={form.Sku} onChange={e => setForm({ ...form, Sku: e.target.value })} />
                <TextField fullWidth size="small" label="Unit Price *" type="number" value={form.UnitPrice} onChange={e => setForm({ ...form, UnitPrice: e.target.value })} required />
              </Box>
              <TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setForm({ ...form, Comments: e.target.value })} />
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

export default PricesPage;
