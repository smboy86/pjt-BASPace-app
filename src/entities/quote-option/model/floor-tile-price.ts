export const FLOOR_TILE_OPTION_CODE = 'FLOOR_TILE';
export const FLOOR_TILE_PRICE_UNAVAILABLE_LABEL = '욕실 크기 미입력으로 계산이 불가합니다';
export const SQUARE_METERS_PER_PYEONG = 3.305785;
export const FLOOR_TILE_PRICE_ROUNDING_UNIT = 1_000;

export interface IFloorTilePriceInput {
  bathroomLengthMm: number;
  bathroomWidthMm: number;
  unitPrice: number;
}

export interface IFloorTilePriceResult {
  amount: number;
  areaPyeong: number;
  areaSquareMeters: number;
  isCalculable: boolean;
}

export const calculateFloorTilePrice = ({
  bathroomLengthMm,
  bathroomWidthMm,
  unitPrice,
}: IFloorTilePriceInput): IFloorTilePriceResult => {
  const hasValidDimensions =
    Number.isFinite(bathroomLengthMm) &&
    Number.isFinite(bathroomWidthMm) &&
    bathroomLengthMm > 0 &&
    bathroomWidthMm > 0;

  if (!hasValidDimensions) {
    return { amount: 0, areaPyeong: 0, areaSquareMeters: 0, isCalculable: false };
  }

  const areaSquareMeters = (bathroomWidthMm * bathroomLengthMm) / 1_000_000;
  const areaPyeong = areaSquareMeters / SQUARE_METERS_PER_PYEONG;
  const rawAmount = areaPyeong * unitPrice;
  const amount = Number.isFinite(rawAmount)
    ? Math.round(rawAmount / FLOOR_TILE_PRICE_ROUNDING_UNIT) * FLOOR_TILE_PRICE_ROUNDING_UNIT
    : 0;

  return {
    amount,
    areaPyeong,
    areaSquareMeters,
    isCalculable: Number.isFinite(rawAmount),
  };
};
