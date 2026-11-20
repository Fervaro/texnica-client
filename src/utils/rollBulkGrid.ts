export interface RollBulkReceivingOption {
  id: number;
  label: string;
  supplier?: string;
  warehouseLocation?: string;
  fabricPONumber?: string;
  fgpoNumber?: string;
  customerName?: string;
}

export interface RollRowDraft {
  key: string;
  rollNumber: string;
  supplierRollNumber: string;
  lotNumber: string;
  shipmentLotId: number | null;
  color: string;
  grossWeight: string;
  netWeight: string;
  actualYardage: string;
  actualWidth: string;
  actualGSM: string;
  shadeGroup: string;
  damagedQty: string;
  condition: string;
  familyId: number | null;
  warehouseLocation: string;
  comments: string;
}

export const newKey = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const today = () => new Date().toISOString().split('T')[0];

const NEGATIVE_FIELDS: { key: keyof RollRowDraft; name: string }[] = [
  { key: 'grossWeight', name: 'Gross Weight' },
  { key: 'netWeight', name: 'Net Weight' },
  { key: 'actualYardage', name: 'Actual Yardage' },
  { key: 'actualWidth', name: 'Actual Width' },
  { key: 'actualGSM', name: 'Actual GSM' },
  { key: 'damagedQty', name: 'Damaged Qty' },
];

/** Crea una fila de rollo vacía (para grids embebidas). */
export const newRollRow = (opts: { lotNumber?: string; shipmentLotId?: number | null; color?: string; condition?: string; warehouseLocation?: string } = {}): RollRowDraft => ({
  key: newKey(),
  rollNumber: '',
  supplierRollNumber: '',
  lotNumber: opts.lotNumber ?? '',
  shipmentLotId: opts.shipmentLotId ?? null,
  color: opts.color ?? '',
  grossWeight: '',
  netWeight: '',
  actualYardage: '',
  actualWidth: '',
  actualGSM: '',
  shadeGroup: '',
  damagedQty: '',
  condition: opts.condition ?? 'Good',
  familyId: null,
  warehouseLocation: opts.warehouseLocation ?? '',
  comments: '',
});

/** Valida las filas: devuelve un mensaje de error o '' si todo está bien. */
export const validateRollRows = (rows: RollRowDraft[]): string => {
  const errs: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (!row.rollNumber.trim()) errs.push(`Row ${index + 1}: Roll Number is required.`);
    else {
      const key = row.rollNumber.trim().toLowerCase();
      if (seen.has(key)) errs.push(`Row ${index + 1}: Roll Number "${row.rollNumber.trim()}" duplicated.`);
      seen.add(key);
    }
    for (const field of NEGATIVE_FIELDS) {
      if (Number(row[field.key]) < 0) errs.push(`Row ${index + 1}: ${field.name} cannot be negative.`);
    }
  });
  return errs.length ? errs.slice(0, 6).join(' | ') + (errs.length > 6 ? ' …' : '') : '';
};

/** Construye el payload del endpoint de alta masiva de rollos. */
export const buildRollsPayload = (receivingId: number, rows: RollRowDraft[], receivedDate: string, shipmentLotId?: number | null) => ({
  rolls: rows.map(row => ({
    receivingId,
    shipmentLotId: row.shipmentLotId ?? shipmentLotId ?? null,
    color: row.color || null,
    lotNumber: row.lotNumber || null,
    rollNumber: row.rollNumber.trim(),
    supplierRollNumber: row.supplierRollNumber || null,
    grossWeight: Number(row.grossWeight) || 0,
    netWeight: Number(row.netWeight) || 0,
    actualYardage: Number(row.actualYardage) || 0,
    actualWidth: Number(row.actualWidth) || 0,
    actualGSM: Number(row.actualGSM) || 0,
    shadeGroup: row.shadeGroup || null,
    damagedQty: Number(row.damagedQty) || 0,
    condition: row.condition,
    familyId: row.familyId,
    warehouseLocation: row.warehouseLocation || null,
    receivedDate: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
    comments: row.comments || null,
  })),
});
