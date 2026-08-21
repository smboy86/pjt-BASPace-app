import {
  QUOTE_OPTION_TILE_SIZES,
  type IQuoteOptionProduct,
  type TQuoteOptionTileSize,
} from '@/entities/quote-option';

export const getAvailableTileSizes = (
  products: readonly IQuoteOptionProduct[],
): TQuoteOptionTileSize[] =>
  QUOTE_OPTION_TILE_SIZES.flatMap((size) =>
    products.some((product) => product.tileSize === size.value) ? [size.value] : [],
  );

export const getProductsForTileSize = (
  products: readonly IQuoteOptionProduct[],
  tileSize?: TQuoteOptionTileSize,
): IQuoteOptionProduct[] =>
  tileSize ? products.filter((product) => product.tileSize === tileSize) : [];
