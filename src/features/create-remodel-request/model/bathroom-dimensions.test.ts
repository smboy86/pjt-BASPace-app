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
    expect(
      areBathroomDimensionsValid({
        bathroomHeight: '2.4',
        bathroomLength: '1.8',
        bathroomWidth: '1.6',
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
  });

  it('normalizes dimension input to one decimal separator', () => {
    expect(sanitizeBathroomDimension('12a.3.4')).toBe('12.34');
  });
});
