export interface IBathroomDimensionValues {
  bathroomHeight: string;
  bathroomLength: string;
  bathroomWidth: string;
}

const BATHROOM_DIMENSION_PATTERN = /^(?:\d+|\d*\.\d+)$/;

export const sanitizeBathroomDimension = (value: string): string => {
  const numericValue = value.replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = numericValue.split('.');

  if (decimalParts.length === 0) return integerPart;

  return `${integerPart}.${decimalParts.join('')}`;
};

export const areBathroomDimensionsValid = ({
  bathroomHeight,
  bathroomLength,
  bathroomWidth,
}: IBathroomDimensionValues): boolean => {
  const values = [bathroomWidth, bathroomLength, bathroomHeight];

  if (!values.every((value) => BATHROOM_DIMENSION_PATTERN.test(value))) return false;

  const dimensions = values.map(Number);
  return dimensions.every((value) => value === 0) || dimensions.every((value) => value > 0);
};
