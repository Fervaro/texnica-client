import { PackingFieldConfig } from '../types';

/**
 * FieldNo (1..4) → nombre de la propiedad de cantidad en el modelo/DTO
 * de PackingControl. El significado lo define la configuración por cliente.
 */
export const PACKING_FIELD_PROP: Record<number, string> = {
  1: 'qcPassedQty',
  2: 'receivedByPackingQty',
  3: 'foldedQty',
  4: 'polybaggedQty',
};

/**
 * Campos por defecto cuando el cliente NO tiene configuración sembrada:
 * se muestran siempre IRR 2nd (FieldNo 1) e IRR 3rd (FieldNo 2), y se
 * ocultan los campos 3 y 4. Si el cliente tiene configuración propia,
 * se respeta esa configuración.
 */
const DEFAULT_PACKING_FIELDS: PackingFieldConfig[] = [
  { id: -1, fieldNo: 1, label: 'IRR 2nd', visible: true },
  { id: -2, fieldNo: 2, label: 'IRR 3rd', visible: true },
  { id: -3, fieldNo: 3, label: 'Campo 3', visible: false },
  { id: -4, fieldNo: 4, label: 'Campo 4', visible: false },
];

/** Devuelve los campos visibles, ordenados por FieldNo (con default si no hay configuración). */
export const visiblePackingFields = (configs: PackingFieldConfig[]) => {
  const source = configs.length > 0 ? configs : DEFAULT_PACKING_FIELDS;
  return source.filter(c => c.visible).sort((a, b) => a.fieldNo - b.fieldNo);
};
