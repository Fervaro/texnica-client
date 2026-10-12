import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, Tooltip
} from '@mui/material';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { stylesApi } from '../../utils/api';
import { Style } from '../../types';

const mapStyle = (raw: any): Style => ({
  id: raw.id ?? raw.ID ?? 0,
  styleCode: raw.styleCode ?? raw.StyleCode ?? '',
  description: raw.description ?? raw.Description ?? '',
  fabricDescription: raw.fabricDescription ?? raw.FabricDescription ?? '',
  fabricContent: raw.fabricContent ?? raw.FabricContent ?? '',
  construction: raw.construction ?? raw.Construction ?? '',
  gsm: raw.gsm ?? raw.Gsm,
  weightOz: raw.weightOz ?? raw.WeightOz,
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = {
  StyleCode: '', Description: '', FabricDescription: '', FabricContent: '',
  Construction: '', Gsm: '', WeightOz: '', Comments: '',
};

const StylesPage: React.FC = () => {
  const [items, setItems] = useState<Style[]>([]);
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
    try {
      const res = await stylesApi.getAll();
      setItems((res.data ?? []).map(mapStyle));
      setError('');
    } catch (err: any) { setError(err.response?.data || 'Error cargando.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Precarga el formulario de creación cuando se llega desde otro módulo
  // (ej. FGPO → "+ Agregar nuevo Style \"B4004\"") => /admin/styles?value=B4004
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const value = searchParams.get('value');
    if (!value) return;
    setEditingId(null);
    setForm({ ...emptyForm, StyleCode: value });
    setFormError('');
    setDialogOpen(true);
    // Limpia el parámetro para no reabrir el diálogo al recargar
    const next = new URLSearchParams(searchParams);
    next.delete('value');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = items.filter(i =>
    !search || i.styleCode.toLowerCase().includes(search.toLowerCase()) ||
    (i.description ?? '').toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        Gsm: form.Gsm === '' ? null : Number(form.Gsm),
        WeightOz: form.WeightOz === '' ? null : Number(form.WeightOz),
      };
      if (editingId) await stylesApi.update(editingId, payload);
      else await stylesApi.create(payload);
      setDialogOpen(false);
      await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este Style?')) return;
    try { await stylesApi.delete(id); await load(); }
    catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  };
  const calculateWeight = (gsm: string) => {
    if (!gsm || isNaN(Number(gsm))) return '';
    const weight = Number(gsm) * 0.0295;
    return weight.toFixed(2);
  };

  const openEdit = (s: Style) => {
    setEditingId(s.id);
    setForm({
      StyleCode: s.styleCode, Description: s.description ?? '', FabricDescription: s.fabricDescription ?? '',
      FabricContent: s.fabricContent ?? '', Construction: s.construction ?? '',
      Gsm: s.gsm?.toString() ?? '', WeightOz: s.weightOz?.toString() ?? '', Comments: s.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <CheckroomIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Styles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Catálogo de estilos (Master Data)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Style</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Buscar por Style o descripción..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Style', 'Description', 'Fabric Description', 'Fabric Content', 'Construction', 'GSM', 'Weight (oz/yd²)', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No styles found</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{s.styleCode}</TableCell>
                  <TableCell>{s.description || '-'}</TableCell>
                  <TableCell>{s.fabricDescription || '-'}</TableCell>
                  <TableCell>{s.fabricContent || '-'}</TableCell>
                  <TableCell>{s.construction || '-'}</TableCell>
                  <TableCell>{s.gsm ?? '-'}</TableCell>
                  <TableCell>{s.weightOz ?? '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar"><IconButton size="small" color="info" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Style' : 'New Style'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth size="small" label="Style Code *" value={form.StyleCode} onChange={e => setForm({ ...form, StyleCode: e.target.value })} required />
              <TextField fullWidth size="small" label="Description" value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })} />
              <TextField fullWidth size="small" label="Fabric Description" value={form.FabricDescription} onChange={e => setForm({ ...form, FabricDescription: e.target.value })} />
              <TextField fullWidth size="small" label="Fabric Content" value={form.FabricContent} onChange={e => setForm({ ...form, FabricContent: e.target.value })} />
              <TextField fullWidth size="small" label="Construction" value={form.Construction} onChange={e => setForm({ ...form, Construction: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="GSM"
                  type="number"
                  value={form.Gsm}
                  onChange={e => {
                    const newGsm = e.target.value;
                    setForm({
                      ...form,
                      Gsm: newGsm,
                      WeightOz: calculateWeight(newGsm)
                    });
                  }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Weight (oz/yd²)"
                  type="number"
                  value={form.WeightOz}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="Auto-calculated from GSM × 0.0295"
                />
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

export default StylesPage;
