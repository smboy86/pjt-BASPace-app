export enum EQuoteOptionFormType {
  SIMPLE = 'simple',
  ADVANCED = 'advanced',
}

export const QUOTE_OPTION_TILE_SIZES = [
  { label: '300×300', value: '300x300' },
  { label: '300×600', value: '300x600' },
  { label: '600×600', value: '600x600' },
  { label: '600×1200', value: '600x1200' },
] as const;

export type TQuoteOptionTileSize = (typeof QUOTE_OPTION_TILE_SIZES)[number]['value'];

export const getQuoteOptionTileSizeLabel = (size: TQuoteOptionTileSize): string =>
  QUOTE_OPTION_TILE_SIZES.find((item) => item.value === size)?.label ?? size;

export interface IQuoteOptionProduct {
  id: string;
  name: string;
  price: number;
  displayOrder: number;
  storagePath: string;
  tileSize?: TQuoteOptionTileSize;
  url: string;
  createdAt: string;
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
