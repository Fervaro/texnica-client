import React, { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, InputAdornment, MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography, FormControl, InputLabel, Select
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { fabricPOsApi, fgpoApi } from '../../utils/api';
import { useComponentOptions } from '../../hooks/components/useComponentOptions';
import FabricPOFormDialog from './FabricPOFormDialog';
import type { FabricPO, FabricPOLine } from '../../types/fabricPO';
import { BUYER_NAME } from '../../types/fabricPO';

interface FgpoOption {
  ID: number;
  FGPONumber: string;
  CustomerName: string;
  Style?: string;
  Color?: string;
  OrderQuantity: number;
}

const poStatusOptions = [
  'Not Started', 'Pending', 'In Progress', 'Partially Completed', 'Completed',
  'Approved', 'Conditionally Approved', 'Rejected', 'On Hold', 'Closed', 'Cancelled'
];

const fmtQty = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v)
    ? '-'
    : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMoney = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v)
    ? '-'
    : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '-');

/** Normaliza la respuesta del backend (camelCase) al modelo de la UI. */
const mapFabricPO = (raw: any): FabricPO => ({
  id: raw.id ?? raw.ID,
  fabricPONumber: raw.fabricPONumber ?? raw.FabricPONumber ?? '',
  fgpos: (raw.fgpos ?? raw.Fgpos ?? []).map((f: any) => ({
    fgpoId: f.fgpoId ?? f.FGPOId ?? 0,
    fgpoNumber: f.fgpoNumber ?? f.FGPONumber ?? '',
    customerName: f.customerName ?? f.CustomerName ?? '',
    style: f.style ?? f.Style,
    color: f.color ?? f.Color,
    allocatedQuantity: f.allocatedQuantity ?? f.AllocatedQuantity ?? 0,
  })),
  lines: (raw.lines ?? raw.Lines ?? []).map((l: any): FabricPOLine => ({
    id: l.id ?? l.ID ?? 0,
    fabricPOId: l.fabricPOId ?? l.FabricPOId ?? 0,
    lineNumber: l.lineNumber ?? l.LineNumber ?? 0,
    fgpoId: l.fgpoId ?? l.FGPOId ?? 0,
    fgpoNumber: l.fgpoNumber ?? l.FGPONumber,
    fabricRequirementId: l.fabricRequirementId ?? l.FabricRequirementId,
    style: l.style ?? l.Style,
    color: l.color ?? l.Color,
    componentId: l.componentId ?? l.ComponentId,
    componentCode: l.componentCode ?? l.ComponentCode ?? l.category ?? l.Category,
    fabricName: l.fabricName ?? l.FabricName,
    yarn: l.yarn ?? l.Yarn,
    composition: l.composition ?? l.Composition,
    requiredWidth: l.requiredWidth ?? l.RequiredWidth,
    gsm: l.gsm ?? l.GSM ?? 0,
    quantity: l.quantity ?? l.Quantity ?? 0,
    unitPrice: l.unitPrice ?? l.UnitPrice ?? 0,
    amount: l.amount ?? l.Amount ?? 0,
    allowOverPurchase: l.allowOverPurchase ?? l.AllowOverPurchase ?? false,
    approval: l.approval ?? l.Approval,
    remarks: l.remarks ?? l.Remarks,
    uom: l.uom ?? l.UOM,
    active: l.active ?? l.Active ?? true,
    createdAt: l.createdAt ?? l.CreatedAt ?? '',
    updatedAt: l.updatedAt ?? l.UpdatedAt,
  })),
  lineCount: raw.lineCount ?? raw.LineCount ?? 0,
  fgpoCount: raw.fgpoCount ?? raw.FgpoCount ?? 0,
  componentSummary: raw.componentSummary ?? raw.ComponentSummary,
  commonUnitPrice: raw.commonUnitPrice ?? raw.CommonUnitPrice ?? null,
  supplierId: raw.supplierId ?? raw.SupplierId,
  supplierName: raw.supplierName ?? raw.SupplierName ?? raw.supplier ?? raw.Supplier,
  fabricMill: raw.fabricMill ?? raw.FabricMill,
  componentId: raw.componentId ?? raw.ComponentId,
  componentCode: raw.componentCode ?? raw.ComponentCode,
  orderedQuantity: raw.orderedQuantity ?? raw.OrderedQuantity ?? 0,
  uom: raw.uom ?? raw.UOM,
  unitPrice: raw.unitPrice ?? raw.UnitPrice ?? 0,
  poAmount: raw.poAmount ?? raw.POAmount ?? 0,
  orderDate: raw.orderDate ?? raw.OrderDate ?? '',
  requiredCompletion: raw.requiredCompletion ?? raw.RequiredCompletion ?? '',
  plannedExport: raw.plannedExport ?? raw.PlannedExport,
  plannedArrival: raw.plannedArrival ?? raw.PlannedArrival,
  poStatus: raw.poStatus ?? raw.POStatus,
  currency: raw.currency ?? raw.Currency,
  incoterm: raw.incoterm ?? raw.Incoterm,
  customerId: raw.customerId ?? raw.CustomerId,
  customerName: raw.customerName ?? raw.CustomerName,
  preparedBy: raw.preparedBy ?? raw.PreparedBy,
  checkedBy: raw.checkedBy ?? raw.CheckedBy,
  program: raw.program ?? raw.Program,
  paymentTerms: raw.paymentTerms ?? raw.PaymentTerms,
  purchaseOwnerUserId: raw.purchaseOwnerUserId ?? raw.PurchaseOwnerUserId,
  purchaseOwnerName: raw.purchaseOwnerName ?? raw.PurchaseOwnerName,
  approvedByUserId: raw.approvedByUserId ?? raw.ApprovedByUserId,
  approvedByName: raw.approvedByName ?? raw.ApprovedByName,
  remarks: raw.remarks ?? raw.Remarks,
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const FabricPO: React.FC = () => {
  const [items, setItems] = useState<FabricPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fgpoFilter, setFgpoFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [fabricComponentFilter, setFabricComponentFilter] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');

  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('desc');

  // Diálogos
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FabricPO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<FabricPO | null>(null);

  // id de la PO cuyo PDF se está descargando (para bloquear el botón)
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const [fgpos, setFgpos] = useState<FgpoOption[]>([]);
  const { options: componentList } = useComponentOptions();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, fgpoFilter, supplierFilter, fabricComponentFilter, poStatusFilter, sortBy, sortOrder]);

  useEffect(() => {
    const loadFgpos = async () => {
      try {
        const res = await fgpoApi.getAll();
        setFgpos((res.data ?? []).map((f: any) => ({
          ID: f.id ?? f.ID,
          FGPONumber: f.fgpoNumber ?? f.FGPONumber ?? '',
          CustomerName: f.customerName ?? f.CustomerName ?? '',
          Style: f.style ?? f.Style,
          Color: f.color ?? f.Color,
          OrderQuantity: f.orderQuantity ?? f.OrderQuantity ?? 0,
        })));
      } catch {
        /* El filtro por FGPO es opcional: si falla, la pantalla sigue usable. */
      }
    };
    void loadFgpos();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fabricPOsApi.getPaged({
        page: page + 1, pageSize,
        search: search || undefined, sortBy, sortOrder,
        fgpo: fgpoFilter || undefined,
        supplier: supplierFilter || undefined,
        fabricComponent: fabricComponentFilter || undefined,
        poStatus: poStatusFilter || undefined,
      });
      setItems((res.data.items || []).map(mapFabricPO));
      setTotalCount(res.data.totalCount ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || 'Failed to load Fabric PO records');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(0); setSearch(searchInput); };
  const handleClearSearch = () => { setSearchInput(''); setSearch(''); setPage(0); };

  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(0);
  };

  const openCreate = () => { setEditingItem(null); setFormOpen(true); };

  const openEdit = async (item: FabricPO) => {
    // Se recarga la PO completa para garantizar que las líneas estén al día
    try {
      const res = await fabricPOsApi.getById(item.id);
      setEditingItem(mapFabricPO(res.data));
    } catch {
      setEditingItem(item);
    }
    setFormOpen(true);
  };

  const openDetail = async (item: FabricPO) => {
    setDetailItem(item);
    setDetailOpen(true);
    try {
      const res = await fabricPOsApi.getById(item.id);
      setDetailItem(mapFabricPO(res.data));
    } catch {
      /* se conserva el detalle ya cargado */
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Fabric PO record?')) return;
    try {
      await fabricPOsApi.delete(id);
      setSuccess('Fabric PO deleted successfully.');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || 'Failed to delete Fabric PO record.');
    }
  };

  const handleSaved = async (message: string) => {
    setSuccess(message);
    setPage(0);
    await loadData();
    setTimeout(() => setSuccess(''), 5000);
  };

  /**
   * #32: descarga el PDF oficial generado por el backend.
   * No se recalcula nada en el frontend: sólo se solicita y se guarda el archivo.
   * El PDF respeta los mismos filtros por cliente que la vista (un ID de otro
   * Customer devuelve 404).
   */
  const handleDownloadPdf = async (item: FabricPO) => {
    setPdfLoadingId(item.id);
    setError('');
    try {
      const res = await fabricPOsApi.getPdf(item.id);

      // Nombre de archivo sugerido por el backend (Content-Disposition).
      let fileName = `FabricPO_${item.fabricPONumber || item.id}.pdf`;
      const disposition = res.headers?.['content-disposition'] as string | undefined;
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition ?? '');
      if (match?.[1]) {
        try { fileName = decodeURIComponent(match[1]); } catch { fileName = match[1]; }
      }

      const url = window.URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // Con responseType blob el error del backend llega como Blob: se lee como texto.
      let message = 'No fue posible generar el PDF de la Fabric Purchase Order.';
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = (await data.text()).trim().replace(/^"|"$/g, '');
          if (text) message = text;
        } catch { /* se conserva el mensaje genérico */ }
      } else if (typeof data === 'string' && data) {
        message = data;
      }
      setError(message);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed': case 'Approved': return 'success';
      case 'In Progress': case 'Partially Completed': return 'info';
      case 'Pending': case 'Not Started': case 'On Hold': case 'Conditionally Approved': return 'warning';
      case 'Rejected': case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const sortableHeader = (label: string, column: string) => (
    <TableCell
      sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => handleSort(column)}
    >
      {label}
      {sortBy === column && <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
    </TableCell>
  );

  /** #28: una FGPO muestra el código; varias muestran resumen con detalle en tooltip. */
  const renderFgpos = (item: FabricPO) => {
    const codes = item.fgpos.map(f => f.fgpoNumber).filter(Boolean);
    if (codes.length === 0) return '-';
    if (codes.length === 1) return codes[0];
    return (
      <Tooltip title={codes.join(', ')}>
        <span>{codes.length} FGPOs</span>
      </Tooltip>
    );
  };

  /** #28: precio común si todas las líneas coinciden; si no, "Multiple". */
  const renderUnitPrice = (item: FabricPO) => {
    if (item.commonUnitPrice === null || item.commonUnitPrice === undefined) {
      return item.lineCount > 1
        ? <Chip size="small" variant="outlined" label="Multiple" />
        : fmtMoney(item.unitPrice);
    }
    return fmtMoney(item.commonUnitPrice);
  };

  if (loading && items.length === 0) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Fabric PO</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search" size="small" value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flexGrow: 1, minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>Search</Button>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>FGPO</InputLabel>
            <Select value={fgpoFilter} label="FGPO" onChange={e => { setFgpoFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {fgpos.map(f => <MenuItem key={f.ID} value={f.FGPONumber}>{f.FGPONumber}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            label="Supplier" size="small" value={supplierFilter}
            onChange={e => { setSupplierFilter(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Fabric Component</InputLabel>
            <Select
              value={fabricComponentFilter} label="Fabric Component"
              onChange={e => { setFabricComponentFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {componentList.map(c => <MenuItem key={c.id} value={c.label}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>PO Status</InputLabel>
            <Select
              value={poStatusFilter} label="PO Status"
              onChange={e => { setPoStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {poStatusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>
            New Fabric PO
          </Button>
        </Box>
      </Paper>

      {/* ── Listado ─────────────────────────────────────────────────── */}
      <Paper elevation={2} sx={{ p: 2, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>PO ID</TableCell>
                {sortableHeader('Fabric PO #', 'fabricponumber')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>FGPO(s)</TableCell>
                {sortableHeader('Supplier', 'supplier')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Component</TableCell>
                {sortableHeader('Ordered Qty', 'orderedquantity')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>UOM</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Unit Price</TableCell>
                {sortableHeader('PO Amount', 'poamount')}
                {sortableHeader('Order Date', 'orderdate')}
                {sortableHeader('Req. Completion', 'requiredcompletion')}
                {sortableHeader('Status', 'postatus')}
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {item.lines.some(l => l.allowOverPurchase) && (
                      <Tooltip title="Tiene líneas con sobrecompra">
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block', width: 8, height: 8, mr: 0.75,
                            borderRadius: '50%', bgcolor: 'error.main', verticalAlign: 'middle',
                          }}
                        />
                      </Tooltip>
                    )}
                    {item.fabricPONumber}
                  </TableCell>
                  <TableCell>{renderFgpos(item)}</TableCell>
                  <TableCell>{item.supplierName || '-'}</TableCell>
                  <TableCell>{item.componentSummary || '-'}</TableCell>
                  <TableCell align="right">{fmtQty(item.orderedQuantity)}</TableCell>
                  <TableCell>{item.uom || '-'}</TableCell>
                  <TableCell align="right">{renderUnitPrice(item)}</TableCell>
                  <TableCell align="right">
                    <Chip label={fmtMoney(item.poAmount)} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{fmtDate(item.orderDate)}</TableCell>
                  <TableCell>{fmtDate(item.requiredCompletion)}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.poStatus || 'N/A'} size="small"
                      color={getStatusColor(item.poStatus) as any} variant="outlined"
                    />
                  </TableCell>
                  {/*
                    Acciones en cuadrícula 2x2 (View/Download PDF · Edit/Delete).
                    Antes iban apiladas en vertical y eso hacía que cada fila fuera
                    ~2x más alta. No se añade gap: el propio padding de IconButton
                    (size="small") ya deja una separación uniforme de ~10px tanto en
                    horizontal como en vertical.
                  */}
                  <TableCell sx={{ py: 0.25 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, auto)',
                        justifyContent: 'center',
                        alignContent: 'center',
                        justifyItems: 'center',
                      }}
                    >
                      <Tooltip title="View">
                        <IconButton size="small" color="info" onClick={() => void openDetail(item)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Box component="span": el Tooltip necesita un hijo no deshabilitado
                          para poder mostrar el texto cuando el botón está cargando. */}
                      <Tooltip title="Download PDF">
                        <Box component="span" sx={{ display: 'flex' }}>
                          <IconButton
                            size="small" color="success"
                            disabled={pdfLoadingId === item.id}
                            onClick={() => void handleDownloadPdf(item)}
                          >
                            {pdfLoadingId === item.id
                              ? <CircularProgress size={20} color="inherit" />
                              : <DownloadIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Tooltip>

                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => void openEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => void handleDelete(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow><TableCell colSpan={13} align="center">No Fabric PO records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={totalCount} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize} onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="Rows per page:"
        />
      </Paper>

      {/* ── New / Edit ──────────────────────────────────────────────── */}
      <FabricPOFormDialog
        open={formOpen}
        editing={editingItem}
        onClose={() => setFormOpen(false)}
        onSaved={(msg) => void handleSaved(msg)}
      />

      {/* ── View: Header + Lines + Totals ───────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Fabric PO Detail — {detailItem?.fabricPONumber}
        </DialogTitle>
        <DialogContent dividers>
          {detailItem && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Header</Typography>
              <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: 'primary.light' }}>
                <Grid container spacing={2}>
                  {[
                    ['Fabric PO Number', detailItem.fabricPONumber],
                    ['Supplier', detailItem.supplierName || '-'],
                    ['Issue Date', fmtDate(detailItem.orderDate)],
                    ['Delivery', fmtDate(detailItem.requiredCompletion)],
                    ['Currency', detailItem.currency || '-'],
                    ['Buyer', BUYER_NAME],
                    ['Incoterm', detailItem.incoterm || '-'],
                    ['Customer', detailItem.customerName || '-'],
                    ['Prepared', detailItem.preparedBy || '-'],
                    ['Checked', detailItem.checkedBy || '-'],
                    ['Program', detailItem.program || '-'],
                    ['Payment Terms', detailItem.paymentTerms || '-'],
                    ['UOM', detailItem.uom || '-'],
                  ].map(([label, value]) => (
                    <Grid key={label} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{value}</Typography>
                    </Grid>
                  ))}
                  <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      <Chip
                        label={detailItem.poStatus || 'N/A'} size="small"
                        color={getStatusColor(detailItem.poStatus) as any} variant="outlined"
                      />
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Remarks</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{detailItem.remarks || '-'}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Lines ({detailItem.lines.length})
              </Typography>
              <TableContainer sx={{ maxHeight: 400, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['No.', 'FGPO', 'Style', 'Color', 'Category', 'Fabric / Yarn', 'Content',
                        'Width', 'GSM', 'Qty Yd', 'USD/Yd', 'Amount USD', 'Approval', 'Remarks'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailItem.lines.map(l => (
                      <TableRow key={l.id} hover>
                        <TableCell>{l.lineNumber}</TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{l.fgpoNumber || '-'}</TableCell>
                        <TableCell>{l.style || '-'}</TableCell>
                        <TableCell>{l.color || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.componentCode || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{l.fabricName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{l.yarn || '-'}</Typography>
                        </TableCell>
                        <TableCell>{l.composition || '-'}</TableCell>
                        <TableCell>{l.requiredWidth || '-'}</TableCell>
                        <TableCell align="right">{l.gsm || '-'}</TableCell>
                        <TableCell align="right">
                          {l.allowOverPurchase && (
                            <Tooltip title="Sobrecompra">
                              <Box component="span" sx={{ display: 'inline-block', width: 7, height: 7, mr: 0.5, borderRadius: '50%', bgcolor: 'error.main', verticalAlign: 'middle' }} />
                            </Tooltip>
                          )}
                          {fmtQty(l.quantity)}
                        </TableCell>
                        <TableCell align="right">{fmtMoney(l.unitPrice)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{fmtMoney(l.amount)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small" variant="outlined"
                            color={l.approval === 'Confirmed' ? 'success' : 'warning'}
                            label={l.approval || '-'}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>{l.remarks || ''}</TableCell>
                      </TableRow>
                    ))}
                    {detailItem.lines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} align="center" sx={{ py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Esta PO no tiene líneas registradas.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Paper elevation={0} sx={{ mt: 2, p: 2, backgroundColor: 'primary.light' }}>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Typography variant="body2"><strong>Total Qty:</strong> {fmtQty(detailItem.orderedQuantity)}</Typography>
                  <Typography variant="body2"><strong>Total Amount:</strong> {fmtMoney(detailItem.poAmount)}</Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {/* #32: mismo PDF que en el listado; el backend es la única fuente. */}
          <Button
            variant="outlined"
            startIcon={pdfLoadingId === detailItem?.id ? <CircularProgress size={16} /> : <DownloadIcon />}
            disabled={!detailItem || pdfLoadingId === detailItem?.id}
            onClick={() => detailItem && void handleDownloadPdf(detailItem)}
          >
            Download PDF
          </Button>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FabricPO;
