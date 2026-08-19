import { describe, expect, it } from 'vitest';
import { areBathroomDimensionsValid, sanitizeBathroomDimension } from './bathroom-dimensions';

describe('bathroom dimensions', () => {
  it('accepts three positive numeric values', () => {
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '2200',
        bathroomLength: '1800',
        bathroomWidth: '1600',
      }),
    ).toBe(true);
  });

  it('accepts only the all-zero unavailable measurement value', () => {
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '0',
        bathroomLength: '0',
        bathroomWidth: '0',
      }),
    ).toBe(true);
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '0',
        bathroomLength: '1800',
        bathroomWidth: '1600',
      }),
    ).toBe(false);
  });

  it('rejects empty or non-numeric values', () => {
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '',
        bathroomLength: '1800',
        bathroomWidth: '1600',
      }),
    ).toBe(false);
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '높이',
        bathroomLength: '1800',
        bathroomWidth: '1600',
      }),
    ).toBe(false);
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '2200.5',
        bathroomLength: '1800',
        bathroomWidth: '1600',
      }),
    ).toBe(false);
  });

  it('keeps only integer digits in dimension input', () => {
    expect(sanitizeBathroomDimension('12a.3.4')).toBe('1234');
    expect(sanitizeBathroomDimension('가로 1,600mm')).toBe('1600');
  });
});
