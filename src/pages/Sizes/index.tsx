import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, Tooltip
} from '@mui/material';
import StraightenIcon from '@mui/icons-material/Straighten';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { sizesApi } from '../../utils/api';
import { Size } from '../../types';

const mapSize = (raw: any): Size => ({
  id: raw.id ?? raw.ID ?? 0,
  sizeCode: raw.sizeCode ?? raw.SizeCode ?? '',
  description: raw.description ?? raw.Description ?? '',
  sortOrder: raw.sortOrder ?? raw.SortOrder ?? 0,
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = { SizeCode: '', Description: '', SortOrder: 0 };

const SizesPage: React.FC = () => {
  const [items, setItems] = useState<Size[]>([]);
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
    try { const res = await sizesApi.getAll(); setItems((res.data ?? []).map(mapSize)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error loading.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => !search || i.sizeCode.toLowerCase().includes(search.toLowerCase()) || (i.description ?? '').toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(''); setSaving(true);
    try {
      const payload = { ...form, SortOrder: Number(form.SortOrder) };
      if (editingId) await sizesApi.update(editingId, payload); else await sizesApi.create(payload);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this size?')) return;
    try { await sizesApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (s: Size) => { setEditingId(s.id); setForm({ SizeCode: s.sizeCode, Description: s.description ?? '', SortOrder: s.sortOrder }); setFormError(''); setDialogOpen(true); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <StraightenIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Sizes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Size catalog (Master Data)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Size</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Search size..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Code', 'Description', 'Sort Order', 'Actions'].map(h => <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No sizes found</TableCell></TableRow>
              ) : sorted.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{s.sizeCode}</TableCell>
                  <TableCell>{s.description || '-'}</TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit"><IconButton size="small" color="info" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Size' : 'New Size'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth size="small" label="Size Code * (XS, S, M, L, XL, 2X...)" value={form.SizeCode} onChange={e => setForm({ ...form, SizeCode: e.target.value })} required />
              <TextField fullWidth size="small" label="Description" value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })} />
              <TextField fullWidth size="small" label="Sort Order" type="number" value={form.SortOrder} onChange={e => setForm({ ...form, SortOrder: Number(e.target.value) })} />
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

export default SizesPage;
