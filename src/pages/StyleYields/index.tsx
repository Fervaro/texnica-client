import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem, FormControl, InputLabel, Select, Tooltip
} from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { styleYieldsApi } from '../../utils/api';
import { useStyleOptions } from '../../hooks/styles/useStyleOptions';
import { useComponentOptions } from '../../hooks/components/useComponentOptions';
import { StyleYield } from '../../types';

const mapStyleYield = (raw: any): StyleYield => ({
  id: raw.id ?? raw.ID ?? 0,
  styleId: raw.styleId ?? raw.StyleId ?? 0,
  styleCode: raw.styleCode ?? raw.StyleCode ?? '',
  componentId: raw.componentId ?? raw.ComponentId ?? 0,
  componentCode: raw.componentCode ?? raw.ComponentCode ?? '',
  yieldQuoted: raw.yieldQuoted ?? raw.YieldQuoted,
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = { StyleId: 0, ComponentId: 0, YieldQuoted: '' };

const StyleYieldsPage: React.FC = () => {
  const [items, setItems] = useState<StyleYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const { options: styles } = useStyleOptions();
  const { options: components } = useComponentOptions();

  const load = async () => {
    setLoading(true);
    try { const res = await styleYieldsApi.getAll(); setItems((res.data ?? []).map(mapStyleYield)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error cargando.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Precarga el formulario cuando se llega desde Fabric Requirement
  // ("Configurar Style Yield") => /admin/style-yields?style=1&component=2
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const style = searchParams.get('style');
    const component = searchParams.get('component');
    if (!style && !component) return;
    setEditingId(null);
    setForm({
      ...emptyForm,
      StyleId: style ? Number(style) : 0,
      ComponentId: component ? Number(component) : 0,
    });
    setFormError('');
    setDialogOpen(true);
    // Limpia los parámetros para no reabrir el diálogo al recargar
    const next = new URLSearchParams(searchParams);
    next.delete('style');
    next.delete('component');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = items.filter(i =>
    !search || i.styleCode.toLowerCase().includes(search.toLowerCase()) ||
    i.componentCode.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.StyleId || !form.ComponentId) { setFormError('Style y Component son obligatorios.'); return; }
    setFormError(''); setSaving(true);
    try {
      const payload = {
        StyleId: Number(form.StyleId), ComponentId: Number(form.ComponentId),
        YieldQuoted: form.YieldQuoted === '' ? null : Number(form.YieldQuoted),
      };
      if (editingId) await styleYieldsApi.update(editingId, payload); else await styleYieldsApi.create(payload);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este Yield?')) return;
    try { await styleYieldsApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (y: StyleYield) => {
    setEditingId(y.id);
    setForm({ StyleId: y.styleId, ComponentId: y.componentId, YieldQuoted: y.yieldQuoted?.toString() ?? '' });
    setFormError(''); setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <PercentIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Style Yields
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Consumo por estilo y componente (Yield cotizado vs real)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Yield</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Buscar por Style o Component..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Style', 'Component', 'Yield Quoted', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No yields found</TableCell></TableRow>
              ) : filtered.map((y) => (
                <TableRow key={y.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{y.styleCode}</TableCell>
                  <TableCell>{y.componentCode}</TableCell>
                  <TableCell>{y.yieldQuoted ?? '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar"><IconButton size="small" color="info" onClick={() => openEdit(y)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(y.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Yield' : 'New Yield'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Style *</InputLabel>
                <Select value={form.StyleId || ''} label="Style *" onChange={e => setForm({ ...form, StyleId: Number(e.target.value) })}>
                  <MenuItem value=""><em>Select a Style...</em></MenuItem>
                  {styles.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Component *</InputLabel>
                <Select value={form.ComponentId || ''} label="Component *" onChange={e => setForm({ ...form, ComponentId: Number(e.target.value) })}>
                  <MenuItem value=""><em>Select a Component...</em></MenuItem>
                  {components.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth size="small" label="Yield Quoted" type="number" value={form.YieldQuoted} onChange={e => setForm({ ...form, YieldQuoted: e.target.value })} />
              </Box>
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

export default StyleYieldsPage;
