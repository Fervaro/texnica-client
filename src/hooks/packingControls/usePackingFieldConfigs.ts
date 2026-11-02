import { useCallback, useEffect, useState } from 'react';
import { packingFieldConfigsApi } from '../../utils/api';
import { PackingFieldConfig } from '../../types';

const map = (raw: any): PackingFieldConfig => ({
  id: raw.id ?? raw.ID ?? 0,
  fieldNo: raw.fieldNo ?? raw.FieldNo ?? 0,
  label: raw.label ?? raw.Label ?? '',
  visible: raw.visible ?? raw.Visible ?? true,
});

/**
 * Configuración de campos de cantidad por cliente (Packing Control).
 * Consume /api/packing-field-configs.
 */
export const usePackingFieldConfigs = () => {
  const [configs, setConfigs] = useState<PackingFieldConfig[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await packingFieldConfigsApi.getAll();
      setConfigs((res.data ?? []).map(map));
    } catch {
      setConfigs([]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { configs, refresh };
};
