import { createContext } from 'react';

export interface User {
  id: string | number;
  userName: string;
  userEmail: string;
  email?: string;
  active: boolean;
  mustChangePassword?: boolean;
  customerId?: number;
  customerName?: string;
  userType?: 'Employee' | 'Client';
  roleId?: number | null;
  roleName?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
  setMustChangePassword: (value: boolean) => void;
  selectedCustomer: { id: number; name: string } | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  setMustChangePassword: () => {},
  selectedCustomer: null,
});
