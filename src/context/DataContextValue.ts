import { createContext } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface Role {
  ID: number;
  Name: string;
  Description: string;
  Active: boolean;
  Permissions?: Permission[];
}

export interface Permission {
  ID: number;
  Name: string;
  Description: string;
  Module: string;
  Active: boolean;
}

export interface Client {
  id: number;
  name: string;
  contact: string;
  phone: string;
}

export interface POItem {
  id: number;
  style?: string;
  color?: string;
  size?: string;
  qty: number;
  uom: string;
  item: string;
  desc: string;
  price: number;
  amount: number;
}

export interface POProduction {
  size: string;
  orderQty: number;
  cutTotal: number;
  sewTotal: number;
  shippedTotal: number;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  required: string;
  client: string;
  status: string;
  items: POItem[];
  production?: POProduction[];
}

export interface FabricData {
  id: number;
  po: string;
  style: string;
  color: string;
  fabricType: string;
  size: string;
  purchased: number;
  quality: string;
  cut: number;
}

export interface DataContextType {
  users: User[];
  roles: Role[];
  clients: Client[];
  purchaseOrders: PurchaseOrder[];
  fabricData: FabricData[];
  addUser: (u: Omit<User, 'id' | 'status'>) => void;
  addRole: (r: Omit<Role, 'ID'>) => void;
  addClient: (c: Omit<Client, 'id'>) => void;
  addPO: (po: Omit<PurchaseOrder, 'status' | 'production'>) => void;
}

export const DataContext = createContext<DataContextType>({} as DataContextType);
