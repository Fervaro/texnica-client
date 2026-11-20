import React, { useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext, type User } from './AuthContextValue';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
        setMustChangePassword,
        selectedCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
