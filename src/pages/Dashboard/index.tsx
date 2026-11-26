import React, { useState, useEffect, useContext } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Tab, Chip, CircularProgress, Alert,
  Pagination,
} from '@mui/material';
import {
  fgpoApi, ppSamplesApi, topSamplesApi, productionReadinessApi, cuttingReleasesApi,
  cuttingControlsApi, sewingProductionsApi, inlineQualitiesApi, aqlInspectionsApi,
  packingControlsApi, shipmentControlsApi, fabricRequirementsApi,
  trimsControlsApi, fabricPOsApi, millProductionsApi, millTestsApi, fabricShipmentsApi,
  fabricReceivingsApi, fourPointApi, internalTestsApi, shadeMatchesApi,
  fabricInventoriesApi, fabricReservationsApi,
} from '../../utils/api';
import { AuthContext } from '../../context/AuthContextValue';
import AdminDashboard from './AdminDashboard';
import { FgpoTimeline } from '../../types';

const MASTER_PAGE_SIZE = 5;

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

const riskOf = (f: any, lateBy: number) => {
  const pending = num(pick(f, 'pendingProduction', 'PendingProduction'));
  if (lateBy > 0) return 'High';
  if (pending > 0) return 'Medium';
  const variance = num(pick(f, 'shipmentVariance', 'ShipmentVariance'));
  return variance < 0 ? 'Medium' : 'Low';
};

// ── componente ─────────────────────────────────────────────
const MasterDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [masterPage, setMasterPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [data, setData] = useState<any>({});

  const [timelineByFgpo, setTimelineByFgpo] = useState<Record<number, { timeline?: FgpoTimeline; error?: string; loading: boolean }>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const names = {
          fgpos: fgpoApi, pp: ppSamplesApi, top: topSamplesApi, prr: productionReadinessApi,
          cutRel: cuttingReleasesApi, cutCtrl: cuttingControlsApi, sew: sewingProductionsApi,
          inline: inlineQualitiesApi, aql: aqlInspectionsApi, pack: packingControlsApi,
          ship: shipmentControlsApi, fabReq: fabricRequirementsApi,
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

  useEffect(() => {
    const fgpos = (data.fgpos ?? []).filter((f: any) => pick(f, 'active', 'Active') !== false);
    const ids = fgpos.slice((masterPage - 1) * MASTER_PAGE_SIZE, masterPage * MASTER_PAGE_SIZE)
      .map((f: any) => pick(f, 'id', 'ID') ?? fgpoIdOf(f));
    if (ids.length === 0) return;

    let cancelled = false;
    setTimelineByFgpo(current => ({
      ...current,
      ...Object.fromEntries(ids.map((id: number) => [id, { loading: true }])),
    }));

    const loadTimelines = async () => {
      const results = await Promise.all(ids.map(async (id: number) => {
        try {
          const res = await fgpoApi.getTimeline(id);
          return [id, { timeline: res.data ?? res, loading: false }] as const;
        } catch (err: any) {
          return [id, { error: err?.response?.data?.message || err?.message || 'Could not load timeline.', loading: false }] as const;
        }
      }));
      if (!cancelled) setTimelineByFgpo(current => ({ ...current, ...Object.fromEntries(results) }));
    };

    loadTimelines();
    return () => { cancelled = true; };
  }, [data.fgpos, masterPage]);

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
      readyToShip: sumBy(data.pack, fid, 'readyToShipQty', 'ReadyToShipQty'),
      inTransit: sh.reduce((s: number, g: any) => s + num(pick(g, 'inTransitQty', 'InTransitQty')), 0),
      receivedQty: sh.reduce((s: number, g: any) => s + num(pick(g, 'customerReceivedQty', 'CustomerReceivedQty')), 0),
      shipVariance: num(pick(f, 'shipmentVariance', 'ShipmentVariance')),
      shipDate,
      risk: riskOf(f, late),
      updated: pick(f, 'updatedAt', 'UpdatedAt') ?? pick(f, 'createdAt', 'CreatedAt') ?? '',
    };
  });
  const masterPageCount = Math.max(1, Math.ceil(masterRows.length / MASTER_PAGE_SIZE));
  const visibleMasterRows = masterRows.slice((masterPage - 1) * MASTER_PAGE_SIZE, masterPage * MASTER_PAGE_SIZE);

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

  const fabricHeaders = ['Customer', 'FGPO', 'Status', 'Style', 'Color', 'Order Qty', 'Ship Var', 'Fabric Req.', 'Fabric Ord.', 'Mill Prod.', 'Mill Test', 'Exported', 'In Transit', 'Received', 'Rec Var', 'Four-Point', 'Int. Test', 'Shade', 'Approved', 'Reserved', 'Issued', 'Available', 'Shortage'];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {tab === 0 ? 'TEXNICA PRODUCTION CONTROL SYSTEM - MASTER DASHBOARD' : 'TEXNICA TPCS 1.0 - FGPO & FABRIC CONTROL DASHBOARD'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visibility of customer orders from material development through shipment. Automatic summary by FGPO. · v0.0.3-test
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

        {tab === 0 ? (
          <Box sx={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', p: 2, display: 'grid', gap: 2 }}>
            {masterRows.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No FGPO data.</Typography>
            ) : visibleMasterRows.map((r: any) => {
              const timelineState = timelineByFgpo[r.f];
              return (
                <Paper key={r.f} variant="outlined" sx={{ p: 2, overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{r.fgpo}</Typography>
                      <Typography variant="body2" color="text.secondary">{r.style || '-'} / {r.color || '-'} · Order {fmtNum(r.orderQty)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label={`Risk: ${r.risk}`} color={r.risk === 'High' ? 'error' : r.risk === 'Medium' ? 'warning' : 'success'} />
                      <Typography variant="caption" color="text.secondary">Ship date: {r.shipDate ? r.shipDate.slice(0, 10) : '-'} · Updated: {r.updated ? r.updated.slice(0, 10) : '-'}</Typography>
                    </Box>
                  </Box>
                  {timelineState?.loading || !timelineState ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                  ) : timelineState.error ? (
                    <Alert severity="error">{timelineState.error}</Alert>
                  ) : timelineState.timeline ? (
                    <>
                      {timelineState.timeline.customerProvidedFabric && (
                        <Alert severity="info" sx={{ mb: 2 }}>Customer-provided fabric — supply steps skipped.</Alert>
                      )}
                      <Box sx={{ overflowX: 'auto', pb: 1 }}>
                        <Box sx={{ display: 'flex', minWidth: timelineState.timeline.steps.length * 145, px: 1 }}>
                          {timelineState.timeline.steps.map((step, index) => {
                            const color = step.status === 'done' ? 'success.main'
                              : step.status === 'active' ? 'primary.main'
                              : step.status === 'not_applicable' ? 'text.disabled'
                              : 'grey.400';
                            const detail = step.detail
                              ? step.detail
                              : step.status === 'pending' ? 'Pending'
                                : step.status === 'active' ? 'In progress'
                                  : step.status === 'not_applicable' ? 'Not applicable'
                                    : step.date ? new Date(step.date).toLocaleDateString() : '-';
                            return (
                              <Box key={step.step} sx={{ flex: '1 0 145px', minWidth: 145, position: 'relative' }}>
                                {index < timelineState.timeline!.steps.length - 1 && (
                                  <Box sx={{ position: 'absolute', top: 7, left: 14, right: 0, height: 2, bgcolor: 'grey.300' }} />
                                )}
                                <Box sx={{
                                  position: 'relative', zIndex: 1, width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                  bgcolor: color, border: step.status === 'pending' ? '2px solid #bdbdbd' : '3px solid',
                                  borderColor: step.status === 'pending' ? '#bdbdbd' : 'background.paper', boxSizing: 'border-box',
                                }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  {step.step}
                                  {step.quantity != null && (
                                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700, ml: 0.5 }}>
                                      · {step.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}{step.unit ? ` ${step.unit}` : ''}
                                    </Box>
                                  )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{detail}</Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    Shipment variance: <Box component="span" sx={{ fontWeight: 700, color: r.shipVariance < 0 ? 'error.main' : 'success.main' }}>{fmtNum(r.shipVariance)}</Box>
                  </Typography>
                </Paper>
              );
            })}
            {masterPageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gridColumn: '1 / -1', pt: 1 }}>
                <Pagination
                  count={masterPageCount}
                  page={masterPage}
                  onChange={(_, value) => setMasterPage(value)}
                  color="primary"
                  aria-label="Master Dashboard pages"
                />
              </Box>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
            <Table stickyHeader size="small" sx={{ '& th, & td': { border: '1px solid #e0e0e0' } }}>
              <TableHead>
                <TableRow>{fabricHeaders.map(hd)}</TableRow>
              </TableHead>
              <TableBody>
                {fabricRows.length === 0 ? (
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
                }
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </Paper>

    </Box>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const role = (user?.roleName ?? '').trim().toLowerCase();
  if (role === 'super admin' || role === 'administrador tpcs') {
    return <AdminDashboard />;
  }
  return <MasterDashboard />;
};

export default Dashboard;
