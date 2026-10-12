import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../../utils/api';
import { User } from '../../types';

const mapUser = (raw: any): User => ({
  id: raw.id ?? raw.ID ?? 0,
  userName: raw.userName ?? raw.UserName ?? '',
  userEmail: raw.userEmail ?? raw.UserEmail ?? '',
  roleId: raw.roleId ?? raw.RoleId ?? null,
  roleName: raw.roleName ?? raw.RoleName ?? '',
  userType: raw.userType ?? raw.UserType ?? 'Employee',
  mustChangePassword: raw.mustChangePassword ?? raw.MustChangePassword ?? false,
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

/** Hook de Users (solo lectura): consume GET /api/auth/users */
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await usersApi.getAll();
      setUsers((res.data ?? []).map(mapUser));
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Error cargando usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { users, loading, error, load };
};
