import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, Tooltip, Autocomplete
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { boxTypesApi } from '../../utils/api';
import { BoxType } from '../../types';
import { useStyleOptions } from '../../hooks/styles/useStyleOptions';
import { useColorOptions } from '../../hooks/colors/useColorOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const mapBoxType = (raw: any): BoxType => ({
  id: raw.id ?? raw.ID ?? 0,
  boxCode: raw.boxCode ?? raw.BoxCode ?? '',
  length: raw.length ?? raw.Length,
  width: raw.width ?? raw.Width,
  height: raw.height ?? raw.Height,
  emptyCartonWeight: raw.emptyCartonWeight ?? raw.EmptyCartonWeight,
  style: raw.style ?? raw.Style ?? '',
  color: raw.color ?? raw.Color ?? '',
  size: raw.size ?? raw.Size ?? '',
  qtyPerBox: raw.qtyPerBox ?? raw.QtyPerBox ?? 0,
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = { BoxCode: '', Length: '', Width: '', Height: '', EmptyCartonWeight: '', Style: '', Color: '', Size: '', QtyPerBox: '', Comments: '' };

const BoxTypesPage: React.FC = () => {
  const [items, setItems] = useState<BoxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await boxTypesApi.getAll(); setItems((res.data ?? []).map(mapBoxType)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error cargando.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => !search || i.boxCode.toLowerCase().includes(search.toLowerCase()));

  const { options: styleMaster } = useStyleOptions();
  const { options: colorMaster } = useColorOptions();
  const { options: sizeMaster } = useSizeOptions();
  const styleOptions = styleMaster.map(o => o.label).filter(Boolean);
  const colorOptions = colorMaster.map(o => o.label).filter(Boolean);
  const sizeOptions = sizeMaster.map(o => o.label).filter(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const negField = firstNegativeField([
      { name: 'Length', value: form.Length },
      { name: 'Width', value: form.Width },
      { name: 'Height', value: form.Height },
      { name: 'Empty Carton Weight', value: form.EmptyCartonWeight },
      { name: 'Qty por box', value: form.QtyPerBox },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    if (!form.QtyPerBox || Number(form.QtyPerBox) <= 0) { setFormError('Qty por box debe ser mayor que 0 (cantidad de prendas por caja).'); return; }
    setFormError(''); setSaving(true);
    try {
      const payload = {
        ...form,
        Length: form.Length === '' ? null : Number(form.Length),
        Width: form.Width === '' ? null : Number(form.Width),
        Height: form.Height === '' ? null : Number(form.Height),
        EmptyCartonWeight: form.EmptyCartonWeight === '' ? null : Number(form.EmptyCartonWeight),
        QtyPerBox: Number(form.QtyPerBox || 0),
      };
      if (editingId) await boxTypesApi.update(editingId, payload); else await boxTypesApi.create(payload);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este Box Type?')) return;
    try { await boxTypesApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (b: BoxType) => {
    setEditingId(b.id);
    setForm({ BoxCode: b.boxCode, Length: b.length?.toString() ?? '', Width: b.width?.toString() ?? '', Height: b.height?.toString() ?? '', EmptyCartonWeight: b.emptyCartonWeight?.toString() ?? '', Style: b.style ?? '', Color: b.color ?? '', Size: b.size ?? '', QtyPerBox: b.qtyPerBox?.toString() ?? '', Comments: b.comments ?? '' });
    setFormError(''); setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Box Types
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Tipos de caja de empaque (Master Data)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Box Type</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Buscar tipo de caja..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Box', 'Style', 'Color', 'Size', 'Qty/Box', 'Length', 'Width', 'Height', 'Empty Wt (kg)', 'Comments', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>No box types found</TableCell></TableRow>
              ) : filtered.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{b.boxCode}</TableCell>
                  <TableCell>{b.style || '-'}</TableCell>
                  <TableCell>{b.color || '-'}</TableCell>
                  <TableCell>{b.size || '-'}</TableCell>
                  <TableCell>{b.qtyPerBox ?? '-'}</TableCell>
                  <TableCell>{b.length ?? '-'}</TableCell>
                  <TableCell>{b.width ?? '-'}</TableCell>
                  <TableCell>{b.height ?? '-'}</TableCell>
                  <TableCell>{b.emptyCartonWeight ?? '-'}</TableCell>
                  <TableCell>{b.comments || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar"><IconButton size="small" color="info" onClick={() => openEdit(b)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(b.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Box Type' : 'New Box Type'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth size="small" label="Box Code * (ej. A box)" value={form.BoxCode} onChange={e => setForm({ ...form, BoxCode: e.target.value })} required />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth size="small" label="Length" type="number" value={form.Length} onChange={e => setForm({ ...form, Length: e.target.value })} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
                <TextField fullWidth size="small" label="Width" type="number" value={form.Width} onChange={e => setForm({ ...form, Width: e.target.value })} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
                <TextField fullWidth size="small" label="Height" type="number" value={form.Height} onChange={e => setForm({ ...form, Height: e.target.value })} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
              </Box>
              <TextField fullWidth size="small" label="Empty Carton Weight (kg)" type="number" value={form.EmptyCartonWeight} onChange={e => setForm({ ...form, EmptyCartonWeight: e.target.value })} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Autocomplete fullWidth size="small" freeSolo options={styleOptions}
                  inputValue={form.Style} onInputChange={(_, v) => setForm({ ...form, Style: v })}
                  renderInput={(params) => <TextField {...params} label="Style" />} />
                <Autocomplete fullWidth size="small" freeSolo options={colorOptions}
                  inputValue={form.Color} onInputChange={(_, v) => setForm({ ...form, Color: v })}
                  renderInput={(params) => <TextField {...params} label="Color" />} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Autocomplete fullWidth size="small" freeSolo options={sizeOptions}
                  inputValue={form.Size} onInputChange={(_, v) => setForm({ ...form, Size: v })}
                  renderInput={(params) => <TextField {...params} label="Size" />} />
                <TextField fullWidth size="small" label="Qty por box *" type="number" value={form.QtyPerBox} onChange={e => setForm({ ...form, QtyPerBox: e.target.value })} required onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} />
              </Box>
              <TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setForm({ ...form, Comments: e.target.value })} multiline rows={2} />
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

export default BoxTypesPage;
