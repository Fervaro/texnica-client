import { useCallback, useEffect, useState } from 'react';
import { permissionsApi } from '../../utils/api';
import { errorMessage } from '../../utils/errorMessage';
import { Permission } from '../../types';

const mapPermission = (raw: any): Permission => ({
  id: raw.id ?? raw.ID ?? 0,
  name: raw.name ?? raw.Name ?? '',
  description: raw.description ?? raw.Description ?? '',
  module: raw.module ?? raw.Module ?? '',
  active: raw.active ?? raw.Active ?? true,
});

/** Hook de Permissions: consume /api/permissions (listado + CRUD) */
export const usePermissions = () => {
  const [items, setItems] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await permissionsApi.getAll();
      setItems((res.data ?? []).map(mapPermission));
    } catch (err: any) {
      setError(errorMessage(err, 'Error cargando permisos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: any) => {
    setSaving(true);
    try { await permissionsApi.create(data); await load(); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    setSaving(true);
    try { await permissionsApi.delete(id); await load(); }
    finally { setSaving(false); }
  };

  return { items, loading, saving, error, load, create, remove };
};
