import dayjs from 'dayjs';

export const formatRemodelSchedule = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsedDate = dayjs(value);
  return parsedDate.isValid() && parsedDate.format('YYYY-MM-DD') === value
    ? parsedDate.format('YYYY년 M월 D일')
    : value;
};
