import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, InputAdornment,
  CircularProgress, Alert, Chip
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { fabricShipmentsApi, fabricInventoriesApi, fabricReceivingsApi } from '../../utils/api';
import ModuleTotalsBar from '../../components/ModuleTotalsBar';
import { FabricControlTela } from '../../types';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
const fmtNum = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtDate = (v?: string) => v?.split('T')[0] || '-';

const statusColor = (s: string) => {
  const m: Record<string, any> = {
    'Fully Received': 'success',
    'Partially Received': 'warning',
    'Pending': 'info',
    'In Transit': 'primary',
  };
  return m[s] ?? 'default';
};

const FabricInventoryPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [rows, setRows] = useState<FabricControlTela[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [expandedFgpo, setExpandedFgpo] = useState<string | null>(null);

  const [shipTotals, setShipTotals] = useState({ shipped: 0, received: 0, pending: 0 });
  const [invTotals, setInvTotals] = useState({ physical: 0, inTransit: 0, reserved: 0, available: 0 });
  const [receivedTotal, setReceivedTotal] = useState(0);

  const loadReceivedTotal = async () => {
    try {
      const res = await fabricReceivingsApi.getTotals();
      const t = res.data ?? {};
      setReceivedTotal(num(t.receivedYards ?? t.ReceivedYards));
    } catch { /* silencioso */ }
  };

  const loadShipTotals = async () => {
    try {
      const res = await fabricShipmentsApi.getTotals();
      const t = res.data ?? {};
      setShipTotals({
        shipped: num(t.shippedYards ?? t.ShippedYards),
        received: num(t.receivedYards ?? t.ReceivedYards),
        pending: num(t.pendingYards ?? t.PendingYards),
      });
    } catch { /* silencioso */ }
  };

  const loadInventoryTotals = async () => {
    try {
      const res = await fabricInventoriesApi.getTotals();
      const t = res.data ?? {};
      setInvTotals({
        physical: num(t.physicalYards ?? t.PhysicalYards),
        inTransit: num(t.pendingTransitYards ?? t.PendingTransitYards),
        reserved: num(t.reservedYards ?? t.ReservedYards),
        available: num(t.availableYards ?? t.AvailableYards),
      });
    } catch { /* silencioso */ }
  };

  const loadRows = async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await fabricShipmentsApi.getControlTela();
      const list = (res.data ?? []) as any[];
      setRows(list.map((r: any) => ({
        fgpoNumber: r.fgpoNumber ?? r.FGPONumber ?? '',
        color: r.color ?? r.Color ?? '',
        family: r.family ?? r.Family ?? '',
        fabricDescription: r.fabricDescription ?? r.FabricDescription ?? '',
        shippedYards: num(r.shippedYards ?? r.ShippedYards),
        receivedYards: num(r.receivedYards ?? r.ReceivedYards),
        pendingYards: num(r.pendingYards ?? r.PendingYards),
        receivedRolls: num(r.receivedRolls ?? r.ReceivedRolls),
        status: r.status ?? r.Status ?? '',
        date: r.date ?? r.Date ?? '',
      })));
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || err?.message || 'Could not load fabric control.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadShipTotals(); loadInventoryTotals(); loadReceivedTotal(); loadRows(); }, []);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); };
  const handleClearSearch = () => setSearchInput('');

  const fgpoGroups = useMemo(() => {
    const groups = new Map<string, FabricControlTela[]>();
    rows.forEach(row => {
      const key = row.fgpoNumber || '(No FGPO)';
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return Array.from(groups.entries()).map(([key, details]) => {
      const descriptions = Array.from(new Set(details.map(row => row.fabricDescription?.trim()).filter(Boolean)));
      const statuses = Array.from(new Set(details.map(row => row.status?.trim()).filter(Boolean)));
      const dates = details.map(row => row.date).filter(Boolean).sort();
      const latestDate = dates[dates.length - 1] ?? '';
      return {
        key,
        fgpoNumber: details[0]?.fgpoNumber || '',
        details,
        description: descriptions.length === 1 ? descriptions[0]! : descriptions.length > 1 ? `${descriptions.length} fabric details` : '-',
        shippedYards: details.reduce((sum, row) => sum + row.shippedYards, 0),
        receivedYards: details.reduce((sum, row) => sum + row.receivedYards, 0),
        pendingYards: details.reduce((sum, row) => sum + row.pendingYards, 0),
        receivedRolls: details.reduce((sum, row) => sum + row.receivedRolls, 0),
        status: statuses.length === 1 ? statuses[0] : statuses.length > 1 ? 'Mixed' : '',
        date: latestDate,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return fgpoGroups;
    return fgpoGroups.filter(group =>
      group.fgpoNumber.toLowerCase().includes(q) ||
      group.details.some(row =>
        row.color?.toLowerCase().includes(q) ||
        row.family?.toLowerCase().includes(q) ||
        row.fabricDescription?.toLowerCase().includes(q) ||
        row.status?.toLowerCase().includes(q)
      )
    );
  }, [fgpoGroups, searchInput]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <Inventory2Icon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} /> Fabric Control
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Warehouse entries based on recorded fabric receipts</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadShipTotals(); loadInventoryTotals(); loadReceivedTotal(); loadRows(); }}>Refresh</Button>
        </Box>
      </Box>

      <ModuleTotalsBar
        suffix="yd"
        items={[
          { label: 'Yards In Transit', value: invTotals.inTransit.toLocaleString(), color: 'primary.main' },
          { label: 'Physical Inventory', value: receivedTotal.toLocaleString(), color: 'info.main' },
          { label: 'Reserved', value: invTotals.reserved.toLocaleString(), color: 'warning.main' },
          { label: 'Available', value: invTotals.available.toLocaleString(), color: 'success.main' },
          { label: 'Pending to record', value: shipTotals.pending.toLocaleString(), color: 'text.disabled' },
        ]}
      />

      <Paper sx={{ mb: 2, p: 1.5, display: 'flex', gap: 1 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <TextField size="small" placeholder="Search by FGPO, color, family, description..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment> : null } }}
            sx={{ flex: 1, maxWidth: 500 }} />
          <Button variant="outlined" type="submit">Search</Button>
        </Box>
      </Paper>

      {loadError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError('')}>{loadError}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                {['FGPO', 'Description', 'Shipped (yd)', 'Received (yd)', 'Pending (yd)', 'Rolls', 'Status', 'Date'].map(h =>
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 600, py: 1.5 }}>{h}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="body1">No fabric control records</Typography>
                </TableCell></TableRow>
              ) : filtered.map(group => (
                <React.Fragment key={group.key}>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Button
                        size="small"
                        onClick={() => setExpandedFgpo(expandedFgpo === group.key ? null : group.key)}
                        startIcon={expandedFgpo === group.key ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ fontWeight: 600, textTransform: 'none' }}
                      >
                        {group.fgpoNumber || '(No FGPO)'}
                      </Button>
                    </TableCell>
                    <TableCell>{group.description}</TableCell>
                    <TableCell>{fmtNum(group.shippedYards)}</TableCell>
                    <TableCell>{fmtNum(group.receivedYards)}</TableCell>
                    <TableCell><Typography sx={{ fontWeight: 600 }}>{fmtNum(group.pendingYards)}</Typography></TableCell>
                    <TableCell>{group.receivedRolls}</TableCell>
                    <TableCell><Chip label={group.status || 'N/A'} size="small" color={statusColor(group.status ?? '')} variant="outlined" /></TableCell>
                    <TableCell>{fmtDate(group.date)}</TableCell>
                  </TableRow>
                  {expandedFgpo === group.key && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ bgcolor: 'grey.50', p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Fabric details: {group.fgpoNumber || '(No FGPO)'}
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {['Color', 'Family', 'Description', 'Shipped (yd)', 'Received (yd)', 'Pending (yd)', 'Rolls', 'Status', 'Date'].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.details.map((detail, index) => (
                              <TableRow key={`${group.key}-${detail.date}-${detail.color}-${detail.family}-${index}`} hover>
                                <TableCell>{detail.color || '-'}</TableCell>
                                <TableCell>{detail.family || '-'}</TableCell>
                                <TableCell>{detail.fabricDescription || '-'}</TableCell>
                                <TableCell>{fmtNum(detail.shippedYards)}</TableCell>
                                <TableCell>{fmtNum(detail.receivedYards)}</TableCell>
                                <TableCell>{fmtNum(detail.pendingYards)}</TableCell>
                                <TableCell>{detail.receivedRolls}</TableCell>
                                <TableCell><Chip label={detail.status || 'N/A'} size="small" color={statusColor(detail.status ?? '')} variant="outlined" /></TableCell>
                                <TableCell>{fmtDate(detail.date)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default FabricInventoryPage;
