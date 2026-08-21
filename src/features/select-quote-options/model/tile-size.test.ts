import { describe, expect, it, vi } from 'vitest';
import type { IQuoteOptionProduct, TQuoteOptionTileSize } from '../../../entities/quote-option';
import { getAvailableTileSizes, getProductsForTileSize } from './tile-size';

vi.mock('@/entities/quote-option', () => ({
  QUOTE_OPTION_TILE_SIZES: [
    { label: '300×300', value: '300x300' },
    { label: '300×600', value: '300x600' },
    { label: '600×600', value: '600x600' },
    { label: '600×1200', value: '600x1200' },
  ],
}));

const createProduct = (id: string, tileSize?: TQuoteOptionTileSize): IQuoteOptionProduct => ({
  id,
  name: `제품 ${id}`,
  price: 50_000,
  displayOrder: 0,
  storagePath: `${id}.jpg`,
  tileSize,
  url: `https://example.com/${id}.jpg`,
  createdAt: '2026-08-21T00:00:00.000Z',
});

describe('advanced tile product filtering', () => {
  const products = [
    createProduct('a', '600x600'),
    createProduct('b', '300x300'),
    createProduct('c', '300x300'),
    createProduct('legacy'),
  ];

  it('returns only sizes that currently have classified products in the fixed display order', () => {
    expect(getAvailableTileSizes(products)).toEqual(['300x300', '600x600']);
  });

  it('returns every product assigned to the selected size and ignores unclassified products', () => {
    expect(getProductsForTileSize(products, '300x300').map((product) => product.id)).toEqual([
      'b',
      'c',
    ]);
    expect(getProductsForTileSize(products)).toEqual([]);
  });
});
