import { describe, expect, it } from 'vitest';
import {
  calculateQuoteOptionPrice,
  DOOR_HEIGHT_MM,
  DOOR_WIDTH_MM,
  FLOOR_TILE_OPTION_CODE,
  SQUARE_METERS_PER_PYEONG,
  TILE_PRICE_ROUNDING_UNIT,
  WALL_TILE_OPTION_CODE,
} from './tile-price';

const BASE_INPUT = {
  bathroomHeightMm: 2200,
  bathroomLengthMm: 2200,
  bathroomWidthMm: 1600,
  unitPrice: 100_000,
};

describe('calculateQuoteOptionPrice', () => {
  it('calculates floor tile area and rounds the price to the nearest thousand won', () => {
    const result = calculateQuoteOptionPrice({
      ...BASE_INPUT,
      optionCode: FLOOR_TILE_OPTION_CODE,
    });

    expect(result).toEqual(
      expect.objectContaining({
        amount: 106_000,
        areaSquareMeters: 3.52,
        isCalculable: true,
        isCalculatedPrice: true,
        pricingMethod: 'floor_area_pyeong',
      }),
    );
    expect(result.areaPyeong).toBeCloseTo(3.52 / SQUARE_METERS_PER_PYEONG);
    expect(result.amount % TILE_PRICE_ROUNDING_UNIT).toBe(0);
  });

  it('calculates four wall faces and subtracts one 900 by 2100 millimeter door', () => {
    const result = calculateQuoteOptionPrice({
      ...BASE_INPUT,
      optionCode: WALL_TILE_OPTION_CODE,
    });
    const expectedAreaSquareMeters =
      (1600 * 2200 * 2 + 2200 * 2200 * 2 - DOOR_WIDTH_MM * DOOR_HEIGHT_MM) / 1_000_000;

    expect(expectedAreaSquareMeters).toBe(14.83);
    expect(result).toEqual(
      expect.objectContaining({
        amount: 449_000,
        areaSquareMeters: expectedAreaSquareMeters,
        isCalculable: true,
        isCalculatedPrice: true,
        pricingMethod: 'wall_area_pyeong',
      }),
    );
    expect(result.areaPyeong).toBeCloseTo(14.83 / SQUARE_METERS_PER_PYEONG);
  });

  it.each([
    { bathroomHeightMm: 2200, bathroomLengthMm: 0, bathroomWidthMm: 1600 },
    { bathroomHeightMm: 2200, bathroomLengthMm: 2200, bathroomWidthMm: 0 },
    { bathroomHeightMm: -2200, bathroomLengthMm: 2200, bathroomWidthMm: 1600 },
    { bathroomHeightMm: Number.NaN, bathroomLengthMm: 2200, bathroomWidthMm: 1600 },
  ])('returns an unavailable zero wall price for invalid dimensions', (dimensions) => {
    expect(
      calculateQuoteOptionPrice({
        ...dimensions,
        optionCode: WALL_TILE_OPTION_CODE,
        unitPrice: 100_000,
      }),
    ).toEqual({
      amount: 0,
      areaPyeong: 0,
      areaSquareMeters: 0,
      isCalculable: false,
      isCalculatedPrice: true,
      pricingMethod: 'wall_area_pyeong',
    });
  });

  it('returns an unavailable zero wall price when the door is larger than the wall area', () => {
    expect(
      calculateQuoteOptionPrice({
        bathroomHeightMm: 100,
        bathroomLengthMm: 100,
        bathroomWidthMm: 100,
        optionCode: WALL_TILE_OPTION_CODE,
        unitPrice: 100_000,
      }).amount,
    ).toBe(0);
  });

  it('keeps a simple option direct price unchanged', () => {
    expect(
      calculateQuoteOptionPrice({
        ...BASE_INPUT,
        optionCode: 'TOILET',
      }),
    ).toEqual({
      amount: 100_000,
      areaPyeong: 0,
      areaSquareMeters: 0,
      isCalculable: true,
      isCalculatedPrice: false,
      pricingMethod: 'direct_unit_price',
    });
  });

  it.each([
    { expected: 106_000, unitPrice: 352_066 },
    { expected: 107_000, unitPrice: 352_067 },
  ])('rounds the floor result to $expected', ({ expected, unitPrice }) => {
    expect(
      calculateQuoteOptionPrice({
        bathroomHeightMm: 2200,
        bathroomLengthMm: 1000,
        bathroomWidthMm: 1000,
        optionCode: FLOOR_TILE_OPTION_CODE,
        unitPrice,
      }).amount,
    ).toBe(expected);
  });
});
