import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Tab, Chip, CircularProgress, Alert
} from '@mui/material';
import {
  fgpoApi, ppSamplesApi, topSamplesApi, productionReadinessApi, cuttingReleasesApi,
  cuttingControlsApi, sewingProductionsApi, inlineQualitiesApi, aqlInspectionsApi,
  packingControlsApi, finishedGoodsApi, shipmentControlsApi, fabricRequirementsApi,
  trimsControlsApi, fabricPOsApi, millProductionsApi, millTestsApi, fabricShipmentsApi,
  fabricReceivingsApi, fourPointApi, internalTestsApi, shadeMatchesApi,
  fabricInventoriesApi, fabricReservationsApi,
} from '../../utils/api';

// ── helpers ────────────────────────────────────────────────
const pick = (o: any, camel: string, pascal: string) => o?.[camel] ?? o?.[pascal];
const num = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const fgpoIdOf = (o: any) => pick(o, 'fgpoId', 'FGPOId') ?? 0;
const fmtNum = (v: number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });

const latest = (rows: any[], fgpoId: number) => {
  const rs = rows.filter(r => fgpoIdOf(r) === fgpoId);
  if (rs.length === 0) return null;
  return rs.reduce((a, b) => {
    const at = pick(a, 'createdAt', 'CreatedAt') ?? '';
    const bt = pick(b, 'createdAt', 'CreatedAt') ?? '';
    return at >= bt ? a : b;
  });
};
const sumBy = (rows: any[], fgpoId: number, camel: string, pascal: string) =>
  rows.filter(r => fgpoIdOf(r) === fgpoId).reduce((s, r) => s + num(pick(r, camel, pascal)), 0);
const sumAll = (rows: any[], camel: string, pascal: string) =>
  rows.reduce((s, r) => s + num(pick(r, camel, pascal)), 0);

const statusChip = (s?: string) => {
  const m: Record<string, any> = {
    Approved: 'success', Passed: 'success', Ready: 'success', Accepted: 'success',
    Rejected: 'error', Failed: 'error', Blocked: 'error',
    'In Progress': 'info', Testing: 'info', 'In Transit': 'info', 'Partially Shipped': 'info',
    Pending: 'warning', 'On Hold': 'warning', 'Not Ready': 'warning', 'Ready with Conditions': 'warning',
  };
  return m[s ?? ''] ?? 'default';
};

const riskOf = (f: any, lateBy: number) => {
  const pending = num(pick(f, 'pendingProduction', 'PendingProduction'));
  if (lateBy > 0) return 'High';
  if (pending > 0) return 'Medium';
  const variance = num(pick(f, 'shipmentVariance', 'ShipmentVariance'));
  return variance < 0 ? 'Medium' : 'Low';
};

// ── componente ─────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [data, setData] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const names = {
          fgpos: fgpoApi, pp: ppSamplesApi, top: topSamplesApi, prr: productionReadinessApi,
          cutRel: cuttingReleasesApi, cutCtrl: cuttingControlsApi, sew: sewingProductionsApi,
          inline: inlineQualitiesApi, aql: aqlInspectionsApi, pack: packingControlsApi,
          fg: finishedGoodsApi, ship: shipmentControlsApi, fabReq: fabricRequirementsApi,
          trims: trimsControlsApi, fabPO: fabricPOsApi, millProd: millProductionsApi,
          millTest: millTestsApi, fabShip: fabricShipmentsApi, fabRec: fabricReceivingsApi,
          four: fourPointApi, intTest: internalTestsApi, shade: shadeMatchesApi,
          fabInv: fabricInventoriesApi, fabRes: fabricReservationsApi,
        };
        // Normaliza la respuesta: array directo, objeto paginado {items} o []
        const toArray = (d: any) => (Array.isArray(d) ? d : (d?.items ?? []));
        // allSettled: si un endpoint falla, el resto sigue cargando (ese módulo queda vacío)
        const settled = await Promise.allSettled(
          Object.values(names).map(a => a.getAll().then(r => toArray(r.data)))
        );
        const entries = settled.map(s => (s.status === 'fulfilled' ? s.value : []));
        const obj: any = {};
        Object.keys(names).forEach((k, i) => { obj[k] = entries[i]; });
        setData(obj);
      } catch (err: any) { setError(err?.response?.data?.message || 'Failed to load dashboard data.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const fgpos = data.fgpos.filter((f: any) => pick(f, 'active', 'Active') !== false);

  // ---- MASTER DASHBOARD ----
  const totalOrder = sumAll(fgpos, 'orderQuantity', 'OrderQuantity');
  const totalCut = sumAll(data.cutCtrl, 'goodCut', 'GoodCut');
  const totalSew = sumAll(data.sew, 'dailyOutput', 'DailyOutput');
  const totalPacked = sumAll(data.pack, 'packedQty', 'PackedQty');
  const totalInTransit = sumAll(data.ship, 'inTransitQty', 'InTransitQty');
  const totalReceived = sumAll(data.ship, 'customerReceivedQty', 'CustomerReceivedQty');

  const masterCards = [
    { label: 'Open FGPO', value: fgpos.length, color: 'primary.main' },
    { label: 'Order Quantity', value: totalOrder, color: 'primary.main' },
    { label: 'Cut Quantity', value: totalCut, color: 'success.main' },
    { label: 'Sewing Output', value: totalSew, color: 'info.main' },
    { label: 'Packed Quantity', value: totalPacked, color: 'warning.main' },
    { label: 'In Transit', value: totalInTransit, color: 'info.main' },
    { label: 'Customer Received', value: totalReceived, color: 'success.main' },
  ];

  const masterRows = fgpos.map((f: any) => {
    const fid = pick(f, 'id', 'ID') ?? fgpoIdOf(f);
    const fg = data.fg.filter((x: any) => fgpoIdOf(x) === fid);
    const sh = data.ship.filter((x: any) => fgpoIdOf(x) === fid);
    const shipDate = sh.map((s: any) => pick(s, 'etd', 'ETD') ?? '').filter(Boolean).sort().pop() ?? '';
    const late = shipDate ? (new Date(shipDate).getTime() - Date.now()) / 86400000 : 999;
    const aql = latest(data.aql.filter((x: any) => (pick(x, 'inspectionType', 'InspectionType') ?? '') === 'Final'), fid);
    return {
      f: fid,
      fgpo: pick(f, 'fgpoNumber', 'FGPONumber') ?? '',
      style: pick(f, 'style', 'Style') ?? '',
      color: pick(f, 'color', 'Color') ?? '',
      orderQty: num(pick(f, 'orderQuantity', 'OrderQuantity')),
      fabricStatus: latest(data.fabReq, fid) ? (pick(latest(data.fabReq, fid), 'status', 'Status') ?? '') : '',
      trimsStatus: latest(data.trims, fid) ? (pick(latest(data.trims, fid), 'approvalStatus', 'ApprovalStatus') ?? '') : '',
      ppSample: latest(data.pp, fid) ? (pick(latest(data.pp, fid), 'status', 'Status') ?? '') : '',
      prr: latest(data.prr, fid) ? (pick(latest(data.prr, fid), 'overallResult', 'OverallResult') ?? '') : '',
      cutRelease: latest(data.cutRel, fid) ? (pick(latest(data.cutRel, fid), 'releaseStatus', 'ReleaseStatus') ?? '') : '',
      cutQty: sumBy(data.cutCtrl, fid, 'goodCut', 'GoodCut'),
      topSample: latest(data.top, fid) ? (pick(latest(data.top, fid), 'status', 'Status') ?? '') : '',
      sewQty: sumBy(data.sew, fid, 'dailyOutput', 'DailyOutput'),
      inlineQc: latest(data.inline, fid) ? (pick(latest(data.inline, fid), 'result', 'Result') ?? '') : '',
      finalQc: aql ? (pick(aql, 'result', 'Result') ?? '') : '',
      packedQty: sumBy(data.pack, fid, 'packedQty', 'PackedQty'),
      readyToShip: fg.reduce((s: number, g: any) => s + num(pick(g, 'readyToShipQty', 'ReadyToShipQty')), 0),
      inTransit: sh.reduce((s: number, g: any) => s + num(pick(g, 'inTransitQty', 'InTransitQty')), 0),
      receivedQty: sh.reduce((s: number, g: any) => s + num(pick(g, 'customerReceivedQty', 'CustomerReceivedQty')), 0),
      shipVariance: num(pick(f, 'shipmentVariance', 'ShipmentVariance')),
      shipDate,
      risk: riskOf(f, late),
      updated: pick(f, 'updatedAt', 'UpdatedAt') ?? pick(f, 'createdAt', 'CreatedAt') ?? '',
    };
  });

  // ---- FABRIC DASHBOARD ----
  const totalFabInTransit = sumAll(data.fabShip, 'inTransitQuantity', 'InTransitQuantity');
  const totalFabReceived = sumAll(data.fabRec, 'actualReceivedQty', 'ActualReceivedQty');
  const totalFabApproved = sumAll(data.fabInv, 'approvedQuantity', 'ApprovedQuantity');
  const totalShortage = sumAll(data.fabInv, 'shortageQuantity', 'ShortageQuantity');

  const fabricCards = [
    { label: 'Total FGPO', value: fgpos.length, color: 'primary.main' },
    { label: 'Total Order Qty', value: totalOrder, color: 'primary.main' },
    { label: 'Fabric In Transit', value: totalFabInTransit, color: 'info.main' },
    { label: 'Fabric Received', value: totalFabReceived, color: 'success.main' },
    { label: 'Fabric Approved', value: totalFabApproved, color: 'success.main' },
    { label: 'Open Shortage', value: totalShortage, color: 'error.main' },
  ];

  const fabricRows = fgpos.map((f: any) => {
    const fid = pick(f, 'id', 'ID') ?? fgpoIdOf(f);
    const allocated = data.fabPO
      .flatMap((p: any) => (pick(p, 'fgpos', 'Fgpos') ?? []).map((x: any) => ({ ...x, po: p })))
      .filter((x: any) => fgpoIdOf(x) === fid)
      .reduce((s: number, x: any) => s + num(pick(x, 'allocatedQuantity', 'AllocatedQuantity')), 0);
    return {
      f: fid,
      customer: pick(f, 'customerName', 'CustomerName') ?? '',
      fgpo: pick(f, 'fgpoNumber', 'FGPONumber') ?? '',
      status: pick(f, 'status', 'Status') ?? '',
      style: pick(f, 'style', 'Style') ?? '',
      color: pick(f, 'color', 'Color') ?? '',
      orderQty: num(pick(f, 'orderQuantity', 'OrderQuantity')),
      shipVariance: num(pick(f, 'shipmentVariance', 'ShipmentVariance')),
      fabRequired: sumBy(data.fabReq, fid, 'netPurchaseRequirement', 'NetPurchaseRequirement'),
      fabOrdered: allocated,
      millProduced: sumBy(data.millProd, fid, 'producedQuantity', 'ProducedQuantity'),
      millTest: latest(data.millTest, fid) ? (pick(latest(data.millTest, fid), 'testResult', 'TestResult') ?? '') : '',
      fabExported: sumBy(data.fabShip, fid, 'shippedQuantity', 'ShippedQuantity'),
      fabInTransit: sumBy(data.fabShip, fid, 'inTransitQuantity', 'InTransitQuantity'),
      fabReceived: sumBy(data.fabRec, fid, 'actualReceivedQty', 'ActualReceivedQty'),
      recVariance: sumBy(data.fabRec, fid, 'receivingVariance', 'ReceivingVariance'),
      fourPoint: latest(data.four, fid) ? (pick(latest(data.four, fid), 'result', 'Result') ?? '') : '',
      intTest: latest(data.intTest, fid) ? (pick(latest(data.intTest, fid), 'testResult', 'TestResult') ?? '') : '',
      shade: latest(data.shade, fid) ? (pick(latest(data.shade, fid), 'overallResult', 'OverallResult') ?? '') : '',
      fabApproved: sumBy(data.fabInv, fid, 'approvedQuantity', 'ApprovedQuantity'),
      reserved: sumBy(data.fabRes, fid, 'reservedQuantity', 'ReservedQuantity'),
      issued: sumBy(data.fabInv, fid, 'issuedQuantity', 'IssuedQuantity'),
      available: sumBy(data.fabInv, fid, 'availableQuantity', 'AvailableQuantity'),
      shortage: sumBy(data.fabInv, fid, 'shortageQuantity', 'ShortageQuantity'),
    };
  });

  const hd = (label: string) => <TableCell key={label} sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'grey.100' }}>{label}</TableCell>;

  const masterHeaders = ['FGPO', 'Style', 'Color', 'Order Qty', 'Fabric', 'Trims', 'PP Sample', 'PRR', 'Cut Release', 'Cut Qty', 'TOP Sample', 'Sewing Qty', 'Inline QC', 'Final QC', 'Packed', 'Ready', 'In Transit', 'Received', 'Ship Var', 'Ship Date', 'Risk', 'Updated'];

  const fabricHeaders = ['Customer', 'FGPO', 'Status', 'Style', 'Color', 'Order Qty', 'Ship Var', 'Fabric Req.', 'Fabric Ord.', 'Mill Prod.', 'Mill Test', 'Exported', 'In Transit', 'Received', 'Rec Var', 'Four-Point', 'Int. Test', 'Shade', 'Approved', 'Reserved', 'Issued', 'Available', 'Shortage'];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {tab === 0 ? 'TEXNICA PRODUCTION CONTROL SYSTEM - MASTER DASHBOARD' : 'TEXNICA TPCS 1.0 - FGPO & FABRIC CONTROL DASHBOARD'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visibilidad de órdenes de cliente desde desarrollo de material hasta embarque. Resumen automático por FGPO.
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ overflow: 'hidden', borderTop: 4, borderColor: 'primary.main' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', px: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v as number)} indicatorColor="primary" textColor="primary">
            <Tab label="Master Dashboard" sx={{ fontWeight: 'bold' }} />
            <Tab label="Fabric Dashboard" sx={{ fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        {/* KPI cards */}
        <Box sx={{ display: 'flex', gap: 2, p: 2, flexWrap: 'wrap' }}>
          {(tab === 0 ? masterCards : fabricCards).map(c => (
            <Paper key={c.label} elevation={1} sx={{ p: 2, minWidth: 150, flex: 1, borderTop: 4, borderColor: c.color }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{c.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: c.color }}>{fmtNum(c.value)}</Typography>
            </Paper>
          ))}
        </Box>

        {/* Tables */}
        <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
          <Table stickyHeader size="small" sx={{ '& th, & td': { border: '1px solid #e0e0e0' } }}>
            <TableHead>
              <TableRow>
                {(tab === 0 ? masterHeaders : fabricHeaders).map(hd)}
              </TableRow>
            </TableHead>
            <TableBody>
              {tab === 0 ? (
                masterRows.length === 0 ? (
                  <TableRow><TableCell colSpan={masterHeaders.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>No FGPO data.</TableCell></TableRow>
                ) : masterRows.map((r: any) => (
                  <TableRow key={r.f} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.fgpo}</TableCell>
                    <TableCell>{r.style || '-'}</TableCell>
                    <TableCell>{r.color || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.orderQty)}</TableCell>
                    <TableCell align="center">{r.fabricStatus ? <Chip label={r.fabricStatus} size="small" color={statusChip(r.fabricStatus)} variant="outlined" /> : '-'}</TableCell>
                    <TableCell align="center">{r.trimsStatus || '-'}</TableCell>
                    <TableCell align="center">{r.ppSample || '-'}</TableCell>
                    <TableCell align="center">{r.prr || '-'}</TableCell>
                    <TableCell align="center">{r.cutRelease || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.cutQty)}</TableCell>
                    <TableCell align="center">{r.topSample || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.sewQty)}</TableCell>
                    <TableCell align="center">{r.inlineQc || '-'}</TableCell>
                    <TableCell align="center">{r.finalQc || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.packedQty)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: 'success.main' }}>{fmtNum(r.readyToShip)}</TableCell>
                    <TableCell align="center">{fmtNum(r.inTransit)}</TableCell>
                    <TableCell align="center">{fmtNum(r.receivedQty)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: r.shipVariance < 0 ? 'error.main' : 'success.main' }}>{fmtNum(r.shipVariance)}</TableCell>
                    <TableCell align="center">{r.shipDate ? r.shipDate.slice(0, 10) : '-'}</TableCell>
                    <TableCell align="center"><Chip label={r.risk} size="small" color={r.risk === 'High' ? 'error' : r.risk === 'Medium' ? 'warning' : 'success'} /></TableCell>
                    <TableCell align="center">{r.updated ? r.updated.slice(0, 10) : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                fabricRows.length === 0 ? (
                  <TableRow><TableCell colSpan={fabricHeaders.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>No FGPO data.</TableCell></TableRow>
                ) : fabricRows.map((r: any) => (
                  <TableRow key={r.f} hover>
                    <TableCell>{r.customer}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.fgpo}</TableCell>
                    <TableCell align="center">{r.status || '-'}</TableCell>
                    <TableCell>{r.style || '-'}</TableCell>
                    <TableCell>{r.color || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.orderQty)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: r.shipVariance < 0 ? 'error.main' : 'success.main' }}>{fmtNum(r.shipVariance)}</TableCell>
                    <TableCell align="center">{fmtNum(r.fabRequired)}</TableCell>
                    <TableCell align="center">{fmtNum(r.fabOrdered)}</TableCell>
                    <TableCell align="center">{fmtNum(r.millProduced)}</TableCell>
                    <TableCell align="center">{r.millTest || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.fabExported)}</TableCell>
                    <TableCell align="center">{fmtNum(r.fabInTransit)}</TableCell>
                    <TableCell align="center">{fmtNum(r.fabReceived)}</TableCell>
                    <TableCell align="center">{fmtNum(r.recVariance)}</TableCell>
                    <TableCell align="center">{r.fourPoint || '-'}</TableCell>
                    <TableCell align="center">{r.intTest || '-'}</TableCell>
                    <TableCell align="center">{r.shade || '-'}</TableCell>
                    <TableCell align="center">{fmtNum(r.fabApproved)}</TableCell>
                    <TableCell align="center">{fmtNum(r.reserved)}</TableCell>
                    <TableCell align="center">{fmtNum(r.issued)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: 'success.main' }}>{fmtNum(r.available)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: r.shortage > 0 ? 'error.main' : 'inherit' }}>{fmtNum(r.shortage)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard;
