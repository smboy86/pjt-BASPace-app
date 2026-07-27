export enum EQuoteOptionFormType {
  SIMPLE = 'simple',
  ADVANCED = 'advanced',
}

export interface IQuoteOptionImage {
  id: string;
  storagePath: string;
  displayOrder: number;
  url: string;
}

export interface IQuoteOption {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  formType: EQuoteOptionFormType;
  basePrice: number;
  isActive: boolean;
  images: IQuoteOptionImage[];
  createdAt: string;
  updatedAt: string;
}
