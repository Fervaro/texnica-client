import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext, type User } from './AuthContextValue';
import { authApi } from '../utils/api';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(true);
  const [permissionsSuperAdmin, setPermissionsSuperAdmin] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    // Check if token exists in localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedCustomer = localStorage.getItem('selectedCustomer');

    if (storedToken && storedUser) {
      try {
        const decodedToken = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        
        // Check if token is expired
        if (decodedToken.exp && decodedToken.exp < currentTime) {
          logout();
        } else {
          if (!storedCustomer) {
            logout();
          } else {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setSelectedCustomer(JSON.parse(storedCustomer));
          }
        }
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setPermissionKeys([]);
      setPermissionsSuperAdmin(false);
      setPermissionsLoading(false);
      return;
    }

    let active = true;
    setPermissionsLoading(true);
    authApi.getMyPermissions()
      .then(({ data }) => {
        if (!active) return;
        setPermissionKeys(Array.isArray(data?.permissionKeys)
          ? data.permissionKeys.map((key: unknown) => String(key).trim().toUpperCase())
          : []);
        setPermissionsSuperAdmin(data?.hasActiveRole === true && data?.isSuperAdmin === true);
      })
      .catch(() => {
        if (!active) return;
        setPermissionKeys([]);
        setPermissionsSuperAdmin(false);
      })
      .finally(() => {
        if (active) setPermissionsLoading(false);
      });

    return () => { active = false; };
  }, [token]);

  const hasPermission = useCallback((module: string, action: string) => {
    if (permissionsLoading) return false;
    if (permissionsSuperAdmin) return true;
    const key = `${module.trim().toUpperCase()}|${action.trim().toUpperCase()}`;
    return permissionKeys.includes(key);
  }, [permissionKeys, permissionsLoading, permissionsSuperAdmin]);

  const login = (newToken: string, userData: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    const customer = userData.customerId && userData.customerName
      ? { id: Number(userData.customerId), name: userData.customerName }
      : null;
    setSelectedCustomer(customer);
    if (customer) localStorage.setItem('selectedCustomer', JSON.stringify(customer));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedCustomer');
    setToken(null);
    setUser(null);
    setPermissionKeys([]);
    setPermissionsSuperAdmin(false);
    setPermissionsLoading(false);
  };

  const setMustChangePassword = (value: boolean) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, mustChangePassword: value };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) {
    return <div>Loading session...</div>; // Optionally a spinner here
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        permissionsLoading,
        hasPermission,
        setMustChangePassword,
        selectedCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
