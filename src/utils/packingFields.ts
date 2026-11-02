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

/** Devuelve los campos visibles, ordenados por FieldNo. */
export const visiblePackingFields = (configs: PackingFieldConfig[]) =>
  configs.filter(c => c.visible).sort((a, b) => a.fieldNo - b.fieldNo);
