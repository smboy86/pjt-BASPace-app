export const FLOOR_TILE_OPTION_CODE = 'FLOOR_TILE';
export const WALL_TILE_OPTION_CODE = 'TILE';
export const TILE_PRICE_UNAVAILABLE_LABEL = '욕실 크기 미입력으로 계산이 불가합니다';
export const SQUARE_METERS_PER_PYEONG = 3.305785;
export const TILE_PRICE_ROUNDING_UNIT = 1_000;
export const DOOR_WIDTH_MM = 900;
export const DOOR_HEIGHT_MM = 2_100;

export type TQuoteOptionPricingMethod =
  | 'direct_unit_price'
  | 'floor_area_pyeong'
  | 'wall_area_pyeong';

export interface IQuoteOptionPriceInput {
  bathroomHeightMm: number;
  bathroomLengthMm: number;
  bathroomWidthMm: number;
  optionCode: string;
  unitPrice: number;
}

export interface IQuoteOptionPriceResult {
  amount: number;
  areaPyeong: number;
  areaSquareMeters: number;
  isCalculable: boolean;
  isCalculatedPrice: boolean;
  pricingMethod: TQuoteOptionPricingMethod;
}

const unavailableCalculatedPrice = (
  pricingMethod: Exclude<TQuoteOptionPricingMethod, 'direct_unit_price'>,
): IQuoteOptionPriceResult => ({
  amount: 0,
  areaPyeong: 0,
  areaSquareMeters: 0,
  isCalculable: false,
  isCalculatedPrice: true,
  pricingMethod,
});

const hasPositiveFiniteValues = (values: number[]): boolean =>
  values.every((value) => Number.isFinite(value) && value > 0);

const getCalculatedTileAreaSquareMeters = ({
  bathroomHeightMm,
  bathroomLengthMm,
  bathroomWidthMm,
  optionCode,
}: Omit<IQuoteOptionPriceInput, 'unitPrice'>): number | null => {
  if (optionCode === FLOOR_TILE_OPTION_CODE) {
    if (!hasPositiveFiniteValues([bathroomWidthMm, bathroomLengthMm])) return null;
    return (bathroomWidthMm * bathroomLengthMm) / 1_000_000;
  }

  if (optionCode === WALL_TILE_OPTION_CODE) {
    if (!hasPositiveFiniteValues([bathroomWidthMm, bathroomLengthMm, bathroomHeightMm]))
      return null;

    const wallAreaSquareMillimeters =
      bathroomWidthMm * bathroomHeightMm * 2 +
      bathroomLengthMm * bathroomHeightMm * 2 -
      DOOR_WIDTH_MM * DOOR_HEIGHT_MM;

    return wallAreaSquareMillimeters > 0 ? wallAreaSquareMillimeters / 1_000_000 : null;
  }

  return null;
};

export const isAreaPricedTileOptionCode = (optionCode: string): boolean =>
  optionCode === FLOOR_TILE_OPTION_CODE || optionCode === WALL_TILE_OPTION_CODE;

export const calculateQuoteOptionPrice = ({
  bathroomHeightMm,
  bathroomLengthMm,
  bathroomWidthMm,
  optionCode,
  unitPrice,
}: IQuoteOptionPriceInput): IQuoteOptionPriceResult => {
  if (!isAreaPricedTileOptionCode(optionCode)) {
    const isCalculable = Number.isFinite(unitPrice) && unitPrice >= 0;
    return {
      amount: isCalculable ? unitPrice : 0,
      areaPyeong: 0,
      areaSquareMeters: 0,
      isCalculable,
      isCalculatedPrice: false,
      pricingMethod: 'direct_unit_price',
    };
  }

  const pricingMethod =
    optionCode === FLOOR_TILE_OPTION_CODE ? 'floor_area_pyeong' : 'wall_area_pyeong';
  const areaSquareMeters = getCalculatedTileAreaSquareMeters({
    bathroomHeightMm,
    bathroomLengthMm,
    bathroomWidthMm,
    optionCode,
  });

  if (areaSquareMeters === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return unavailableCalculatedPrice(pricingMethod);
  }

  const areaPyeong = areaSquareMeters / SQUARE_METERS_PER_PYEONG;
  const rawAmount = areaPyeong * unitPrice;
  if (!Number.isFinite(rawAmount)) return unavailableCalculatedPrice(pricingMethod);

  return {
    amount: Math.round(rawAmount / TILE_PRICE_ROUNDING_UNIT) * TILE_PRICE_ROUNDING_UNIT,
    areaPyeong,
    areaSquareMeters,
    isCalculable: true,
    isCalculatedPrice: true,
    pricingMethod,
  };
};
