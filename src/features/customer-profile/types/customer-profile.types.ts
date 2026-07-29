export interface ICustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  updatedAt: string;
}

export interface IUpdateCustomerProfileInput {
  customerId: string;
  name: string;
  phone?: string | null;
}
