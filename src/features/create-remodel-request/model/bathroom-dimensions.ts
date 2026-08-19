export interface IBathroomDimensionValues {
  bathroomHeight: string;
  bathroomLength: string;
  bathroomWidth: string;
}

const BATHROOM_DIMENSION_PATTERN = /^\d+$/;

export const sanitizeBathroomDimension = (value: string): string => {
  return value.replace(/\D/g, '');
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
