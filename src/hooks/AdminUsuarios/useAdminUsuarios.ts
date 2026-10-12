import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, customersApi, rolesApi, userRoleApi, usersApi } from '../../utils/api';

export interface Role {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

export interface User {
  id: number;
  userName: string;
  userEmail: string;
  active: boolean;
  mustChangePassword: boolean;
  roleId?: number;
  roleName?: string;
  userType: 'Employee' | 'Client';
  customerId?: number;
  customerName?: string;
}

export interface NewUserForm {
  name: string;
  email: string;
  roleId: number;
  userType: 'Employee' | 'Client';
  customerId: number;
}

const DEFAULT_PASSWORD = 'inicio';

export const useAdminUsuarios = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState('');
  const [newUser, setNewUser] = useState<NewUserForm>({ name: '', email: '', roleId: 0, userType: 'Employee', customerId: 0 });
  const [snackbar, setSnackbar] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setInitialLoadError('');

    try {
      const [rolesRes, usersRes, customersRes] = await Promise.all([
        rolesApi.getAll(),
        usersApi.getAll(),
        customersApi.getAll(),
      ]);

      setRoles(rolesRes.data);
      setUsers(usersRes.data);
      setCustomers((customersRes.data ?? []).map((c: any) => ({ id: c.id ?? c.ID, name: c.name ?? c.Name })));
    } catch (err: any) {
      setInitialLoadError(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email) {
      setSnackbar('Please fill in all fields.');
      return;
    }

    if (newUser.userType === 'Client' && !newUser.customerId) {
      setSnackbar('A Client user must have an assigned customer.');
      return;
    }

    let createdUser;
    try {
      const res = await authApi.createUser(newUser.name, newUser.email, newUser.userType, newUser.userType === 'Client' ? newUser.customerId : undefined);
      createdUser = res.data.user;
    } catch (err: any) {
      setSnackbar(err?.response?.data?.message || 'Error creating the user.');
      return;
    }

    const createdUserName = newUser.name;
    const createdUserId = createdUser?.id ?? createdUser?.ID;
    setNewUser({ name: '', email: '', roleId: roles[0]?.id || 0, userType: 'Employee', customerId: 0 });
    setSnackbar(`User "${createdUserName}" created successfully. Default password: "${DEFAULT_PASSWORD}"`);

    if (createdUserId && newUser.roleId) {
      try {
        await userRoleApi.assignRole(createdUserId, newUser.roleId);
      } catch {
        setSnackbar(`User "${createdUserName}" was created, but the role could not be assigned.`);
      }
    }

    try {
      await loadData();
    } catch {
      // The creation already succeeded; the list can be refreshed manually.
    }
  }, [loadData, newUser, roles]);

  const handleAssignRole = useCallback(async (userId: number, roleId: number) => {
    try {
      await userRoleApi.assignRole(userId, roleId);
      setSnackbar('Role assigned successfully.');
      await loadData();
    } catch (err: any) {
      setSnackbar(err?.response?.data?.message || 'Failed to assign role');
    }
  }, [loadData]);

  const handleUpdateUser = useCallback(async (userId: number, data: any) => {
    try {
      await usersApi.update(userId, data);
      setSnackbar('User updated successfully.');
      await loadData();
    } catch (err: any) {
      setSnackbar(err?.response?.data?.message || 'Failed to update user');
    }
  }, [loadData]);

  const handleResetPassword = useCallback(async (userId: number, newPassword?: string) => {
    try {
      await usersApi.resetPassword(userId, newPassword);
      setSnackbar(newPassword ? 'Password reset successfully.' : 'Password reset to the default password.');
    } catch (err: any) {
      setSnackbar(err?.response?.data?.message || 'Failed to reset password');
    }
  }, []);

  const handleSetActive = useCallback(async (userId: number, active: boolean) => {
    try {
      await usersApi.setActive(userId, active);
      setSnackbar(active ? 'User activated successfully.' : 'User deactivated successfully.');
      await loadData();
    } catch (err: any) {
      setSnackbar(err?.response?.data?.message || 'Failed to change user status');
    }
  }, [loadData]);

  const defaultPassword = useMemo(() => DEFAULT_PASSWORD, []);

  return {
    users,
    roles,
    customers,
    loading,
    error: initialLoadError,
    newUser,
    snackbar,
    defaultPassword,
    setNewUser,
    setError: setInitialLoadError,
    setSnackbar,
    loadData,
    handleCreateUser,
    handleAssignRole,
    handleUpdateUser,
    handleResetPassword,
    handleSetActive,
  };
};
