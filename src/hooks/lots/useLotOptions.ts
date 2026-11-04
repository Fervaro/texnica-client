import { useCallback, useEffect, useState } from 'react';
import { lotsApi } from '../../utils/api';
import { SelectOption } from '../../types';

/** Opciones de Lot para selects/autocompletes */
export const useLotOptions = () => {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lotsApi.getAll();
      setOptions((res.data ?? []).map((l: any) => ({
        id: l.id ?? l.ID,
        label: l.lotNumber ?? l.LotNumber ?? '',
        sub: l.fabricPONumber ?? l.FabricPONumber ?? '',
        fgpoId: l.fgpoId ?? l.FGPOId ?? 0,
      })));
    } catch { /* vacío */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { options, loading, reload };
};
