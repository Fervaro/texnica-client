import { useEffect, useState } from 'react';
import { packingControlsApi } from '../../utils/api';

export interface WarehouseFgpo {
  fgpoId: number;
  fgpoNumber: string;
}

/** FGPOs que tienen cajas de empaque por enviar (para el selector de New Shipment). */
export const useWarehouseFgpos = () => {
  const [fgpos, setFgpos] = useState<WarehouseFgpo[]>([]);

  useEffect(() => {
    packingControlsApi.getWarehouseFgpos()
      .then(res => setFgpos((res.data ?? []).map((r: any): WarehouseFgpo => ({
        fgpoId: r.fgpoId ?? r.FgpoId ?? 0,
        fgpoNumber: r.fgpoNumber ?? r.FgpoNumber ?? '',
      }))))
      .catch(() => setFgpos([]));
  }, []);

  return fgpos;
};
