import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, TextField, CircularProgress, Alert, InputAdornment
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { fgpoApi } from '../../utils/api';

interface FgpoRow {
  ID: number;
  FGPONumber: string;
  CustomerName: string;
  Style?: string;
  Color?: string;
  OrderQuantity: number;
  DeliveryDate: string;
  Status?: string;
  PendingProduction: number;
}

const sc = (s: string) => {
  const m: Record<string, any> = {
    Completed: 'success', Approved: 'success', 'In Progress': 'info', 'Partially Completed': 'primary',
    Pending: 'warning', 'On Hold': 'warning', Cancelled: 'error', Rejected: 'error', 'FGPO Pending': 'warning',
  };
  return m[s] ?? 'default';
};

const Production: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<FgpoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = async (term = '') => {
    setLoading(true); setError('');
    try {
      const res = await fgpoApi.getPaged({ page: 1, pageSize: 50, search: term || undefined });
      setItems((res.data.items ?? []).map((f: any) => ({
        ID: f.id ?? f.ID,
        FGPONumber: f.fgpoNumber ?? f.FGPONumber ?? '',
        CustomerName: f.customerName ?? f.CustomerName ?? '',
        Style: f.style ?? f.Style ?? '',
        Color: f.color ?? f.Color ?? '',
        OrderQuantity: f.orderQuantity ?? f.OrderQuantity ?? 0,
        DeliveryDate: f.deliveryDate ?? f.DeliveryDate ?? '',
        Status: f.status ?? f.Status ?? '',
        PendingProduction: f.pendingProduction ?? f.PendingProduction ?? 0,
      })));
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to load production orders.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); load(searchInput); };
  const handleClear = () => { setSearchInput(''); load(''); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <FactoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            Production / Customer Orders
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Customer production orders (FGPO) — real system data
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/fgpo')}>Create FGPO</Button>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small" placeholder="Search by FGPO, Customer, Style..."
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
          sx={{ flex: 1, maxWidth: 420 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
        />
        <Button type="submit" variant="contained" color="primary">Search</Button>
        <Button variant="outlined" color="inherit" onClick={handleClear}><ClearIcon /></Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>FGPO #</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Style / Color</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Order Qty</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Pending Production</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={28} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>No orders found.</TableCell></TableRow>
              ) : items.map(po => (
                <TableRow key={po.ID} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{po.FGPONumber}</TableCell>
                  <TableCell>{po.CustomerName}</TableCell>
                  <TableCell>{po.Style || '-'} / {po.Color || '-'}</TableCell>
                  <TableCell>{po.OrderQuantity}</TableCell>
                  <TableCell>{po.DeliveryDate ? po.DeliveryDate.slice(0, 10) : '-'}</TableCell>
                  <TableCell>{po.PendingProduction}</TableCell>
                  <TableCell><Chip label={po.Status || 'N/A'} size="small" color={sc(po.Status ?? '')} variant="outlined" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Production;
