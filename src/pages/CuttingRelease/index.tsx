import React, { useEffect, useState, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem,
  FormControl, InputLabel, TablePagination, Grid, Select, Divider
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCuttingReleases } from '../../hooks/cuttingReleases/useCuttingReleases';
import { useFgpoOptions } from '../../hooks/fgpos/useFgpoOptions';
import { fgpoLinesApi, stylesApi } from '../../utils/api';
import { CuttingRelease } from '../../types';
import { blockNegativeKey, firstNegativeField, nonNegativeInputProps } from '../../utils/validation';

const getWeek = (date: string) => {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return 0;
  const start = new Date(value.getFullYear(), 0, 1);
  return Math.ceil((((value.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
};

const emptyForm = {
  CutDate: new Date().toISOString().split('T')[0], Section: '', Group: 1, Layers: 0,
  BodyBySize: {} as Record<string, number>,
  Rolls: 0, YdsPackingList: 0, FDamage: 0, Overlaps: 0, MarkerLength: 0,
  Width: 0, Efficiency: 0,
  ReleaseDate: new Date().toISOString().split('T')[0],
  FGPOId: 0, FabricLot: '',
  Comments: '',
};

const CuttingReleasePage: React.FC = () => {
  const {
    items, loading, saving, error, page, rowsPerPage, totalCount,
    setPage, setRowsPerPage, setSearchQuery, setError, refresh,
    create, update, remove,
  } = useCuttingReleases();

  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<CuttingRelease | null>(null);
  const [formError, setFormError] = useState('');
  const [sizeCodes, setSizeCodes] = useState<string[]>([]);
  const [styleCode, setStyleCode] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [fabricDescription, setFabricDescription] = useState('');

  const { options: fgpoList } = useFgpoOptions();

  const [form, setForm] = useState(emptyForm);

  const piecesBySize = Object.fromEntries(sizeCodes.map(size => [size, (form.BodyBySize[size] || 0) * form.Layers]));
  const total = Object.values(piecesBySize).reduce((sum, value) => sum + value, 0);
  const pcsPerMarker = Object.values(form.BodyBySize).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const physicalYards = (form.MarkerLength + 0.055) * form.Layers;
  const short = physicalYards - form.YdsPackingList + form.FDamage + form.Overlaps;
  const percentShort = form.YdsPackingList ? short / form.YdsPackingList : 0;
  const percentDamage = physicalYards ? form.FDamage / physicalYards : 0;
  const totalYds = form.MarkerLength * form.Layers;
  const markerYield = pcsPerMarker ? form.MarkerLength / pcsPerMarker : 0;
  const realYield = total ? physicalYards / total : 0;

  useEffect(() => {
    if (!form.FGPOId) { setSizeCodes([]); setStyleCode(''); setColorCode(''); setFabricDescription(''); return; }
    Promise.all([fgpoLinesApi.getByFgpo(form.FGPOId), stylesApi.getAll()]).then(([linesResponse, stylesResponse]) => {
      const lines = linesResponse.data ?? [];
      const firstLine = lines.find((line: any) => (line.active ?? line.Active) !== false) ?? lines[0];
      const st = (firstLine?.styleCode ?? firstLine?.StyleCode ?? '').toString();
      const col = (firstLine?.colorName ?? firstLine?.ColorName ?? '').toString();
      setStyleCode(st);
      setColorCode(col);
      const sizeList: string[] = lines
        .map((line: any) => line.sizeCode ?? line.SizeCode)
        .filter((c: any): c is string => typeof c === 'string' && c.length > 0);
      setSizeCodes([...new Set(sizeList)]);
      const style = (stylesResponse.data ?? []).find((item: any) => (item.styleCode ?? item.StyleCode) === st);
      setFabricDescription(style?.fabricDescription ?? style?.FabricDescription ?? '');
    }).catch(() => { setSizeCodes([]); setStyleCode(''); setColorCode(''); setFabricDescription(''); });
  }, [form.FGPOId]);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setSearchQuery(searchInput); };
  const handleClearSearch = () => setSearchInput('');

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { setEditingId(null); resetForm(); setFormError(''); setDialogOpen(true); };
  const openEdit = (item: CuttingRelease) => {
    setEditingId(item.id);
    setForm({
      CutDate: item.cutDate?.split('T')[0] || item.releaseDate?.split('T')[0] || '', Section: item.section || '', Group: item.group || 1,
      Layers: item.layers || 0, BodyBySize: item.bodyBySize || {}, Rolls: item.rolls || 0,
      YdsPackingList: item.ydsPackingList || 0, FDamage: item.fDamage || 0, Overlaps: item.overlaps || 0,
      MarkerLength: item.markerLength || 0, Width: item.width || 0, Efficiency: item.efficiency || 0,
      ReleaseDate: item.releaseDate?.split('T')[0] || '',
      FGPOId: item.fgpoId, FabricLot: item.fabricLot ?? '',
      Comments: item.comments ?? '',
    });
    setFormError(''); setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this release?')) return;
    try { await remove(id); }
    catch (err: any) { setError(err.response?.data || 'Error deleting.'); }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.FGPOId) { setFormError('FGPO is required.'); return; }
    if (!form.CutDate || !form.Section || form.Layers <= 0) { setFormError('Cut date, section and layers are required.'); return; }
    const negField = firstNegativeField([
      { name: 'Group', value: form.Group },
      { name: 'Rolls', value: form.Rolls },
      { name: 'Yds Packing List', value: form.YdsPackingList },
      { name: 'F. Damage', value: form.FDamage },
      { name: 'Overlaps', value: form.Overlaps },
      { name: 'Marker Length', value: form.MarkerLength },
      { name: 'Width', value: form.Width },
      { name: 'Efficiency', value: form.Efficiency },
    ]);
    if (negField) { setFormError(`${negField} no puede ser negativo.`); return; }
    try {
      const payload = {
        ...form,
        Week: getWeek(form.CutDate), FabricDescription: fabricDescription,
        PiecesBySize: piecesBySize, Total: total, PhysicalYards: physicalYards,
        Short: short, PercentShort: percentShort, PercentDamage: percentDamage,
        PcsPerMarker: pcsPerMarker, TotalYds: totalYds, MarkerYield: markerYield, RealYield: realYield,
        ReleaseDate: form.ReleaseDate ? new Date(form.ReleaseDate).toISOString() : new Date().toISOString(),
      };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setDialogOpen(false);
    } catch (err: any) { setFormError(err.response?.data || 'Error saving.'); }
  };

  const fmt = (v?: string) => v?.split('T')[0] || '-';
  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <ContentCutIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Cutting Release
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Producción del tendido — corte por lote con tallas y rendimientos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Release</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by Release #, FGPO, Fabric Lot, Section..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment> : null,
              },
            }}
            sx={{ flex: 1, maxWidth: 500 }}
          />
          <Button variant="outlined" type="submit">Search</Button>
        </Box>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['Cut Date', 'Week', 'Section', 'Group', 'Order', 'Style', 'Fabric', 'Color', 'Fabric Lot', 'Layers', 'Total', 'Rolls', 'Yds Packing', 'Physical Yds', 'Short', '% Short', 'F. Damage', 'Overlaps', 'PCS / Marker', 'Total Yds', 'Marker Length', 'Marker Yield', 'Real Yield', 'Width', 'Effi', 'Actions'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={26} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={26} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No releases found</Typography>
                  <Button variant="text" onClick={openCreate} sx={{ mt: 1 }}>Create your first release</Button>
                </TableCell></TableRow>
              ) : items.map((item: CuttingRelease) => (
                <TableRow key={item.id} hover>
                  <TableCell>{fmt(item.cutDate)}</TableCell>
                  <TableCell>{item.week || getWeek(item.cutDate)}</TableCell>
                  <TableCell>{item.section || '-'}</TableCell>
                  <TableCell>{item.group}</TableCell>
                  <TableCell>{item.fgpoNumber}</TableCell>
                  <TableCell>{item.style || '-'}</TableCell>
                  <TableCell>{item.fabricDescription || '-'}</TableCell>
                  <TableCell>{item.color || '-'}</TableCell>
                  <TableCell>{item.fabricLot || '-'}</TableCell>
                  <TableCell>{item.layers}</TableCell>
                  <TableCell>{item.total}</TableCell>
                  <TableCell>{item.rolls}</TableCell>
                  <TableCell>{item.ydsPackingList}</TableCell>
                  <TableCell>{item.physicalYards.toFixed(3)}</TableCell>
                  <TableCell>{item.short.toFixed(3)}</TableCell>
                  <TableCell>{(item.percentShort * 100).toFixed(2)}%</TableCell>
                  <TableCell>{item.fDamage}</TableCell>
                  <TableCell>{item.overlaps}</TableCell>
                  <TableCell>{item.pcsPerMarker}</TableCell>
                  <TableCell>{item.totalYds.toFixed(3)}</TableCell>
                  <TableCell>{item.markerLength}</TableCell>
                  <TableCell>{item.markerYield.toFixed(3)}</TableCell>
                  <TableCell>{item.realYield.toFixed(3)}</TableCell>
                  <TableCell>{item.width}</TableCell>
                  <TableCell>{item.efficiency}%</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => { setViewItem(item); setViewOpen(true); }}><VisibilityIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={totalCount} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Rows:" />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
          {editingId ? 'Edit Release' : 'New Release'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>Referencias</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>FGPO *</InputLabel>
                <Select value={form.FGPOId || ''} label="FGPO *" onChange={e => setF('FGPOId', Number(e.target.value))}>
                  <MenuItem value=""><em>Select a FGPO...</em></MenuItem>
                  {fgpoList.map((f: any) => <MenuItem key={f.id ?? f.ID} value={f.id ?? f.ID}>{f.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Style" value={styleCode} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Color" value={colorCode} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Fabric Description" value={fabricDescription} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Release Date *" type="date" value={form.ReleaseDate} onChange={e => setF('ReleaseDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><TextField fullWidth size="small" label="Fabric Lot" value={form.FabricLot} onChange={e => setF('FabricLot', e.target.value)} /></Grid>
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" color="text.secondary">Producción del tendido</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth required size="small" label="Cut Date" type="date" value={form.CutDate} onChange={e => setF('CutDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Week" value={getWeek(form.CutDate) || ''} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth required size="small" label="Section" value={form.Section} onChange={e => setF('Section', e.target.value)} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Group" type="number" value={form.Group} onChange={e => setF('Group', Number(e.target.value))} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 3 }}><TextField fullWidth required size="small" label="Layers" type="number" value={form.Layers || ''} onChange={e => setF('Layers', Number(e.target.value))} /></Grid>
            {sizeCodes.map(size => <Grid size={{ xs: 6, sm: 4, md: 2 }} key={size}><TextField fullWidth size="small" label={`${size} body`} type="number" value={form.BodyBySize[size] || ''} onChange={e => setF('BodyBySize', { ...form.BodyBySize, [size]: Number(e.target.value) })} /></Grid>)}
            {sizeCodes.map(size => <Grid size={{ xs: 6, sm: 4, md: 2 }} key={`pieces-${size}`}><TextField fullWidth size="small" label={`${size} pieces`} value={piecesBySize[size] || ''} slotProps={{ input: { readOnly: true } }} /></Grid>)}
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Total" value={total || ''} slotProps={{ input: { readOnly: true } }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Rolls" type="number" value={form.Rolls || ''} onChange={e => setF('Rolls', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Yds Packing List" type="number" value={form.YdsPackingList || ''} onChange={e => setF('YdsPackingList', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Marker Length" type="number" value={form.MarkerLength || ''} onChange={e => setF('MarkerLength', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="F. Damage" type="number" value={form.FDamage || ''} onChange={e => setF('FDamage', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Overlaps" type="number" value={form.Overlaps || ''} onChange={e => setF('Overlaps', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Width" type="number" value={form.Width || ''} onChange={e => setF('Width', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}><TextField fullWidth size="small" label="Effi" type="number" value={form.Efficiency || ''} onChange={e => setF('Efficiency', Number(e.target.value))} onKeyDown={e => blockNegativeKey(e)} slotProps={{ htmlInput: nonNegativeInputProps }} /></Grid>
            {[
              ['Physical Yards', physicalYards], ['Short', short], ['% Short', percentShort], ['% Damage', percentDamage],
              ['PCS / Marker', pcsPerMarker], ['Total Yds', totalYds], ['Marker Yield', markerYield], ['Real Yield', realYield],
            ].map(([label, value]) => <Grid size={{ xs: 6, sm: 3, md: 2 }} key={label as string}><TextField fullWidth size="small" label={label as string} value={Number(value).toFixed(3)} slotProps={{ input: { readOnly: true } }} /></Grid>)}
            <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Comments" value={form.Comments} onChange={e => setF('Comments', e.target.value)} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : null}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Release Detail</DialogTitle><Divider />
        <DialogContent sx={{ pt: 3 }}>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Release Number</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.releaseNumber}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">FGPO</Typography><Typography sx={{ fontWeight: 600 }}>{viewItem.fgpoNumber} ({viewItem.customerName})</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Style / Color</Typography><Typography>{viewItem.style || '-'} / {viewItem.color || '-'}</Typography></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption" color="text.secondary">Fabric Description</Typography><Typography>{viewItem.fabricDescription || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Cut Date</Typography><Typography>{fmt(viewItem.cutDate)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Section / Group</Typography><Typography>{viewItem.section || '-'} / {viewItem.group}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Fabric Lot</Typography><Typography>{viewItem.fabricLot || '-'}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Layers</Typography><Typography>{viewItem.layers}</Typography></Grid>
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Total</Typography><Typography>{viewItem.total}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Rolls</Typography><Typography>{viewItem.rolls}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Yds Packing List</Typography><Typography>{viewItem.ydsPackingList}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Physical Yards</Typography><Typography>{viewItem.physicalYards.toFixed(3)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Short</Typography><Typography>{viewItem.short.toFixed(3)}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Marker Length</Typography><Typography>{viewItem.markerLength}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Width</Typography><Typography>{viewItem.width}</Typography></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" color="text.secondary">Effi</Typography><Typography>{viewItem.efficiency}%</Typography></Grid>
              {viewItem.comments && <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /><Typography variant="caption" color="text.secondary">Comments</Typography><Typography>{viewItem.comments}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default CuttingReleasePage;
