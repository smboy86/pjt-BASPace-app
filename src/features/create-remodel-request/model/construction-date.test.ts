import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { getMinimumConstructionDate, isFutureConstructionDate } from './construction-date';

const TODAY = dayjs('2026-08-10T12:00:00+09:00');

describe('construction date', () => {
  it('uses the next local calendar date as the minimum', () => {
    expect(getMinimumConstructionDate(TODAY)).toBe('2026-08-11');
  });

  it('accepts only a valid date after today', () => {
    expect(isFutureConstructionDate('2026-08-11', TODAY)).toBe(true);
    expect(isFutureConstructionDate('2026-08-10', TODAY)).toBe(false);
    expect(isFutureConstructionDate('2026-08-09', TODAY)).toBe(false);
    expect(isFutureConstructionDate('2026-02-30', TODAY)).toBe(false);
    expect(isFutureConstructionDate('2026-8-11', TODAY)).toBe(false);
  });
});
