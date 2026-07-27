export enum EQuoteOptionFormType {
  SIMPLE = 'simple',
  ADVANCED = 'advanced',
}

export interface IQuoteOptionProduct {
  id: string;
  name: string;
  price: number;
  storagePath: string;
  url: string;
}

export interface IQuoteOption {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  formType: EQuoteOptionFormType;
  isActive: boolean;
  products: IQuoteOptionProduct[];
  createdAt: string;
  updatedAt: string;
}
