import { createContext, useState, ReactNode } from 'react';

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

export const DataProvider = ({ children }: { children: ReactNode }) => {
  // ── USERS ──────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'Juan Perez', email: 'juan@zonafranca.com', role: 'Administrator', status: 'Active' },
    { id: 2, name: 'Maria Garcia', email: 'maria@zonafranca.com', role: 'Production Supervisor', status: 'Active' },
    { id: 3, name: 'Carlos Mendez', email: 'carlos@zonafranca.com', role: 'Cutting Operator', status: 'Active' },
    { id: 4, name: 'Ana Lopez', email: 'ana@zonafranca.com', role: 'Sewing Operator', status: 'Inactive' },
  ]);

  // ── ROLES ──────────────────────────────────────────────
  const [roles, setRoles] = useState<Role[]>([
    { ID: 1, Name: 'Administrator', Description: 'Full system access', Active: true },
    { ID: 2, Name: 'Manager', Description: 'Management level access', Active: true },
    { ID: 3, Name: 'Operator', Description: 'Basic operational access', Active: true },
  ]);

  // ── CLIENTS ────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([
    { id: 1, name: 'Royal Apparel', contact: 'Roywei Chen', phone: '866-769-2517' },
    { id: 2, name: 'Hanesbrands Inc', contact: 'John Doe', phone: '555-123-4567' },
    { id: 3, name: 'Fruit of the Loom', contact: 'Sarah Johnson', phone: '800-321-4321' },
    { id: 4, name: 'Gildan Activewear', contact: 'Michel Roy', phone: '514-744-8000' },
  ]);

  // ── PURCHASE ORDERS ────────────────────────────────────
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'Z1026811',
      date: '2026-05-01',
      required: '2026-06-15',
      client: 'Royal Apparel',
      status: 'In Process',
      items: [
        { id: 1, style: 'B1001', color: 'PFD White', size: 'XS', qty: 100, uom: 'ea', item: 'B1001PFD-XS', desc: 'B1001 PFD White XS', price: 2.34, amount: 234.00 },
        { id: 2, style: 'B1001', color: 'PFD White', size: 'S', qty: 1100, uom: 'ea', item: 'B1001PFD-S', desc: 'B1001 PFD White S', price: 2.34, amount: 2574.00 },
        { id: 3, style: 'B1001', color: 'PFD White', size: 'M', qty: 2000, uom: 'ea', item: 'B1001PFD-M', desc: 'B1001 PFD White M', price: 2.34, amount: 4680.00 },
        { id: 4, style: 'B1001', color: 'PFD White', size: 'L', qty: 2600, uom: 'ea', item: 'B1001PFD-L', desc: 'B1001 PFD White L', price: 2.34, amount: 6084.00 },
        { id: 5, style: 'B1001', color: 'PFD White', size: 'XL', qty: 2300, uom: 'ea', item: 'B1001PFD-XL', desc: 'B1001 PFD White XL', price: 2.34, amount: 5382.00 },
        { id: 6, style: 'B1001', color: 'PFD White', size: '2X', qty: 1250, uom: 'ea', item: 'B1001PFD-2X', desc: 'B1001 PFD White 2X', price: 2.55, amount: 3187.50 },
      ],
      production: [
        { size: 'XS', orderQty: 100, cutTotal: 0, sewTotal: 0, shippedTotal: 0 },
        { size: 'S', orderQty: 1100, cutTotal: 446, sewTotal: 0, shippedTotal: 0 },
        { size: 'M', orderQty: 2000, cutTotal: 661, sewTotal: 167, shippedTotal: 100 },
        { size: 'L', orderQty: 2600, cutTotal: 1304, sewTotal: 0, shippedTotal: 0 },
        { size: 'XL', orderQty: 2300, cutTotal: 978, sewTotal: 237, shippedTotal: 0 },
        { size: '2X', orderQty: 1250, cutTotal: 652, sewTotal: 158, shippedTotal: 0 },
      ],
    },
    {
      id: 'Z1026812',
      date: '2026-05-10',
      required: '2026-07-01',
      client: 'Hanesbrands Inc',
      status: 'Pending',
      items: [
        { id: 1, style: 'T2000', color: 'Black', size: 'S', qty: 500, uom: 'ea', item: 'T2000BLK-S', desc: 'T2000 Black S', price: 3.10, amount: 1550.00 },
        { id: 2, style: 'T2000', color: 'Black', size: 'M', qty: 1200, uom: 'ea', item: 'T2000BLK-M', desc: 'T2000 Black M', price: 3.10, amount: 3720.00 },
        { id: 3, style: 'T2000', color: 'Black', size: 'L', qty: 1500, uom: 'ea', item: 'T2000BLK-L', desc: 'T2000 Black L', price: 3.10, amount: 4650.00 },
        { id: 4, style: 'T2000', color: 'Black', size: 'XL', qty: 800, uom: 'ea', item: 'T2000BLK-XL', desc: 'T2000 Black XL', price: 3.25, amount: 2600.00 },
      ],
      production: [
        { size: 'S', orderQty: 500, cutTotal: 500, sewTotal: 480, shippedTotal: 480 },
        { size: 'M', orderQty: 1200, cutTotal: 1200, sewTotal: 950, shippedTotal: 500 },
        { size: 'L', orderQty: 1500, cutTotal: 800, sewTotal: 0, shippedTotal: 0 },
        { size: 'XL', orderQty: 800, cutTotal: 0, sewTotal: 0, shippedTotal: 0 },
      ],
    },
    {
      id: 'Z1026813',
      date: '2026-06-01',
      required: '2026-08-15',
      client: 'Fruit of the Loom',
      status: 'Completed',
      items: [
        { id: 1, style: 'S3930', color: 'Navy', size: 'M', qty: 600, uom: 'ea', item: 'S3930NAV-M', desc: 'S3930 Navy M', price: 2.80, amount: 1680.00 },
        { id: 2, style: 'S3930', color: 'Navy', size: 'L', qty: 800, uom: 'ea', item: 'S3930NAV-L', desc: 'S3930 Navy L', price: 2.80, amount: 2240.00 },
        { id: 3, style: 'S3930', color: 'Navy', size: 'XL', qty: 400, uom: 'ea', item: 'S3930NAV-XL', desc: 'S3930 Navy XL', price: 2.95, amount: 1180.00 },
      ],
      production: [
        { size: 'M', orderQty: 600, cutTotal: 600, sewTotal: 600, shippedTotal: 600 },
        { size: 'L', orderQty: 800, cutTotal: 800, sewTotal: 800, shippedTotal: 800 },
        { size: 'XL', orderQty: 400, cutTotal: 400, sewTotal: 400, shippedTotal: 400 },
      ],
    },
  ]);

  // ── FABRIC DATA ────────────────────────────────────────
  const [fabricData] = useState<FabricData[]>([
    { id: 1, po: 'Z1026811', style: 'B1001', color: 'PFD White', fabricType: 'Cotton PFD White', size: 'XS', purchased: 500, quality: 'Approved', cut: 0 },
    { id: 2, po: 'Z1026811', style: 'B1001', color: 'PFD White', fabricType: 'Cotton PFD White', size: 'S', purchased: 850, quality: 'Approved', cut: 446 },
    { id: 3, po: 'Z1026811', style: 'B1001', color: 'PFD White', fabricType: 'Cotton PFD White', size: 'M', purchased: 1200, quality: 'Approved', cut: 661 },
    { id: 4, po: 'Z1026811', style: 'B1001', color: 'PFD White', fabricType: 'Cotton PFD White', size: 'L', purchased: 1800, quality: 'Approved', cut: 1304 },
    { id: 5, po: 'Z1026811', style: 'B1001', color: 'PFD White', fabricType: 'Cotton PFD White', size: 'XL', purchased: 1500, quality: 'Approved', cut: 978 },
    { id: 6, po: 'Z1026811', style: 'B1001', color: 'PFD White', fabricType: 'Cotton PFD White', size: '2X', purchased: 900, quality: 'Pending', cut: 0 },
    { id: 7, po: 'Z1026812', style: 'T2000', color: 'Black', fabricType: 'Black Jersey 180g', size: 'S', purchased: 600, quality: 'Approved', cut: 500 },
    { id: 8, po: 'Z1026812', style: 'T2000', color: 'Black', fabricType: 'Black Jersey 180g', size: 'M', purchased: 1400, quality: 'Approved', cut: 1200 },
    { id: 9, po: 'Z1026812', style: 'T2000', color: 'Black', fabricType: 'Black Jersey 180g', size: 'L', purchased: 1800, quality: 'Approved', cut: 800 },
    { id: 10, po: 'Z1026812', style: 'T2000', color: 'Black', fabricType: 'Black Jersey 180g', size: 'XL', purchased: 950, quality: 'Pending', cut: 0 },
    { id: 11, po: 'Z1026813', style: 'S3930', color: 'Navy', fabricType: 'Polyester Navy 200g', size: 'M', purchased: 700, quality: 'Approved', cut: 600 },
    { id: 12, po: 'Z1026813', style: 'S3930', color: 'Navy', fabricType: 'Polyester Navy 200g', size: 'L', purchased: 950, quality: 'Approved', cut: 800 },
    { id: 13, po: 'Z1026813', style: 'S3930', color: 'Navy', fabricType: 'Polyester Navy 200g', size: 'XL', purchased: 480, quality: 'Approved', cut: 400 },
  ]);

  // ── ACTIONS ────────────────────────────────────────────
  const addUser = (u: Omit<User, 'id' | 'status'>) => setUsers([...users, { ...u, id: Date.now(), status: 'Active' }]);
  const addRole = (r: Omit<Role, 'ID'>) => setRoles([...roles, { ...r, ID: Date.now() }]);
  const addClient = (c: Omit<Client, 'id'>) => setClients([...clients, { ...c, id: Date.now() }]);
  
  const addPO = (po: Omit<PurchaseOrder, 'status' | 'production'>) => {
    const newPO: PurchaseOrder = { ...po, production: [], status: 'Pending' };
    setPurchaseOrders(prev => [...prev, newPO]);
  };
  

  return (
    <DataContext.Provider value={{
      users, roles, clients, purchaseOrders, fabricData,
      addUser, addRole, addClient, addPO,
    }}>
      {children}
    </DataContext.Provider>
  );
};
