import dayjs, { type Dayjs } from 'dayjs';

export const CONSTRUCTION_DATE_FORMAT = 'YYYY-MM-DD';

export const getMinimumConstructionDate = (today: Dayjs = dayjs()): string =>
  today.add(1, 'day').format(CONSTRUCTION_DATE_FORMAT);

export const isFutureConstructionDate = (value: string, today: Dayjs = dayjs()): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsedDate = dayjs(value);
  return (
    parsedDate.isValid() &&
    parsedDate.format(CONSTRUCTION_DATE_FORMAT) === value &&
    parsedDate.isAfter(today, 'day')
  );
};
