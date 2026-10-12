import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, Tooltip
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { colorsApi } from '../../utils/api';
import { Color } from '../../types';

const mapColor = (raw: any): Color => ({
  id: raw.id ?? raw.ID ?? 0,
  colorCode: raw.colorCode ?? raw.ColorCode ?? '',
  alternateCode: raw.alternateCode ?? raw.AlternateCode ?? '',
  colorName: raw.colorName ?? raw.ColorName ?? '',
  dyeMethod: raw.dyeMethod ?? raw.DyeMethod ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = { ColorCode: '', AlternateCode: '', ColorName: '', DyeMethod: '' };

const ColorsPage: React.FC = () => {
  const [items, setItems] = useState<Color[]>([]);
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
    try { const res = await colorsApi.getAll(); setItems((res.data ?? []).map(mapColor)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error cargando.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Precarga el formulario de creación cuando se llega desde otro módulo
  // (ej. FGPO → "+ Agregar nuevo Color \"Navy Blue\"") => /admin/colors?value=Navy%20Blue
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const value = searchParams.get('value');
    if (!value) return;
    setEditingId(null);
    setForm({ ...emptyForm, ColorName: value });
    setFormError('');
    setDialogOpen(true);
    // Limpia el parámetro para no reabrir el diálogo al recargar
    const next = new URLSearchParams(searchParams);
    next.delete('value');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = items.filter(i =>
    !search || i.colorName.toLowerCase().includes(search.toLowerCase()) ||
    (i.dyeMethod ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.colorCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.alternateCode ?? '').toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(''); setSaving(true);
    try {
      if (editingId) await colorsApi.update(editingId, form); else await colorsApi.create(form);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este Color?')) return;
    try { await colorsApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (c: Color) => { setEditingId(c.id); setForm({ ColorCode: c.colorCode ?? '', AlternateCode: c.alternateCode ?? '', ColorName: c.colorName, DyeMethod: c.dyeMethod ?? '' }); setFormError(''); setDialogOpen(true); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <PaletteIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Colors
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Catálogo de colores (Master Data)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Color</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Buscar color o método de teñido..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Code', 'Alternate Code', 'Color', 'Dye Method', 'Actions'].map(h => <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No colors found</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.colorCode || '-'}</TableCell>
                  <TableCell>{c.alternateCode || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.colorName}</TableCell>
                  <TableCell>{c.dyeMethod || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar"><IconButton size="small" color="info" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(c.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Color' : 'New Color'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth size="small" label="Color Name *" value={form.ColorName} onChange={e => setForm({ ...form, ColorName: e.target.value })} required />
              <TextField fullWidth size="small" label="Color Code" value={form.ColorCode} onChange={e => setForm({ ...form, ColorCode: e.target.value })} />
              <TextField fullWidth size="small" label="Alternate Code" value={form.AlternateCode} onChange={e => setForm({ ...form, AlternateCode: e.target.value })} />
              <TextField fullWidth size="small" label="Dye Method" value={form.DyeMethod} onChange={e => setForm({ ...form, DyeMethod: e.target.value })} />
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

export default ColorsPage;
