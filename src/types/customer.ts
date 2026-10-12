// Customer (Cliente)

export interface Customer {
  id: number;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  shippingAddress?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCustomerInput {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  shippingAddress?: string;
}
