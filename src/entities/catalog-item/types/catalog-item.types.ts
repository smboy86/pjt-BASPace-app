export enum ECatalogItemCategory {
  TOILET = 'toilet',
  VANITY = 'vanity',
  SHOWER = 'shower',
  BATHTUB = 'bathtub',
  TILE = 'tile',
  LIGHTING = 'lighting',
  DESIGN_PACKAGE = 'design_package',
}

export interface ICatalogOption {
  id: string;
  name: string;
  priceDelta: number;
  isActive: boolean;
}

export interface IPriceChange {
  id: string;
  previousPrice: number;
  nextPrice: number;
  changedBy: string;
  changedAt: string;
}

export interface ICatalogItem {
  id: string;
  category: ECatalogItemCategory;
  brand: string;
  name: string;
  description: string;
  imageUri?: string;
  basePrice: number;
  options: ICatalogOption[];
  isActive: boolean;
  priceHistory: IPriceChange[];
  createdAt: string;
  updatedAt: string;
}

export type TCreateCatalogItemInput = Omit<
  ICatalogItem,
  'id' | 'priceHistory' | 'createdAt' | 'updatedAt'
>;

export type TUpdateCatalogItemInput = Partial<
  Omit<ICatalogItem, 'id' | 'priceHistory' | 'createdAt' | 'updatedAt'>
>;
