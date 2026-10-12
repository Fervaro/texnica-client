import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, MenuItem, Select,
  FormControl, InputLabel, TablePagination, Tooltip, Grid
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BoltIcon from '@mui/icons-material/Bolt';
import { fabricRequirementsApi, fgpoApi, customersApi, stylesApi, styleYieldsApi } from '../../utils/api';
import { getCurrentUserName } from '../../utils/session';
import { useComponentOptions } from '../../hooks/components/useComponentOptions';

interface FabricRequirement {
  ID: number;
  FGPOId: number;
  FGPONumber: string;
  CustomerName: string;
  Style?: string;
  Color?: string;
  ComponentId?: number;
  ComponentCode?: string;
  FabricDescription?: string;
  Composition?: string;
  GSM: number;
  RequiredWidth?: string;
  UOM?: string;
  OrderQuantity: number;
  ApprovedYield: number;
  GrossRequirement: number;
  AllowancePercentage: number;
  AllowanceQty: number;
  AvailableInventory: number;
  NetPurchaseRequirement: number;
  RequiredDate: string;
  Status?: string;
  DataOwnerId?: number;
  DataOwnerName?: string;
  Remarks?: string;
  Active: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}

interface FgpoOption {
  ID: number;
  FGPONumber: string;
  CustomerName: string;
  Style?: string;
  Color?: string;
  OrderQuantity: number;
  DeliveryDate: string;
}

interface CustomerOption {
  ID: number;
  Name: string;
}

interface StyleFabricOption {
  id: number;
  styleCode: string;
  fabricDescription?: string;
  fabricContent?: string;
  gsm?: number;
}

interface StyleYieldOption {
  styleId: number;
  componentId: number;
  yieldQuoted?: number;
  yieldReal?: number;
}

interface FabricRequirementForm {
  FGPOId: number;
  Style: string;
  Color: string;
  ComponentId: number;
  FabricDescription: string;
  Composition: string;
  GSM: number;
  RequiredWidth: string;
  UOM: string;
  OrderQuantity: number;
  ApprovedYield: number;
  AllowancePercentage: number;
  AvailableInventory: number;
  RequiredDate: string;
  Status: string;
  DataOwnerId: number;
  Remarks: string;
}

// Valores por defecto de negocio para nuevos Fabric Requirements.
// Deben coincidir con los defaults del backend (FabricRequirementService).
const DEFAULT_ALLOWANCE_PERCENTAGE = 1; // 1%, no una fracción
const DEFAULT_STATUS = 'In Progress';

const emptyForm: FabricRequirementForm = {
  FGPOId: 0,
  Style: '',
  Color: '',
  ComponentId: 0,
  FabricDescription: '',
  Composition: '',
  GSM: 0,
  RequiredWidth: '',
  UOM: '',
  OrderQuantity: 0,
  ApprovedYield: 0,
  AllowancePercentage: DEFAULT_ALLOWANCE_PERCENTAGE,
  AvailableInventory: 0,
  RequiredDate: '',
  Status: DEFAULT_STATUS,
  DataOwnerId: 0,
  Remarks: '',
};

const uomOptions = ['Yards', 'Meters', 'Kilograms', 'Pounds', 'Rolls', 'Pieces'];

const statusOptions = ['Pending', 'Approved', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];

// Map the API response (camelCase) to the PascalCase interface used by the UI
const mapFabricRequirement = (raw: any): FabricRequirement => ({
  ID: raw.id ?? raw.ID,
  FGPOId: raw.fgpoId ?? raw.FGPOId ?? 0,
  FGPONumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
  CustomerName: raw.customerName ?? raw.CustomerName ?? '',
  Style: raw.style ?? raw.Style,
  Color: raw.color ?? raw.Color,
  ComponentId: raw.componentId ?? raw.ComponentId ?? undefined,
  ComponentCode: raw.componentCode ?? raw.ComponentCode ?? '',
  FabricDescription: raw.fabricDescription ?? raw.FabricDescription,
  Composition: raw.composition ?? raw.Composition,
  GSM: raw.gsm ?? raw.GSM ?? 0,
  RequiredWidth: raw.requiredWidth ?? raw.RequiredWidth,
  UOM: raw.uom ?? raw.UOM,
  OrderQuantity: raw.orderQuantity ?? raw.OrderQuantity ?? 0,
  ApprovedYield: raw.approvedYield ?? raw.ApprovedYield ?? 0,
  GrossRequirement: raw.grossRequirement ?? raw.GrossRequirement ?? 0,
  AllowancePercentage: raw.allowancePercentage ?? raw.AllowancePercentage ?? 0,
  AllowanceQty: raw.allowanceQty ?? raw.AllowanceQty ?? 0,
  AvailableInventory: raw.availableInventory ?? raw.AvailableInventory ?? 0,
  NetPurchaseRequirement: raw.netPurchaseRequirement ?? raw.NetPurchaseRequirement ?? 0,
  RequiredDate: raw.requiredDate ?? raw.RequiredDate ?? '',
  Status: raw.status ?? raw.Status,
  DataOwnerId: raw.dataOwnerId ?? raw.DataOwnerId ?? undefined,
  DataOwnerName: raw.dataOwnerName ?? raw.DataOwnerName ?? '',
  Remarks: raw.remarks ?? raw.Remarks,
  Active: raw.active ?? raw.Active ?? true,
  CreatedAt: raw.createdAt ?? raw.CreatedAt ?? '',
  UpdatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const FabricRequirement: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<FabricRequirement[]>([]);
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
  const [fgpoFilter, setFgpoFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [fabricComponentFilter, setFabricComponentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('desc');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FabricRequirementForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [detailItem, setDetailItem] = useState<FabricRequirement | null>(null);

  // Options for dropdowns
  const [fgpos, setFgpos] = useState<FgpoOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedFgpo, setSelectedFgpo] = useState<FgpoOption | null>(null);
  const [styleOptions, setStyleOptions] = useState<StyleFabricOption[]>([]);
  const [styleYields, setStyleYields] = useState<StyleYieldOption[]>([]);
  const [fabricAuto, setFabricAuto] = useState(false);

  // Generación automática desde FGPO (Style Yields -> un Fabric Requirement por Component)
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateFgpoId, setGenerateFgpoId] = useState(0);
  const [generateUom, setGenerateUom] = useState('Yards');
  const [generateAllowance, setGenerateAllowance] = useState(String(DEFAULT_ALLOWANCE_PERCENTAGE));
  const [generateRequiredDate, setGenerateRequiredDate] = useState('');
  const [generateExisting, setGenerateExisting] = useState<number[]>([]);
  const [generateError, setGenerateError] = useState('');
  const [generating, setGenerating] = useState(false);
  const { options: componentList } = useComponentOptions();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, fgpoFilter, customerFilter, styleFilter, fabricComponentFilter, statusFilter, sortBy, sortOrder]);

  // Load FGPO and customer options once
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [fgpoRes, custRes, styleRes, yieldRes] = await Promise.all([
          fgpoApi.getAll(),
          customersApi.getAll(),
          stylesApi.getAll(),
          styleYieldsApi.getAll(),
        ]);
        setFgpos((fgpoRes.data ?? []).map((f: any) => ({
          ID: f.id ?? f.ID,
          FGPONumber: f.fgpoNumber ?? f.FGPONumber ?? '',
          CustomerName: f.customerName ?? f.CustomerName ?? '',
          Style: f.style ?? f.Style,
          Color: f.color ?? f.Color,
          OrderQuantity: f.orderQuantity ?? f.OrderQuantity ?? 0,
          DeliveryDate: f.deliveryDate ?? f.DeliveryDate ?? '',
        })));
        setCustomers((custRes.data ?? []).map((c: any) => ({ ID: c.id ?? c.ID, Name: c.name ?? c.Name })));
        setStyleOptions((styleRes.data ?? []).map((s: any) => ({
          id: s.id ?? s.ID ?? 0,
          styleCode: s.styleCode ?? s.StyleCode ?? '',
          fabricDescription: s.fabricDescription ?? s.FabricDescription,
          fabricContent: s.fabricContent ?? s.FabricContent,
          gsm: s.gsm ?? s.Gsm ?? s.GSM,
        })));
        setStyleYields((yieldRes.data ?? []).map((y: any) => ({
          styleId: y.styleId ?? y.StyleId ?? 0,
          componentId: y.componentId ?? y.ComponentId ?? 0,
          yieldQuoted: y.yieldQuoted ?? y.YieldQuoted,
          yieldReal: y.yieldReal ?? y.YieldReal,
        })));
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load options.');
      }
    };
    loadOptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fabricRequirementsApi.getPaged({
        page: page + 1,
        pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
        fgpo: fgpoFilter || undefined,
        customer: customerFilter || undefined,
        style: styleFilter || undefined,
        fabricComponent: fabricComponentFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems((res.data.items || []).map(mapFabricRequirement));
      setTotalCount(res.data.totalCount ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Fabric Requirement records');
    } finally {
      setLoading(false);
    }
  };

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

  // Resuelve el Style del catálogo a partir del código (texto) guardado en el requerimiento
  const findStyleOption = (styleCode?: string) => {
    const code = (styleCode ?? '').trim().toLowerCase();
    if (!code) return undefined;
    return styleOptions.find(s => (s.styleCode ?? '').trim().toLowerCase() === code);
  };

  // Style + Component -> Yield (desde el catálogo Style Yields). Devuelve null si no está configurado.
  const resolveYield = (styleCode?: string, componentId?: number): number | null => {
    if (!componentId) return null;
    const style = findStyleOption(styleCode);
    if (!style) return null;
    const match = styleYields.find(y => y.styleId === style.id && y.componentId === componentId);
    const value = match?.yieldQuoted ?? match?.yieldReal;
    if (value === undefined || value === null || value <= 0) return null;
    return value;
  };

  // Aplica el Yield derivado al formulario (el Gross Req. se calcula a partir de él)
  const withYield = (next: FabricRequirementForm): FabricRequirementForm => ({
    ...next,
    ApprovedYield: resolveYield(next.Style, next.ComponentId) ?? 0,
  });

  const resolvedYield = resolveYield(form.Style, form.ComponentId);
  const componentLabel = componentList.find((c: any) => c.id === form.ComponentId)?.label ?? '';

  // Datos derivados del diálogo de generación automática
  const generateFgpo = fgpos.find(f => f.ID === generateFgpoId) || null;
  const generateStyle = findStyleOption(generateFgpo?.Style);
  const generateYields = generateStyle
    ? styleYields.filter(y => y.styleId === generateStyle.id)
    : [];

  // Allow % vigente en el diálogo de generación (default 1% si el campo está vacío o inválido)
  const generateAllowanceValue =
    generateAllowance === '' || Number.isNaN(Number(generateAllowance))
      ? DEFAULT_ALLOWANCE_PERCENTAGE
      : Number(generateAllowance);

  // Estado de cada Component en la vista previa (Se creará / Ya existe / Error de configuración)
  const generateRows = generateFgpo
    ? generateYields.map(y => {
        const yieldValue = y.yieldQuoted ?? y.yieldReal;
        const invalid = yieldValue === undefined || yieldValue === null || yieldValue <= 0;
        const exists = !invalid && generateExisting.includes(y.componentId);
        const gross = invalid ? null : generateFgpo.OrderQuantity * (yieldValue as number);
        return {
          componentId: y.componentId,
          label: componentList.find((c: any) => c.id === y.componentId)?.label ?? String(y.componentId),
          yieldValue,
          invalid,
          exists,
          status: invalid ? 'Error de configuración' : exists ? 'Ya existe' : 'Se creará',
          gross,
          // Allow Qty = Gross Requirement x (Allow % / 100)
          allowQty: gross === null ? null : (gross * generateAllowanceValue) / 100,
        };
      })
    : [];
  // Componentes que realmente se van a crear (ni existentes ni con error de configuración)
  const generatePending = generateRows.filter(r => r.status === 'Se creará').length;

  // Navega al módulo Style Yields para configurar el Yield faltante (Style + Component)
  const goToStyleYield = () => {
    const style = findStyleOption(form.Style);
    const params = new URLSearchParams();
    if (style) params.set('style', String(style.id));
    if (form.ComponentId) params.set('component', String(form.ComponentId));
    navigate(`/admin/style-yields?${params.toString()}`);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedFgpo(null);
    setFabricAuto(false);
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: FabricRequirement) => {
    setEditingId(item.ID);
    setForm(withYield({
      FGPOId: item.FGPOId,
      Style: item.Style || '',
      Color: item.Color || '',
      ComponentId: item.ComponentId || 0,
      FabricDescription: item.FabricDescription || '',
      Composition: item.Composition || '',
      GSM: item.GSM,
      RequiredWidth: item.RequiredWidth || '',
      UOM: item.UOM || '',
      OrderQuantity: item.OrderQuantity,
      ApprovedYield: item.ApprovedYield,
      AllowancePercentage: item.AllowancePercentage,
      AvailableInventory: item.AvailableInventory,
      RequiredDate: item.RequiredDate ? item.RequiredDate.slice(0, 10) : '',
      Status: item.Status || '',
      DataOwnerId: item.DataOwnerId || 0,
      Remarks: item.Remarks || '',
    }));
    const fgpo = fgpos.find(f => f.ID === item.FGPOId) || null;
    setSelectedFgpo(fgpo);
    const styleCode = (fgpo?.Style ?? item.Style ?? '').trim();
    const styleMatch = styleOptions.find(s => s.styleCode.trim().toLowerCase() === styleCode.toLowerCase())
      ?? styleOptions.find(s => s.styleCode.trim().toLowerCase().includes(styleCode.toLowerCase()));
    setFabricAuto(!!styleMatch);
    setFormError('');
    setDialogOpen(true);
  };

  const openDetailDialog = (item: FabricRequirement) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleFgpoChange = (fgpoId: number) => {
    const fgpo = fgpos.find(f => f.ID === fgpoId) || null;
    setSelectedFgpo(fgpo);
    const styleCode = (fgpo?.Style ?? '').trim();
    const styleMatch = styleOptions.find(s => s.styleCode.trim().toLowerCase() === styleCode.toLowerCase())
      ?? styleOptions.find(s => s.styleCode.trim().toLowerCase().includes(styleCode.toLowerCase()));
    setFabricAuto(!!styleMatch);
    setForm(prev => withYield({
      ...prev,
      FGPOId: fgpoId,
      Style: fgpo?.Style || prev.Style,
      Color: fgpo?.Color || prev.Color,
      FabricDescription: styleMatch?.fabricDescription ?? prev.FabricDescription,
      Composition: styleMatch?.fabricContent ?? prev.Composition,
      GSM: styleMatch?.gsm ?? prev.GSM,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation
    if (!form.FGPOId) {
      setFormError('FGPO is required.');
      return;
    }
    if (!form.ComponentId) {
      setFormError('Fabric Component is required.');
      return;
    }
    if (!form.UOM.trim()) {
      setFormError('UOM is required.');
      return;
    }
    if (form.OrderQuantity <= 0) {
      setFormError('Order Quantity must be greater than 0.');
      return;
    }
    if (form.ApprovedYield <= 0) {
      setFormError(`No existe un Yield configurado para el Style ${form.Style || '-'} y el componente ${componentLabel || form.ComponentId}. Configúralo en el módulo Style Yields.`);
      return;
    }
    if (form.AllowancePercentage < 0 || form.AllowancePercentage > 100) {
      setFormError('Allowance % must be between 0 and 100.');
      return;
    }
    if (!form.RequiredDate) {
      setFormError('Required Date is required.');
      return;
    }

    const payload = {
      ...form,
      ComponentId: form.ComponentId || null,
      DataOwnerId: form.DataOwnerId || null,
      GSM: Number(form.GSM),
      OrderQuantity: Number(form.OrderQuantity),
      ApprovedYield: Number(form.ApprovedYield),
      AllowancePercentage: Number(form.AllowancePercentage),
      AvailableInventory: Number(form.AvailableInventory),
    };

    try {
      if (editingId !== null) {
        await fabricRequirementsApi.update(editingId, payload);
        setSuccess('Fabric Requirement updated successfully.');
      } else {
        await fabricRequirementsApi.create(payload);
        setSuccess('Fabric Requirement created successfully.');
      }
      setDialogOpen(false);
      setPage(0);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err?.response?.data || 'Failed to save Fabric Requirement record.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Fabric Requirement record?')) return;
    try {
      await fabricRequirementsApi.delete(id);
      setSuccess('Fabric Requirement deleted successfully.');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete Fabric Requirement record.');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ── Generación automática desde FGPO ────────────────────────────────────
  const openGenerateDialog = () => {
    setGenerateFgpoId(0);
    setGenerateUom('Yards');
    setGenerateAllowance(String(DEFAULT_ALLOWANCE_PERCENTAGE));
    setGenerateRequiredDate('');
    setGenerateExisting([]);
    setGenerateError('');
    setGenerateOpen(true);
  };

  const handleGenerateFgpoChange = async (fgpoId: number) => {
    setGenerateFgpoId(fgpoId);
    setGenerateError('');
    setGenerateExisting([]);
    const fgpo = fgpos.find(f => f.ID === fgpoId);
    setGenerateRequiredDate(fgpo?.DeliveryDate ? fgpo.DeliveryDate.slice(0, 10) : '');
    if (!fgpoId) return;
    // Componentes que ya tienen requerimiento en esa FGPO (para mostrar qué se creará)
    try {
      const res = await fabricRequirementsApi.getByFgpo(fgpoId);
      setGenerateExisting(
        (res.data ?? [])
          .map((r: any) => r.componentId ?? r.ComponentId)
          .filter((x: any) => x !== null && x !== undefined),
      );
    } catch { /* informativo */ }
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!generateFgpoId) {
      setGenerateError('Selecciona una FGPO.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fabricRequirementsApi.generate(generateFgpoId, {
        UOM: generateUom,
        // Si el campo queda vacío se omite y el backend aplica su default (1%)
        AllowancePercentage: generateAllowance === '' ? undefined : Number(generateAllowance),
        RequiredDate: generateRequiredDate || undefined,
      });
      setGenerateOpen(false);
      setPage(0);
      await loadData();
      setSuccess(res?.data?.message ?? 'Generación completada.');
      setTimeout(() => setSuccess(''), 6000);
    } catch (err: any) {
      setGenerateError(err?.response?.data?.message || err?.response?.data || 'No fue posible generar los requerimientos.');
    } finally {
      setGenerating(false);
    }
  };

  const goToStyleYieldsForGenerate = () => {
    const params = new URLSearchParams();
    if (generateStyle) params.set('style', String(generateStyle.id));
    navigate(`/admin/style-yields?${params.toString()}`);
  };

  const formatNumber = (value: number) => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Approved': return 'success';
      case 'In Progress': return 'info';
      case 'Pending': return 'warning';
      case 'On Hold': return 'warning';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
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

  if (loading && items.length === 0) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <LocalShippingIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Fabric Requirement</Typography>
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

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>FGPO</InputLabel>
            <Select
              value={fgpoFilter}
              label="FGPO"
              onChange={e => { setFgpoFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {fgpos.map(f => <MenuItem key={f.ID} value={f.FGPONumber}>{f.FGPONumber}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Customer</InputLabel>
            <Select
              value={customerFilter}
              label="Customer"
              onChange={e => { setCustomerFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {customers.map(c => <MenuItem key={c.ID} value={c.Name}>{c.Name}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            label="Style"
            size="small"
            value={styleFilter}
            onChange={e => { setStyleFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 120 }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Fabric Component</InputLabel>
            <Select
              value={fabricComponentFilter}
              label="Fabric Component"
              onChange={e => { setFabricComponentFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {componentList.map(c => <MenuItem key={c.id} value={c.label}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
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

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="contained" color="secondary" startIcon={<BoltIcon />} onClick={openGenerateDialog}>
            Generate from FGPO
          </Button>

          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreateDialog}>
            New Fabric Requirement
          </Button>
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Req ID</TableCell>
                {sortableHeader('FGPO', 'fgpo')}
                {sortableHeader('Style', 'style')}
                {sortableHeader('Color', 'color')}
                {sortableHeader('Fabric Component', 'fabriccomponent')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Composition</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>GSM</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Width</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>UOM</TableCell>
                {sortableHeader('Order Qty', 'orderquantity')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Yield</TableCell>
                {sortableHeader('Gross Req.', 'grossrequirement')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Allow %</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Allow Qty</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Avail Inv</TableCell>
                {sortableHeader('Net Purchase', 'netpurchaserequirement')}
                {sortableHeader('Required Date', 'requireddate')}
                {sortableHeader('Status', 'status')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Data Owner</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.ID} hover>
                  <TableCell>{item.ID}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{item.FGPONumber}</TableCell>
                  <TableCell>{item.Style || '-'}</TableCell>
                  <TableCell>{item.Color || '-'}</TableCell>
                  <TableCell>{item.ComponentCode || '-'}</TableCell>
                  <TableCell>{item.FabricDescription || '-'}</TableCell>
                  <TableCell>{item.Composition || '-'}</TableCell>
                  <TableCell align="right">{formatNumber(item.GSM)}</TableCell>
                  <TableCell>{item.RequiredWidth || '-'}</TableCell>
                  <TableCell>{item.UOM || '-'}</TableCell>
                  <TableCell align="right">{formatNumber(item.OrderQuantity)}</TableCell>
                  <TableCell align="right">{formatNumber(item.ApprovedYield)}</TableCell>
                  <TableCell align="right">{formatNumber(item.GrossRequirement)}</TableCell>
                  <TableCell align="right">{formatNumber(item.AllowancePercentage)}</TableCell>
                  <TableCell align="right">{formatNumber(item.AllowanceQty)}</TableCell>
                  <TableCell align="right">{formatNumber(item.AvailableInventory)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={formatNumber(item.NetPurchaseRequirement)}
                      size="small"
                      color={item.NetPurchaseRequirement > 0 ? 'warning' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(item.RequiredDate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.Status || 'N/A'}
                      size="small"
                      color={getStatusColor(item.Status) as any}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{item.DataOwnerName || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton size="small" color="info" onClick={() => openDetailDialog(item)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => openEditDialog(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.ID)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={21} align="center">No Fabric Requirement records found.</TableCell>
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
          {editingId !== null ? 'Edit Fabric Requirement' : 'New Fabric Requirement'}
        </DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {/* FGPO Selection */}
            <FormControl size="small" fullWidth required sx={{ mb: 2 }}>
              <InputLabel>FGPO *</InputLabel>
              <Select
                value={form.FGPOId}
                label="FGPO *"
                onChange={e => handleFgpoChange(Number(e.target.value))}
              >
                <MenuItem value={0}>Select FGPO...</MenuItem>
                {fgpos.map(f => <MenuItem key={f.ID} value={f.ID}>{f.FGPONumber}</MenuItem>)}
              </Select>
            </FormControl>

            {/* FGPO Info (auto-displayed) */}
            {selectedFgpo && (
              <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: 'primary.light' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">FGPO Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedFgpo.FGPONumber}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedFgpo.CustomerName}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Style</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedFgpo.Style || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Color</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedFgpo.Color || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Order Quantity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedFgpo.OrderQuantity.toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {form.Style && form.ComponentId > 0 && resolvedYield === null && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={goToStyleYield}>
                    Configurar Style Yield
                  </Button>
                }
              >
                No existe un Yield configurado para el Style {form.Style} y el componente {componentLabel || form.ComponentId}.
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl size="small" required>
                <InputLabel>Fabric Component *</InputLabel>
                <Select
                  value={form.ComponentId || ''}
                  label="Fabric Component *"
                  onChange={e => setForm(prev => withYield({ ...prev, ComponentId: Number(e.target.value) }))}
                >
                  <MenuItem value="">Select component...</MenuItem>
                  {componentList.map(c => <MenuItem key={c.id} value={c.id}>{c.label}{c.sub ? ` — ${c.sub}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Fabric Description"
                size="small"
                value={form.FabricDescription}
                slotProps={{ input: { readOnly: fabricAuto } }}
                onChange={e => setForm({ ...form, FabricDescription: e.target.value })}
              />
              <TextField
                label="Composition"
                size="small"
                value={form.Composition}
                slotProps={{ input: { readOnly: fabricAuto } }}
                onChange={e => setForm({ ...form, Composition: e.target.value })}
              />
              <TextField
                label="GSM"
                size="small"
                type="number"
                value={form.GSM}
                slotProps={{ input: { readOnly: fabricAuto } }}
                onChange={e => setForm({ ...form, GSM: Number(e.target.value) })}
              />
              <TextField
                label="Required Width"
                size="small"
                value={form.RequiredWidth}
                onChange={e => setForm({ ...form, RequiredWidth: e.target.value })}
              />
              <FormControl size="small" required>
                <InputLabel>UOM *</InputLabel>
                <Select
                  value={form.UOM}
                  label="UOM *"
                  onChange={e => setForm({ ...form, UOM: e.target.value })}
                >
                  <MenuItem value="">Select UOM...</MenuItem>
                  {uomOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Order Quantity *"
                size="small"
                type="number"
                required
                value={form.OrderQuantity}
                onChange={e => setForm({ ...form, OrderQuantity: Number(e.target.value) })}
              />
              <TextField
                label="Yield"
                size="small"
                type="number"
                value={form.ApprovedYield || ''}
                slotProps={{ input: { readOnly: true } }}
                helperText="Automático desde Style Yields (Style + Component)"
              />
              <TextField
                label="Gross Req."
                size="small"
                type="number"
                value={resolvedYield === null ? '' : Number((form.OrderQuantity * form.ApprovedYield).toFixed(2))}
                slotProps={{ input: { readOnly: true } }}
                helperText="Order Qty × Yield"
              />
              <TextField
                label="Allow % *"
                size="small"
                type="number"
                required
                value={form.AllowancePercentage}
                onChange={e => setForm({ ...form, AllowancePercentage: Number(e.target.value) })}
                helperText="Valor por defecto: 1%"
              />
              <TextField
                label="Available Inventory"
                size="small"
                type="number"
                value={form.AvailableInventory}
                onChange={e => setForm({ ...form, AvailableInventory: Number(e.target.value) })}
              />
              <TextField
                label="Required Date *"
                size="small"
                type="date"
                required
                value={form.RequiredDate}
                onChange={e => setForm({ ...form, RequiredDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.Status}
                  label="Status"
                  onChange={e => setForm({ ...form, Status: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
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
          <Button type="submit" variant="contained" color="primary" onClick={handleSubmit}>
            {editingId !== null ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Fabric Requirement Detail
        </DialogTitle>
        <DialogContent>
          {detailItem && (
            <Box>
              <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: 'primary.light' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">FGPO Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.FGPONumber}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.CustomerName}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Style</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.Style || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Color</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.Color || '-'}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Fabric Component</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.ComponentCode || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Fabric Description</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.FabricDescription || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Composition</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.Composition || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">GSM</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.GSM)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Required Width</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.RequiredWidth || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">UOM</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.UOM || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Order Quantity</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.OrderQuantity)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Approved Yield</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.ApprovedYield)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Gross Requirement</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.GrossRequirement)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Allowance %</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.AllowancePercentage)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Allowance Qty</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.AllowanceQty)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Available Inventory</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.AvailableInventory)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Net Purchase Requirement</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatNumber(detailItem.NetPurchaseRequirement)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Required Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatDate(detailItem.RequiredDate)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.Status || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Data Owner</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.DataOwnerName || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Created At</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatDate(detailItem.CreatedAt)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatDate(detailItem.UpdatedAt || detailItem.CreatedAt)}</Typography>
                </Grid>
              </Grid>

              {detailItem.Remarks && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Remarks</Typography>
                  <Typography variant="body2">{detailItem.Remarks}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Generate from FGPO Dialog */}
      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleGenerate}>
          <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Generate Fabric Requirements from FGPO
          </DialogTitle>
          <DialogContent>
            {generateError && <Alert severity="error" sx={{ mb: 2 }}>{generateError}</Alert>}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se crea un Fabric Requirement por cada Component configurado en Style Yields para el Style de la FGPO.
              El Yield y el Gross Req. se calculan automáticamente. Los Components que ya existen no se duplican.
            </Typography>

            <FormControl size="small" fullWidth required sx={{ mb: 2 }}>
              <InputLabel>FGPO *</InputLabel>
              <Select
                value={generateFgpoId || ''}
                label="FGPO *"
                onChange={e => { void handleGenerateFgpoChange(Number(e.target.value)); }}
              >
                <MenuItem value="">Select FGPO...</MenuItem>
                {fgpos.map(f => (
                  <MenuItem key={f.ID} value={f.ID}>
                    {f.FGPONumber}{f.Style ? ` — Style: ${f.Style}` : ' — (sin Style)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {generateFgpo && (
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: 'primary.light' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Style</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{generateFgpo.Style || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Color</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{generateFgpo.Color || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Order Qty</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{generateFgpo.OrderQuantity.toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{generateFgpo.CustomerName}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {generateFgpo && generateYields.length === 0 && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={goToStyleYieldsForGenerate}>
                    Configurar Style Yields
                  </Button>
                }
              >
                No existen Style Yields configurados para el Style {generateFgpo.Style || '-'}.
              </Alert>
            )}

            {generateFgpo && generateYields.length > 0 && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                  <FormControl size="small" required>
                    <InputLabel>UOM *</InputLabel>
                    <Select value={generateUom} label="UOM *" onChange={e => setGenerateUom(e.target.value)}>
                      {uomOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Allow %"
                    size="small"
                    type="number"
                    value={generateAllowance}
                    onChange={e => setGenerateAllowance(e.target.value)}
                  />
                  <TextField
                    label="Required Date"
                    size="small"
                    type="date"
                    value={generateRequiredDate}
                    onChange={e => setGenerateRequiredDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>

                {generatePending === 0 ? (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Esta FGPO ya tiene todos sus Fabric Requirements generados. No hay nuevos requerimientos por generar.
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    {generatePending === 1
                      ? '1 requerimiento nuevo será generado.'
                      : `${generatePending} requerimientos nuevos serán generados.`}
                  </Alert>
                )}

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Component', 'Yield', 'Gross Req.', 'Allow %', 'Allow Qty', 'Status'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generateRows.map(row => (
                      <TableRow key={row.componentId}>
                        <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                        <TableCell>{row.invalid ? '-' : row.yieldValue}</TableCell>
                        <TableCell>{row.gross != null ? row.gross.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</TableCell>
                        <TableCell>{row.invalid ? '-' : formatNumber(generateAllowanceValue)}</TableCell>
                        <TableCell>{row.allowQty != null ? row.allowQty.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={row.status}
                            color={(row.status === 'Se creará' ? 'success' : row.status === 'Ya existe' ? 'default' : 'error') as any}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={generating || !generateFgpoId || generateRows.length === 0 || generatePending === 0}
            >
              {generating ? <CircularProgress size={18} /> : `Generate (${generatePending})`}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FabricRequirement;


