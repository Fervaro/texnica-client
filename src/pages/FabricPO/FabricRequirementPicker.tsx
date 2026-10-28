import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, Switch
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fabricPOsApi } from '../../utils/api';
import type { FabricRequirementAvailability } from '../../types/fabricPO';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (items: FabricRequirementAvailability[], allowOverPurchase: boolean) => void;
  /** Al EDITAR una PO: excluye sus propias líneas del cálculo de Remaining. */
  excludeFabricPOId?: number | null;
  /** FabricRequirements ya agregados al formulario (no se pueden repetir). */
  alreadyAddedIds: number[];
}

const fmtQty = (value: number | undefined | null) =>
  value === undefined || value === null
    ? '-'
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (value: number | undefined | null) =>
  value === undefined || value === null ? '-' : value.toLocaleString();

const FabricRequirementPicker: React.FC<Props> = ({
  open, onClose, onAdd, excludeFabricPOId, alreadyAddedIds,
}) => {
  const [items, setItems] = useState<FabricRequirementAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [onlyWithRemaining, setOnlyWithRemaining] = useState(true);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const addedSet = useMemo(() => new Set(alreadyAddedIds), [alreadyAddedIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fabricPOsApi.getAvailableRequirements({
        search: search || undefined,
        onlyWithRemaining,
        excludeFabricPOId: excludeFabricPOId ?? undefined,
      });
      setItems(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || 'No fue posible cargar los Fabric Requirements disponibles.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, onlyWithRemaining, excludeFabricPOId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setSearchInput('');
      setSearch('');
      setSelected({});
      setOnlyWithRemaining(true);
      setError('');
    }
  }, [open]);

  // Búsqueda con retardo para no disparar una petición por tecla
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const selectableIds = useMemo(
    () => items.filter(i => !addedSet.has(i.fabricRequirementId)).map(i => i.fabricRequirementId),
    [items, addedSet],
  );

  const selectedIds = useMemo(
    () => selectableIds.filter(id => selected[id]),
    [selectableIds, selected],
  );

  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<number, boolean> = {};
      selectableIds.forEach(id => { next[id] = true; });
      setSelected(next);
    }
  };

  const toggleOne = (id: number) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAdd = () => {
    const chosen = items.filter(i => selected[i.fabricRequirementId]);
    if (chosen.length === 0) return;
    onAdd(chosen, !onlyWithRemaining);
    setSelected({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Select Fabric Requirements
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <TextField
            label="Search"
            size="small"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="FGPO, Style, Color, Component..."
            sx={{ flexGrow: 1, minWidth: 260 }}
            slotProps={{
              input: {
                startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchInput('')}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />

          <FormControlLabel
            control={<Switch checked={onlyWithRemaining} onChange={e => setOnlyWithRemaining(e.target.checked)} />}
            label="Only with remaining"
          />

          <Tooltip title="Refresh availability">
            <span>
              <IconButton onClick={() => void load()} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <TableContainer sx={{ maxHeight: 460 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ fontWeight: 'bold' }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedIds.length > 0 && !allSelected}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0}
                  />
                </TableCell>
                {['FGPO', 'Style', 'Color', 'Component', 'UOM',
                  'Required', 'Already Ordered', 'Remaining'].map(h => (
                  <TableCell
                    key={h}
                    align={['Required', 'Already Ordered', 'Remaining'].includes(h) ? 'right' : 'left'}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => {
                const added = addedSet.has(item.fabricRequirementId);
                return (
                  <TableRow key={item.fabricRequirementId} hover sx={added ? { opacity: 0.5 } : undefined}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={!!selected[item.fabricRequirementId]}
                        onChange={() => toggleOne(item.fabricRequirementId)}
                        disabled={added}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{item.fgpoNumber}</TableCell>
                    <TableCell>{item.style || '-'}</TableCell>
                    <TableCell>{item.color || '-'}</TableCell>
                    <TableCell>{item.componentCode || '-'}</TableCell>
                    <TableCell>{item.uom || '-'}</TableCell>
                    <TableCell align="right">{fmtQty(item.requiredToPurchase)}</TableCell>
                    <TableCell align="right">{fmtQty(item.alreadyOrdered)}</TableCell>
                    <TableCell align="right">
                      {added ? (
                        <Chip size="small" variant="outlined" label="Ya agregada" />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          color={item.remainingToPurchase > 0 ? 'success' : 'default'}
                          label={fmtQty(item.remainingToPurchase)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              )}

              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay Fabric Requirements pendientes con los filtros actuales.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {fmtInt(items.length)} requirement(s) listado(s) · {fmtInt(selectedIds.length)} seleccionado(s)
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd} disabled={selectedIds.length === 0}>
          Add Selected ({selectedIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FabricRequirementPicker;
