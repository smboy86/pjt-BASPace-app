import { describe, expect, it } from 'vitest';
import {
  calculateFloorTilePrice,
  FLOOR_TILE_PRICE_ROUNDING_UNIT,
  SQUARE_METERS_PER_PYEONG,
} from './floor-tile-price';

describe('calculateFloorTilePrice', () => {
  it('converts millimeters to pyeong and rounds the final price to the nearest thousand won', () => {
    const result = calculateFloorTilePrice({
      bathroomLengthMm: 2200,
      bathroomWidthMm: 1600,
      unitPrice: 100_000,
    });

    expect(result.isCalculable).toBe(true);
    expect(result.areaSquareMeters).toBe(3.52);
    expect(result.areaPyeong).toBeCloseTo(3.52 / SQUARE_METERS_PER_PYEONG);
    expect(result.amount).toBe(106_000);
    expect(result.amount % FLOOR_TILE_PRICE_ROUNDING_UNIT).toBe(0);
  });

  it.each([
    { bathroomLengthMm: 0, bathroomWidthMm: 1600 },
    { bathroomLengthMm: 2200, bathroomWidthMm: 0 },
    { bathroomLengthMm: -2200, bathroomWidthMm: 1600 },
    { bathroomLengthMm: Number.NaN, bathroomWidthMm: 1600 },
  ])('returns an unavailable zero price for invalid dimensions', (dimensions) => {
    expect(calculateFloorTilePrice({ ...dimensions, unitPrice: 100_000 })).toEqual({
      amount: 0,
      areaPyeong: 0,
      areaSquareMeters: 0,
      isCalculable: false,
    });
  });

  it('keeps a valid free unit price calculable', () => {
    expect(
      calculateFloorTilePrice({
        bathroomLengthMm: 2200,
        bathroomWidthMm: 1600,
        unitPrice: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        amount: 0,
        isCalculable: true,
      }),
    );
  });

  it.each([
    { expected: 106_000, unitPrice: 352_066 },
    { expected: 107_000, unitPrice: 352_067 },
  ])('rounds the $unitPrice result to $expected', ({ expected, unitPrice }) => {
    expect(
      calculateFloorTilePrice({
        bathroomLengthMm: 1000,
        bathroomWidthMm: 1000,
        unitPrice,
      }).amount,
    ).toBe(expected);
  });
});
