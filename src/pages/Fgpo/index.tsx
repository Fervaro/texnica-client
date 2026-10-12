import React, { useState, useEffect, FormEvent, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem, Select,
  FormControl, InputLabel, TablePagination, Tooltip
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { fgpoApi, fgpoLinesApi, customersApi, pricesApi } from '../../utils/api';
import CatalogAutocomplete from '../../components/CatalogAutocomplete';
import { AuthContext } from '../../context/AuthContext';
import { getCurrentUserName } from '../../utils/session';
import { useStyleOptions } from '../../hooks/styles/useStyleOptions';
import { useColorOptions } from '../../hooks/colors/useColorOptions';
import { useSizeOptions } from '../../hooks/sizes/useSizeOptions';

interface Fgpo {
  ID: number;
  FGPONumber: string;
  TemporaryNumber?: string;
  Status?: string;
  CustomerId: number;
  CustomerName: string;
  Style?: string;
  Color?: string;
  OrderQuantity: number;
  DeliveryDate: string;
  InTransitQty: number;
  ReceivedQty: number;
  TotalShippedQty: number;
  ShipmentVariance: number;
  PendingToShip: number;
  OvershipmentQty: number;
  ProducedQty: number;
  ProductionVariance: number;
  PendingProduction: number;
  OverproductionQty: number;
  DataOwnerId?: number;
  DataOwnerName?: string;
  Remarks?: string;
  Active: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}

interface CustomerOption {
  ID: number;
  Name: string;
}

interface FgpoLine {
  id: number;
  fgpoId: number;
  styleId: number;
  styleCode: string;
  colorId: number;
  colorName: string;
  sizeId: number;
  sizeCode: string;
  quantity: number;
  unitPrice?: number;
  totalValue: number;
}

interface FgpoForm {
  FGPONumber: string;
  TemporaryNumber: string;
  Status: string;
  CustomerId: number;
  CustomerName: string;
  Style: string;
  Color: string;
  OrderQuantity: number;
  CreatedDate: string;
  DeliveryDate: string;
  InTransitQty: number;
  ReceivedQty: number;
  TotalShippedQty: number;
  ProducedQty: number;
  DataOwnerId: number;
  Remarks: string;
}

const emptyForm: FgpoForm = {
  FGPONumber: '',
  TemporaryNumber: '',
  Status: '',
  CustomerId: 0,
  CustomerName: '',
  Style: '',
  Color: '',
  OrderQuantity: 0,
  CreatedDate: '',
  DeliveryDate: '',
  InTransitQty: 0,
  ReceivedQty: 0,
  TotalShippedQty: 0,
  ProducedQty: 0,
  DataOwnerId: 0,
  Remarks: '',
};

const statusOptions = [
  'Not Started', 'Pending', 'In Progress', 'Partially Completed', 'Completed',
  'Approved', 'Conditionally Approved', 'Rejected', 'On Hold', 'Closed',
  'Cancelled', 'FGPO Pending'
];

// Map the API response (camelCase) to the PascalCase interface used by the UI
const mapFgpo = (raw: any): Fgpo => ({
  ID: raw.id ?? raw.ID,
  FGPONumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
  TemporaryNumber: raw.temporaryNumber ?? raw.TemporaryNumber,
  Status: raw.status ?? raw.Status,
  CustomerId: raw.customerId ?? raw.CustomerId ?? 0,
  CustomerName: raw.customerName ?? raw.CustomerName ?? '',
  Style: raw.style ?? raw.Style,
  Color: raw.color ?? raw.Color,
  OrderQuantity: raw.orderQuantity ?? raw.OrderQuantity ?? 0,
  DeliveryDate: raw.deliveryDate ?? raw.DeliveryDate ?? '',
  InTransitQty: raw.inTransitQty ?? raw.InTransitQty ?? 0,
  ReceivedQty: raw.receivedQty ?? raw.ReceivedQty ?? 0,
  TotalShippedQty: raw.totalShippedQty ?? raw.TotalShippedQty ?? 0,
  ShipmentVariance: raw.shipmentVariance ?? raw.ShipmentVariance ?? 0,
  PendingToShip: raw.pendingToShip ?? raw.PendingToShip ?? 0,
  OvershipmentQty: raw.overshipmentQty ?? raw.OvershipmentQty ?? 0,
  ProducedQty: raw.producedQty ?? raw.ProducedQty ?? 0,
  ProductionVariance: raw.productionVariance ?? raw.ProductionVariance ?? 0,
  PendingProduction: raw.pendingProduction ?? raw.PendingProduction ?? 0,
  OverproductionQty: raw.overproductionQty ?? raw.OverproductionQty ?? 0,
  DataOwnerId: raw.dataOwnerId ?? raw.DataOwnerId ?? undefined,
  DataOwnerName: raw.dataOwnerName ?? raw.DataOwnerName ?? raw.dataOwner ?? raw.DataOwner,
  Remarks: raw.remarks ?? raw.Remarks,
  Active: raw.active ?? raw.Active ?? true,
  CreatedAt: raw.createdAt ?? raw.CreatedAt ?? '',
  UpdatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const mapFgpoLine = (raw: any): FgpoLine => ({
  id: raw.id ?? raw.ID ?? 0,
  fgpoId: raw.fgpoId ?? raw.FgpoId ?? 0,
  styleId: raw.styleId ?? raw.StyleId ?? 0,
  styleCode: raw.styleCode ?? raw.StyleCode ?? '',
  colorId: raw.colorId ?? raw.ColorId ?? 0,
  colorName: raw.colorName ?? raw.ColorName ?? '',
  sizeId: raw.sizeId ?? raw.SizeId ?? 0,
  sizeCode: raw.sizeCode ?? raw.SizeCode ?? '',
  quantity: raw.quantity ?? raw.Quantity ?? 0,
  unitPrice: raw.unitPrice ?? raw.UnitPrice,
  totalValue: raw.totalValue ?? raw.TotalValue ?? 0,
});

const Fgpo: React.FC = () => {
  const { selectedCustomer } = useContext(AuthContext);
  const navigate = useNavigate();

  const [fgpos, setFgpos] = useState<Fgpo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('desc');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FgpoForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Customer options for dropdowns
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const { options: styleOptions } = useStyleOptions();
  const { options: colorOptions } = useColorOptions();
  const { options: sizeOptions } = useSizeOptions();
  const [fgpoLines, setFgpoLines] = useState<FgpoLine[]>([]);
  const [expandedFgpo, setExpandedFgpo] = useState<number | null>(null);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineForm, setLineForm] = useState({ FgpoId: 0, StyleId: 0, ColorId: 0, SizeId: 0, Quantity: '', UnitPrice: '' });
  const [lineFormError, setLineFormError] = useState('');
  const [lineSaving, setLineSaving] = useState(false);
  // Catálogo de precios (Style+Color+Size -> UnitPrice) para autocompletar Price
  const [priceCatalog, setPriceCatalog] = useState<{ styleId: number; colorId: number; sizeId: number; unitPrice: number }[]>([]);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerFilter(selectedCustomer.name);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, customerFilter, sortBy, sortOrder]);

  // Load customer options once
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const custRes = await customersApi.getAll();
        setCustomers((custRes.data ?? []).map((c: any) => ({ ID: c.id ?? c.ID, Name: c.name ?? c.Name })));
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load customers.');
      }
    };
    loadOptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fgpoApi.getPaged({
        page: page + 1,
        pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
        status: statusFilter || undefined,
        customer: customerFilter || undefined,
      });
      setFgpos((res.data.items || []).map(mapFgpo));
      setTotalCount(res.data.totalCount ?? 0);

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load FGPO records');
    } finally {
      setLoading(false);
    }
  };

  const loadFgpoLines = async () => {
    try {
      const res = await fgpoLinesApi.getAll();
      setFgpoLines((res.data ?? []).map(mapFgpoLine));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load FGPO lines.');
    }
  };

  // Refresca únicamente las líneas de un FGPO (evita recargar todas)
  const refreshLinesForFgpo = async (fgpoId: number) => {
    try {
      const res = await fgpoLinesApi.getByFgpo(fgpoId);
      const lines = (res.data ?? []).map(mapFgpoLine);
      setFgpoLines(prev => [...prev.filter(l => l.fgpoId !== fgpoId), ...lines]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load FGPO lines.');
    }
  };

  // Expande un FGPO y carga sus líneas solo en ese momento (bajo demanda)
  const toggleExpandFgpo = (fgpoId: number) => {
    if (expandedFgpo === fgpoId) {
      setExpandedFgpo(null);
      return;
    }
    setExpandedFgpo(fgpoId);
    const alreadyLoaded = fgpoLines.some(l => l.fgpoId === fgpoId);
    if (!alreadyLoaded) refreshLinesForFgpo(fgpoId);
  };

  const loadPriceCatalog = async () => {
    try {
      const res = await pricesApi.getAll();
      setPriceCatalog((res.data ?? []).map((p: any) => ({
        styleId: p.styleId ?? p.StyleId ?? 0,
        colorId: p.colorId ?? p.ColorId ?? 0,
        sizeId: p.sizeId ?? p.SizeId ?? 0,
        unitPrice: Number(p.unitPrice ?? p.UnitPrice ?? 0),
      })));
    } catch { /* catálogo opcional */ }
  };

  useEffect(() => {
    loadPriceCatalog();
  }, []);

  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...emptyForm, CustomerId: selectedCustomer?.id ?? 0, CustomerName: selectedCustomer?.name ?? '', Status: 'In Progress' });
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (fgpo: Fgpo) => {
    setEditingId(fgpo.ID);
    setForm({
      FGPONumber: fgpo.FGPONumber,
      TemporaryNumber: fgpo.TemporaryNumber || '',
      Status: fgpo.Status || '',
      CustomerId: fgpo.CustomerId,
      CustomerName: fgpo.CustomerName || '',
      Style: fgpo.Style || '',
      Color: fgpo.Color || '',
      OrderQuantity: fgpo.OrderQuantity,
      CreatedDate: fgpo.CreatedAt ? fgpo.CreatedAt.slice(0, 10) : '',
      DeliveryDate: fgpo.DeliveryDate ? fgpo.DeliveryDate.slice(0, 10) : '',
      InTransitQty: fgpo.InTransitQty,
      ReceivedQty: fgpo.ReceivedQty,
      TotalShippedQty: fgpo.TotalShippedQty,
      ProducedQty: fgpo.ProducedQty,
      DataOwnerId: fgpo.DataOwnerId || 0,
      Remarks: fgpo.Remarks || '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError('');

    // Client-side validation
    if (!form.Status.trim()) {
      setFormError('FGPO Status is required.');
      return;
    }
    if (form.Status === 'FGPO Pending') {
      if (!form.TemporaryNumber.trim()) {
        setFormError('Temporary Order ID is required when status is FGPO Pending.');
        return;
      }
    } else if (!form.FGPONumber.trim()) {
      setFormError('FGPO Number is required.');
      return;
    }
    if (!form.CustomerId) {
      setFormError('Customer is required.');
      return;
    }
    if (!form.DeliveryDate) {
      setFormError('Delivery Date is required.');
      return;
    }
    if (form.OrderQuantity <= 0) {
      setFormError('Order Quantity must be greater than 0.');
      return;
    }

    const payload = {
      ...form,
      DataOwnerId: form.DataOwnerId || null,
      OrderQuantity: Number(form.OrderQuantity),
      InTransitQty: Number(form.InTransitQty),
      ReceivedQty: Number(form.ReceivedQty),
      TotalShippedQty: Number(form.TotalShippedQty),
      ProducedQty: Number(form.ProducedQty),
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        await fgpoApi.update(editingId, payload);
        setSuccess('FGPO updated successfully.');
      } else {
        await fgpoApi.create(payload);
        setSuccess('FGPO created successfully.');
      }
      setDialogOpen(false);
      setPage(0);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err?.response?.data || 'Failed to save FGPO record.');
    } finally {
      setSaving(false);
    }
  };

  const openLineDialog = (fgpoId: number, line?: FgpoLine) => {
    setEditingLineId(line?.id ?? null);
    if (line) {
      setLineForm({ FgpoId: line.fgpoId, StyleId: line.styleId, ColorId: line.colorId, SizeId: line.sizeId, Quantity: String(line.quantity), UnitPrice: line.unitPrice == null ? '' : String(line.unitPrice) });
    } else {
      // Autocompletar Style y Color desde el FGPO y bloquearlos al crear
      const fgpo = fgpos.find(f => f.ID === fgpoId);
      const styleMatch = styleOptions.find((s: any) => (s.label ?? '') === (fgpo?.Style ?? ''));
      const colorMatch = colorOptions.find((c: any) => (c.label ?? '') === (fgpo?.Color ?? ''));
      setLineForm({
        FgpoId: fgpoId,
        StyleId: styleMatch?.id ?? 0,
        ColorId: colorMatch?.id ?? 0,
        SizeId: 0,
        Quantity: '',
        UnitPrice: '',
      });
    }
    setLineFormError('');
    setLineDialogOpen(true);
  };

  const handleLineSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!lineForm.FgpoId || !lineForm.StyleId || !lineForm.ColorId || !lineForm.SizeId) {
      setLineFormError('FGPO, Style, Color and Size are required.');
      return;
    }
    if (!lineForm.Quantity || Number(lineForm.Quantity) <= 0) {
      setLineFormError('Quantity must be greater than 0.');
      return;
    }
    // El Unit Price debe existir en el catálogo Prices para esa combinación Style/Color/Size
    if (!lineForm.UnitPrice || Number(lineForm.UnitPrice) <= 0) {
      setLineFormError('No hay Unit Price configurado en el catálogo Prices para esa combinación Style/Color/Size.');
      return;
    }

    // Verificación: la suma total de líneas del FGPO no puede exceder el Order Qty del FGPO Master
    const fgpo = fgpos.find(f => f.ID === Number(lineForm.FgpoId));
    const newQty = Number(lineForm.Quantity);
    if (fgpo && fgpo.OrderQuantity > 0) {
      const currentLines = fgpoLines.filter(l => l.fgpoId === fgpo.ID);
      const sumOthers = currentLines
        .filter(l => editingLineId === null || l.id !== editingLineId)
        .reduce((s, l) => s + (Number(l.quantity) || 0), 0);
      const totalAfter = sumOthers + newQty;
      if (totalAfter > fgpo.OrderQuantity) {
        setLineFormError(
          `La cantidad total de líneas (${totalAfter}) supera el Order Qty del FGPO (${fgpo.OrderQuantity}).`
        );
        return;
      }
    }

    setLineSaving(true);
    try {
      const payload = {
        FgpoId: Number(lineForm.FgpoId),
        StyleId: Number(lineForm.StyleId),
        ColorId: Number(lineForm.ColorId),
        SizeId: Number(lineForm.SizeId),
        Quantity: Number(lineForm.Quantity),
        UnitPrice: lineForm.UnitPrice === '' ? null : Number(lineForm.UnitPrice),
      };
      if (editingLineId !== null) await fgpoLinesApi.update(editingLineId, payload);
      else await fgpoLinesApi.create(payload);
      setLineDialogOpen(false);
      await refreshLinesForFgpo(Number(lineForm.FgpoId));
    } catch (err: any) {
      setLineFormError(err?.response?.data?.message || err?.response?.data || 'Failed to save FGPO line.');
    } finally {
      setLineSaving(false);
    }
  };

  const handleLineDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this FGPO line?')) return;
    const line = fgpoLines.find(l => l.id === id);
    try {
      await fgpoLinesApi.delete(id);
      if (line) await refreshLinesForFgpo(line.fgpoId);
      else await loadFgpoLines();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete FGPO line.');
    }
  };

  // Aplica el precio del catálogo (Style+Color+Size) cuando ya están completos
  const applyCatalogPrice = (next: typeof lineForm) => {
    const match = priceCatalog.find(p =>
      p.styleId === Number(next.StyleId) &&
      p.colorId === Number(next.ColorId) &&
      p.sizeId === Number(next.SizeId));
    return { ...next, UnitPrice: match ? String(match.unitPrice) : '' };
  };

  /**
   * Navega al módulo Styles para crear el registro completo.
   * No se crea nada desde aquí: el formulario de Styles se abre
   * precargado con el Style Code escrito por el usuario.
   */
  const goToCreateStyle = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/admin/styles?value=${encodeURIComponent(trimmed)}`);
  };

  /**
   * Navega al módulo Colors para crear el registro completo.
   * No se crea nada desde aquí: el formulario de Colors se abre
   * precargado con el Color Name escrito por el usuario.
   */
  const goToCreateColor = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/admin/colors?value=${encodeURIComponent(trimmed)}`);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this FGPO record?')) return;
    try {
      await fgpoApi.delete(id);
      setSuccess('FGPO deleted successfully.');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete FGPO record.');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Approved': return 'success';
      case 'In Progress': return 'info';
      case 'Partially Completed': return 'info';
      case 'Pending': return 'warning';
      case 'FGPO Pending': return 'warning';
      case 'On Hold': return 'warning';
      case 'Rejected': return 'error';
      case 'Cancelled': return 'error';
      case 'Closed': return 'default';
      case 'Not Started': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const formatNumber = (n: number) => {
    if (n === undefined || n === null) return '-';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const sortableHeader = (label: string, column: string) => (
    <TableCell
      sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(column)}
    >
      {label}
      {sortBy === column && (
        <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
      )}
    </TableCell>
  );

  if (loading && fgpos.length === 0) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AssignmentIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>FGPO Master</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Toolbar: Search, Filters, Add */}
      <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search"
            size="small"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flexGrow: 1, minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
              },
            }}

          />
          <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>Search</Button>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Customer</InputLabel>
            <Select
              value={customerFilter}
              label="Customer"
              disabled={!!selectedCustomer}
              onChange={e => { setCustomerFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {customerFilter && !customers.some(c => c.Name === customerFilter) && (
                <MenuItem value={customerFilter}>{customerFilter}</MenuItem>
              )}
              {customers.map(c => <MenuItem key={c.ID} value={c.Name}>{c.Name}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreateDialog}>
            New FGPO
          </Button>
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Record ID</TableCell>
                {sortableHeader('FGPO', 'fgponumber')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Temp Order ID</TableCell>
                {sortableHeader('Status', 'status')}
                {sortableHeader('Customer', 'customer')}
                {sortableHeader('Style', 'style')}
                {sortableHeader('Color', 'color')}
                {sortableHeader('Order Qty', 'orderquantity')}
                {sortableHeader('PO Creation Date', 'createdat')}
                {sortableHeader('Ship Date', 'deliverydate')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>In Transit</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Received</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Total Shipped</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Ship Variance</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Pending Ship</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Over-ship</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Produced</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Prod Variance</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Pending Prod</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Over-prod</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Data Owner</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Last Updated</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fgpos.map(fgpo => (
                <React.Fragment key={fgpo.ID}>
                <TableRow hover>
                  <TableCell>{fgpo.ID}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    <Button
                      size="small"
                      onClick={() => toggleExpandFgpo(fgpo.ID)}
                      startIcon={expandedFgpo === fgpo.ID ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ fontWeight: 'bold', textTransform: 'none' }}
                    >
                      {fgpo.FGPONumber || '-'}
                    </Button>
                  </TableCell>
                  <TableCell>{fgpo.TemporaryNumber || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={fgpo.Status || 'N/A'}
                      size="small"
                      color={getStatusColor(fgpo.Status) as any}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{fgpo.CustomerName}</TableCell>
                  <TableCell>{fgpo.Style || '-'}</TableCell>
                  <TableCell>{fgpo.Color || '-'}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.OrderQuantity)}</TableCell>
                  <TableCell>{formatDate(fgpo.CreatedAt)}</TableCell>
                  <TableCell>{formatDate(fgpo.DeliveryDate)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.InTransitQty)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.ReceivedQty)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.TotalShippedQty)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.ShipmentVariance)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.PendingToShip)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.OvershipmentQty)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.ProducedQty)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.ProductionVariance)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.PendingProduction)}</TableCell>
                  <TableCell align="right">{formatNumber(fgpo.OverproductionQty)}</TableCell>
                  <TableCell>{fgpo.DataOwnerName || '-'}</TableCell>
                  <TableCell>{formatDate(fgpo.UpdatedAt || fgpo.CreatedAt)}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => openEditDialog(fgpo)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(fgpo.ID)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                {expandedFgpo === fgpo.ID && (
                  <TableRow>
                    <TableCell colSpan={23} sx={{ bgcolor: 'grey.50', p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          FGPO Lines: {fgpo.FGPONumber || '-'}
                        </Typography>
                        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openLineDialog(fgpo.ID)}>
                          Add Line
                        </Button>
                      </Box>
                      {fgpoLines.filter(line => line.fgpoId === fgpo.ID).length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No lines registered for this FGPO.</Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {['Style', 'Color', 'Size', 'Qty', 'Unit Price', 'Total', 'Actions'].map(header => (
                                <TableCell key={header} sx={{ fontWeight: 700 }}>{header}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {fgpoLines.filter(line => line.fgpoId === fgpo.ID).map(line => (
                              <TableRow key={line.id}>
                                <TableCell>{line.styleCode || '-'}</TableCell>
                                <TableCell>{line.colorName || '-'}</TableCell>
                                <TableCell>{line.sizeCode || '-'}</TableCell>
                                <TableCell>{formatNumber(line.quantity)}</TableCell>
                                <TableCell>{line.unitPrice != null ? `$${line.unitPrice.toFixed(3)}` : '-'}</TableCell>
                                <TableCell>{`$${line.totalValue.toFixed(2)}`}</TableCell>
                                <TableCell>
                                  <Tooltip title="Edit line">
                                    <IconButton size="small" color="primary" onClick={() => openLineDialog(fgpo.ID, line)}><EditIcon fontSize="small" /></IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete line">
                                    <IconButton size="small" color="error" onClick={() => handleLineDelete(line.id)}><DeleteIcon fontSize="small" /></IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              ))}
              {fgpos.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={23} align="center">No FGPO records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page:"
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {editingId !== null ? 'Edit FGPO' : 'New FGPO'}
        </DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {editingId !== null ? (
                <FormControl size="small" required>
                  <InputLabel>FGPO Status *</InputLabel>
                  <Select
                    value={form.Status}
                    label="FGPO Status *"
                    onChange={e => setForm({ ...form, Status: e.target.value })}
                  >
                    <MenuItem value="">Select status...</MenuItem>
                    {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="FGPO Status"
                  size="small"
                  value="In Progress"
                  slotProps={{ input: { readOnly: true } }}
                />
              )}
              <TextField
                label="FGPO Number"
                size="small"
                value={form.FGPONumber}
                onChange={e => setForm({ ...form, FGPONumber: e.target.value })}
                helperText={form.Status === 'FGPO Pending' ? 'Optional when status is FGPO Pending' : 'Required'}
              />
              <TextField
                label="Temporary Order ID"
                size="small"
                value={form.TemporaryNumber}
                onChange={e => setForm({ ...form, TemporaryNumber: e.target.value })}
                helperText={form.Status === 'FGPO Pending' ? 'Required and unique when status is FGPO Pending' : ''}
              />
              <TextField
                label="Customer"
                size="small"
                value={form.CustomerName || '—'}
                slotProps={{ input: { readOnly: true } }}
              />
              <CatalogAutocomplete
                label="Style"
                placeholder="Buscar un Style..."
                value={form.Style}
                options={styleOptions as any}
                onChange={v => setForm({ ...form, Style: v })}
                addNewEntityLabel="Style"
                onAddNew={goToCreateStyle}
                helperText="Escribe para filtrar. Si no existe, podrás crearlo en el módulo Styles."
              />
              <CatalogAutocomplete
                label="Color"
                placeholder="Buscar un Color..."
                value={form.Color}
                options={colorOptions as any}
                onChange={v => setForm({ ...form, Color: v })}
                addNewEntityLabel="Color"
                onAddNew={goToCreateColor}
                helperText="Escribe para filtrar. Si no existe, podrás crearlo en el módulo Colors."
              />
              <TextField
                label="Order Quantity *"
                size="small"
                type="number"
                required
                value={form.OrderQuantity}
                onChange={e => setForm({ ...form, OrderQuantity: Number(e.target.value) })}
              />
              <TextField
                label="PO Creation Date"
                size="small"
                type="date"
                value={form.CreatedDate}
                onChange={e => setForm({ ...form, CreatedDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Ship Date *"
                size="small"
                type="date"
                required
                value={form.DeliveryDate}
                onChange={e => setForm({ ...form, DeliveryDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="In Transit Qty"
                size="small"
                type="number"
                value={form.InTransitQty}
                onChange={e => setForm({ ...form, InTransitQty: Number(e.target.value) })}
              />
              <TextField
                label="Received Qty"
                size="small"
                type="number"
                value={form.ReceivedQty}
                onChange={e => setForm({ ...form, ReceivedQty: Number(e.target.value) })}
              />
              <TextField
                label="Total Shipped Qty"
                size="small"
                type="number"
                value={form.TotalShippedQty}
                onChange={e => setForm({ ...form, TotalShippedQty: Number(e.target.value) })}
              />
              <TextField
                label="Produced Qty"
                size="small"
                type="number"
                value={form.ProducedQty}
                onChange={e => setForm({ ...form, ProducedQty: Number(e.target.value) })}
              />
              <FormControl size="small">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
              <TextField
                label="Remarks"
                size="small"
                multiline
                rows={2}
                value={form.Remarks}
                onChange={e => setForm({ ...form, Remarks: e.target.value })}
                sx={{ gridColumn: { sm: 'span 2' } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : editingId !== null ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={lineDialogOpen} onClose={() => setLineDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleLineSubmit}>
          <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {editingLineId !== null ? 'Edit FGPO Line' : 'Add FGPO Line'}
          </DialogTitle>
          <DialogContent>
            {lineFormError && <Alert severity="error" sx={{ mb: 2 }}>{lineFormError}</Alert>}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
              <FormControl size="small" required sx={{ gridColumn: { sm: 'span 2' } }}>
                <InputLabel>FGPO *</InputLabel>
                <Select value={lineForm.FgpoId || ''} label="FGPO *" disabled>
                  <MenuItem value={lineForm.FgpoId}>{fgpos.find(f => f.ID === lineForm.FgpoId)?.FGPONumber || lineForm.FgpoId}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" required disabled={editingLineId === null}>
                <InputLabel>Style *</InputLabel>
                <Select value={lineForm.StyleId || ''} label="Style *" onChange={e => setLineForm(prev => applyCatalogPrice({ ...prev, StyleId: Number(e.target.value) }))}>
                  {lineForm.StyleId === 0 && (
                    <MenuItem value=""><em>Sin Style vinculado</em></MenuItem>
                  )}
                  {styleOptions.map((option: any) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" required disabled={editingLineId === null}>
                <InputLabel>Color *</InputLabel>
                <Select value={lineForm.ColorId || ''} label="Color *" onChange={e => setLineForm(prev => applyCatalogPrice({ ...prev, ColorId: Number(e.target.value) }))}>
                  {lineForm.ColorId === 0 && (
                    <MenuItem value=""><em>Sin Color vinculado</em></MenuItem>
                  )}
                  {colorOptions.map((option: any) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" required>
                <InputLabel>Size *</InputLabel>
                <Select value={lineForm.SizeId || ''} label="Size *" onChange={e => setLineForm(prev => applyCatalogPrice({ ...prev, SizeId: Number(e.target.value) }))}>
                  <MenuItem value=""><em>Select size...</em></MenuItem>
                  {sizeOptions.map((option: any) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Qty *" size="small" type="number" required value={lineForm.Quantity} onChange={e => setLineForm({ ...lineForm, Quantity: e.target.value })} />
              <TextField
                label="Unit Price"
                size="small"
                type="number"
                required
                value={lineForm.UnitPrice}
                slotProps={{ input: { readOnly: true } }}
                helperText={
                  lineForm.UnitPrice !== '' && Number(lineForm.UnitPrice) > 0
                    ? 'Auto desde el catálogo Prices (Style/Color/Size)'
                    : 'Sin precio configurado para esa combinación en el catálogo Prices'
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLineDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={lineSaving}>{editingLineId !== null ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Fgpo;
