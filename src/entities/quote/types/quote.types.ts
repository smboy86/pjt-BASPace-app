export enum EQuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  FINAL = 'final',
  CONFIRMED = 'confirmed',
}

export interface IQuoteLineItem {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

export interface IQuote {
  id: string;
  requestId: string;
  partnerId: string;
  version: number;
  status: EQuoteStatus;
  lineItems: IQuoteLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  taxIncluded: boolean;
  validUntil: string;
  note?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TCreateQuoteInput = Omit<
  IQuote,
  'id' | 'version' | 'status' | 'subtotal' | 'tax' | 'total' | 'sentAt' | 'createdAt' | 'updatedAt'
>;

export type TQuoteDraftInput = Omit<TCreateQuoteInput, 'partnerId'> & { partnerId: string };
