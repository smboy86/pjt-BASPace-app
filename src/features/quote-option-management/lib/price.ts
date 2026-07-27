export const stripPriceFormatting = (value: string): string => value.replace(/\D/g, '');

export const formatPriceInput = (value: string): string => {
  const digits = stripPriceFormatting(value).replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const parsePriceInput = (value: string): number => {
  const digits = stripPriceFormatting(value);
  return digits ? Number(digits) : 0;
};

export const formatWon = (value: number): string => `${value.toLocaleString('ko-KR')}원`;
