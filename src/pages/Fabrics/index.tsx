import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, Tooltip,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import FabricIcon from '@mui/icons-material/FiberSmartRecord';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fabricsApi, fgpoApi, stylesApi } from '../../utils/api';
import { Fabric } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const mapFabric = (raw: any): Fabric => ({
  id: raw.id ?? raw.ID ?? 0,
  fabricReference: raw.fabricReference ?? raw.FabricReference ?? '',
  fabricName: raw.fabricName ?? raw.FabricName ?? '',
  color: raw.color ?? raw.Color ?? '',
  content: raw.content ?? raw.Content ?? '',
  construction: raw.construction ?? raw.Construction ?? '',
  threadTitle: raw.threadTitle ?? raw.ThreadTitle ?? '',
  threadQuality: raw.threadQuality ?? raw.ThreadQuality ?? '',
  gsm: raw.gsm ?? raw.Gsm,
  weightOz: raw.weightOz ?? raw.WeightOz,
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const emptyForm = {
  FabricReference: '', FabricName: '', Color: '', Content: '', Construction: '', ThreadTitle: '', ThreadQuality: '', Gsm: '', WeightOz: '', Comments: '',
};

interface FgpoLookupOption {
  id: number;
  label: string;
  style?: string;
  color?: string;
}

interface StyleLookup {
  styleCode: string;
  fabricDescription?: string;
  fabricContent?: string;
  construction?: string;
  gsm?: number;
  weightOz?: number;
}

const pick = (o: any, camel: string, pascal: string) => o?.[camel] ?? o?.[pascal];
const calcWeight = (gsm: any) => {
  if (gsm === undefined || gsm === null || isNaN(Number(gsm))) return '';
  return (Number(gsm) * 0.0295).toFixed(2);
};

const FabricsPage: React.FC = () => {
  const [items, setItems] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Autocompletar desde FGPO Master + Style catalog ────────────────
  const [fgpoOptions, setFgpoOptions] = useState<FgpoLookupOption[]>([]);
  const [styleOptions, setStyleOptions] = useState<StyleLookup[]>([]);
  const [autoFgpoId, setAutoFgpoId] = useState(0);

  const loadCatalog = async () => {
    try {
      const [fgpoRes, stylesRes] = await Promise.all([fgpoApi.getAll(), stylesApi.getAll()]);
      setFgpoOptions((fgpoRes.data ?? []).map((f: any) => ({
        id: pick(f, 'id', 'ID') ?? 0,
        label: pick(f, 'fgpoNumber', 'FGPONumber') ?? '',
        style: pick(f, 'style', 'Style') ?? '',
        color: pick(f, 'color', 'Color') ?? '',
      })).filter((f: FgpoLookupOption) => f.id));
      setStyleOptions((stylesRes.data ?? []).map((s: any) => ({
        styleCode: pick(s, 'styleCode', 'StyleCode') ?? '',
        fabricDescription: pick(s, 'fabricDescription', 'FabricDescription') ?? '',
        fabricContent: pick(s, 'fabricContent', 'FabricContent') ?? '',
        construction: pick(s, 'construction', 'Construction') ?? '',
        gsm: pick(s, 'gsm', 'Gsm') ?? undefined,
        weightOz: pick(s, 'weightOz', 'WeightOz') ?? undefined,
      })));
    } catch { /* catálogo opcional */ }
  };

  const applyFgpoAutofill = (fgpoId: number) => {
    const fgpo = fgpoOptions.find((o) => o.id === fgpoId);
    if (!fgpo) return;
    // El FGPO Master guarda el Style como código de estilo: búscalo en Styles
    const styleCode = (fgpo.style ?? '').trim();
    const style = styleOptions.find((s) => s.styleCode.trim().toLowerCase() === styleCode.toLowerCase())
      ?? styleOptions.find((s) => s.styleCode.trim().toLowerCase().includes(styleCode.toLowerCase()));
    const gsm = style?.gsm;
    const weightOz = style?.weightOz ?? (gsm !== undefined && gsm !== null ? calcWeight(gsm) : '');
    setForm((prev) => ({
      ...prev,
      FabricReference: fgpo.label || prev.FabricReference,
      FabricName: style?.fabricDescription || prev.FabricName,
      Color: fgpo.color || prev.Color,
      Content: style?.fabricContent ?? prev.Content,
      Construction: style?.construction ?? prev.Construction,
      Gsm: gsm !== undefined && gsm !== null ? String(gsm) : prev.Gsm,
      WeightOz: weightOz !== undefined && weightOz !== null ? String(weightOz) : prev.WeightOz,
    }));
  };

  const load = async () => {
    setLoading(true);
    try { const res = await fabricsApi.getAll(); setItems((res.data ?? []).map(mapFabric)); setError(''); }
    catch (err: any) { setError(err.response?.data || 'Error cargando.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); loadCatalog(); }, []);

  const filtered = items.filter(i =>
    !search || i.fabricName.toLowerCase().includes(search.toLowerCase()) ||
    (i.color ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.fabricReference ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.threadTitle ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.threadQuality ?? '').toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const negField = firstNegativeField([
      { name: 'GSM', value: form.Gsm },
      { name: 'Weight', value: form.WeightOz },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    setFormError(''); setSaving(true);
    try {
      const payload = { ...form, Gsm: form.Gsm === '' ? null : Number(form.Gsm), WeightOz: form.WeightOz === '' ? null : Number(form.WeightOz) };
      if (editingId) await fabricsApi.update(editingId, payload); else await fabricsApi.create(payload);
      setDialogOpen(false); await load();
    } catch (err: any) { setFormError(err.response?.data || 'Error guardando.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este Fabric?')) return;
    try { await fabricsApi.delete(id); await load(); } catch (err: any) { setError(err.response?.data || 'Error eliminando.'); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setAutoFgpoId(0); setFormError(''); setDialogOpen(true); };
  const openEdit = (f: Fabric) => {
    setEditingId(f.id);
    setAutoFgpoId(0);
    setForm({ FabricReference: f.fabricReference ?? '', FabricName: f.fabricName, Color: f.color ?? '', Content: f.content ?? '', Construction: f.construction ?? '', ThreadTitle: f.threadTitle ?? '', ThreadQuality: f.threadQuality ?? '', Gsm: f.gsm?.toString() ?? '', WeightOz: f.weightOz?.toString() ?? '', Comments: f.comments ?? '' });
    setFormError(''); setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <FabricIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Fabrics
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Tela — referencia, contenido y construcción (Master Data)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Fabric</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField size="small" placeholder="Buscar por nombre, color o referencia..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon /></IconButton></InputAdornment> : null } }}
          sx={{ maxWidth: 400 }} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Reference', 'Fabric', 'Color', 'Content', 'Construction', 'Thread Title', 'Thread Quality', 'GSM', 'Weight (oz/yd²)', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>No fabrics found</TableCell></TableRow>
              ) : filtered.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell>{f.fabricReference || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{f.fabricName}</TableCell>
                  <TableCell>{f.color || '-'}</TableCell>
                  <TableCell>{f.content || '-'}</TableCell>
                  <TableCell>{f.construction || '-'}</TableCell>
                  <TableCell>{f.threadTitle || '-'}</TableCell>
                  <TableCell>{f.threadQuality || '-'}</TableCell>
                  <TableCell>{f.gsm ?? '-'}</TableCell>
                  <TableCell>{f.weightOz ?? '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar"><IconButton size="small" color="info" onClick={() => openEdit(f)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(f.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editingId ? 'Edit Fabric' : 'New Fabric'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {editingId ? (
                <TextField fullWidth size="small" label="Fabric Reference" value={form.FabricReference} onChange={e => setForm({ ...form, FabricReference: e.target.value })} />
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel>Fabric Reference</InputLabel>
                  <Select
                    value={autoFgpoId || ''}
                    label="Fabric Reference"
                    onChange={e => { const v = Number(e.target.value); setAutoFgpoId(v); applyFgpoAutofill(v); }}
                  >
                    <MenuItem value=""><em>Selecciona un FGPO...</em></MenuItem>
                    {fgpoOptions.map(fg => (
                      <MenuItem key={fg.id} value={fg.id}>
                        {fg.label}{fg.style ? ` — Style: ${fg.style}` : ''}{fg.color ? ` / ${fg.color}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField fullWidth size="small" label="Fabric Name *" value={form.FabricName} slotProps={{ input: { readOnly: !editingId && autoFgpoId > 0 } }} onChange={e => setForm({ ...form, FabricName: e.target.value })} required />
              <TextField fullWidth size="small" label="Color" value={form.Color} slotProps={{ input: { readOnly: !editingId && autoFgpoId > 0 } }} onChange={e => setForm({ ...form, Color: e.target.value })} />
              <TextField fullWidth size="small" label="Content" value={form.Content} slotProps={{ input: { readOnly: !editingId && autoFgpoId > 0 } }} onChange={e => setForm({ ...form, Content: e.target.value })} />
              <TextField fullWidth size="small" label="Construction" value={form.Construction} slotProps={{ input: { readOnly: !editingId && autoFgpoId > 0 } }} onChange={e => setForm({ ...form, Construction: e.target.value })} />
              <TextField fullWidth size="small" label="Thread Title" value={form.ThreadTitle} onChange={e => setForm({ ...form, ThreadTitle: e.target.value })} />
              <TextField fullWidth size="small" label="Thread Quality" value={form.ThreadQuality} onChange={e => setForm({ ...form, ThreadQuality: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth size="small" label="GSM" type="number" value={form.Gsm} slotProps={{ input: { readOnly: !editingId && autoFgpoId > 0 }, htmlInput: nonNegativeInputProps }} onKeyDown={e => blockNegativeKey(e)} onChange={e => setForm({ ...form, Gsm: e.target.value })} />
                <TextField fullWidth size="small" label="Weight (oz/yd²)" type="number" value={form.WeightOz} slotProps={{ input: { readOnly: !editingId && autoFgpoId > 0 }, htmlInput: nonNegativeInputProps }} onKeyDown={e => blockNegativeKey(e)} onChange={e => setForm({ ...form, WeightOz: e.target.value })} />
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

export default FabricsPage;
