import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Chip, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { fgpoApi, fgpoLinesApi } from '../../utils/api';

interface FgpoDetail {
  ID: number;
  FGPONumber: string;
  TemporaryNumber?: string;
  Status?: string;
  CustomerName: string;
  OrderQuantity: number;
  DeliveryDate: string;
  InTransitQty: number;
  ReceivedQty: number;
  TotalShippedQty: number;
  ProducedQty: number;
  PendingProduction: number;
  DataOwnerName?: string;
  Remarks?: string;
}


interface LineRow {
  styleCode: string;
  colorName: string;
  sizeCode: string;
  quantity: number;
  unitPrice?: number;
}

const sc = (s: string) => {
  const m: Record<string, any> = {
    Completed: 'success', Approved: 'success', 'In Progress': 'info', 'Partially Completed': 'primary',
    Pending: 'warning', 'On Hold': 'warning', Cancelled: 'error', Rejected: 'error', 'FGPO Pending': 'warning',
  };
  return m[s] ?? 'default';
};

const PurchaseOrder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fgpo, setFgpo] = useState<FgpoDetail | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) { setError('No FGPO id.'); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const [f, l] = await Promise.all([
          fgpoApi.getById(Number(id)),
          fgpoLinesApi.getByFgpo(Number(id)),
        ]);
        const raw = f.data ?? f;
        setFgpo({
          ID: raw.id ?? raw.ID,
          FGPONumber: raw.fgpoNumber ?? raw.FGPONumber ?? '',
          TemporaryNumber: raw.temporaryNumber ?? raw.TemporaryNumber ?? '',
          Status: raw.status ?? raw.Status ?? '',
          CustomerName: raw.customerName ?? raw.CustomerName ?? '',
          OrderQuantity: raw.orderQuantity ?? raw.OrderQuantity ?? 0,
          DeliveryDate: raw.deliveryDate ?? raw.DeliveryDate ?? '',
          InTransitQty: raw.inTransitQty ?? raw.InTransitQty ?? 0,
          ReceivedQty: raw.receivedQty ?? raw.ReceivedQty ?? 0,
          TotalShippedQty: raw.totalShippedQty ?? raw.TotalShippedQty ?? 0,
          ProducedQty: raw.producedQty ?? raw.ProducedQty ?? 0,
          PendingProduction: raw.pendingProduction ?? raw.PendingProduction ?? 0,
          DataOwnerName: raw.dataOwnerName ?? raw.DataOwnerName ?? '',
          Remarks: raw.remarks ?? raw.Remarks ?? '',
        });
        setLines((l.data ?? []).map((x: any) => ({
          styleCode: x.styleCode ?? x.StyleCode ?? '',
          colorName: x.colorName ?? x.ColorName ?? '',
          sizeCode: x.sizeCode ?? x.SizeCode ?? '',
          quantity: x.quantity ?? x.Quantity ?? 0,
          unitPrice: x.unitPrice ?? x.UnitPrice ?? undefined,
        })));
      } catch (err: any) { setError(err?.response?.data?.message || 'Failed to load FGPO.'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const InfoBox: React.FC<{ title: string; content: string }> = ({ title, content }) => (
    <Box sx={{ border: 1, borderColor: 'primary.main', p: 1.5, borderRadius: 1, height: '100%', bgcolor: 'white' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'block', mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{content}</Typography>
    </Box>
  );

  const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Box sx={{ border: 1, borderColor: 'grey.300', height: '100%' }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 0.5, textAlign: 'center', borderBottom: 1, borderColor: 'grey.400' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{label}</Typography>
      </Box>
      <Box sx={{ p: 0.5, textAlign: 'center', bgcolor: 'white' }}>
        <Typography variant="body2">{value || '\u00A0'}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1000, bgcolor: 'white' }}>
        {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button variant="outlined" onClick={() => navigate('/fgpo')}>Back to FGPOs</Button>
          </Box>
        ) : fgpo && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: 2, borderColor: 'black', pb: 1 }}>
              <Typography variant="h4"><Box component="span" sx={{ fontWeight: 900 }}>FGPO</Box> {fgpo.FGPONumber}</Typography>
              <Chip label={fgpo.Status || 'N/A'} color={sc(fgpo.Status ?? '')} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2 }}>Customer: {fgpo.CustomerName || '-'}</Typography>

            <Grid container spacing={1} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="FGPO NUMBER" value={fgpo.FGPONumber} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="DELIVERY DATE" value={fgpo.DeliveryDate ? fgpo.DeliveryDate.slice(0, 10) : '-'} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="ORDER QTY" value={String(fgpo.OrderQuantity)} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="PRODUCED" value={String(fgpo.ProducedQty)} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="IN TRANSIT" value={String(fgpo.InTransitQty)} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="RECEIVED" value={String(fgpo.ReceivedQty)} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="SHIPPED" value={String(fgpo.TotalShippedQty)} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><MetaItem label="PENDING PROD." value={String(fgpo.PendingProduction)} /></Grid>
            </Grid>

            <InfoBox title="DATA OWNER" content={fgpo.DataOwnerName || '-'} />
            {fgpo.Remarks && <Box sx={{ mt: 2 }}><InfoBox title="REMARKS" content={fgpo.Remarks} /></Box>}

            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 3, mb: 1 }}>Lines (Style / Color / Size)</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small" sx={{ '& th, & td': { border: 1, borderColor: 'grey.300', p: 1 } }}>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell align="left" sx={{ fontWeight: 'bold', color: 'primary.main' }}>STYLE</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 'bold', color: 'primary.main' }}>COLOR</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 'bold', color: 'primary.main' }}>SIZE</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>QTY</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>UNIT PRICE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>No lines registered.</TableCell></TableRow>
                  ) : lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>{line.styleCode || '-'}</TableCell>
                      <TableCell>{line.colorName || '-'}</TableCell>
                      <TableCell>{line.sizeCode || '-'}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{line.unitPrice != null ? line.unitPrice.toFixed(4) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/fgpo')}>Back to FGPOs</Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default PurchaseOrder;
