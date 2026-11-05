import { useCallback, useEffect, useState } from 'react';
import { rolesApi } from '../../utils/api';
import { errorMessage } from '../../utils/errorMessage';
import { Role } from '../../types';

const mapRole = (raw: any): Role => ({
  id: raw.id ?? raw.ID ?? 0,
  name: raw.name ?? raw.Name ?? '',
  description: raw.description ?? raw.Description ?? '',
  active: raw.active ?? raw.Active ?? true,
});

/** Hook de Roles: consume /api/roles (listado + CRUD) */
export const useRoles = () => {
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await rolesApi.getAll();
      setItems((res.data ?? []).map(mapRole));
    } catch (err: any) {
      setError(errorMessage(err, 'Error loading roles.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: any) => {
    setSaving(true);
    try { await rolesApi.create(data); await load(); }
    finally { setSaving(false); }
  };

  const update = async (id: number, data: any) => {
    setSaving(true);
    try { await rolesApi.update(id, data); await load(); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    setSaving(true);
    try { await rolesApi.delete(id); await load(); }
    finally { setSaving(false); }
  };

  const assignPermissions = async (roleId: number, permissionIds: number[]) => {
    setSaving(true);
    try { await rolesApi.assignPermissions(roleId, permissionIds); await load(); }
    finally { setSaving(false); }
  };

  return { items, loading, saving, error, load, create, update, remove, assignPermissions };
};
