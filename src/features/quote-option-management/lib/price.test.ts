import { describe, expect, it } from 'vitest';
import { formatPriceInput, formatWon, parsePriceInput, stripPriceFormatting } from './price';

describe('quote option price formatting', () => {
  it('formats digit input with thousands separators', () => {
    expect(formatPriceInput('1234567')).toBe('1,234,567');
    expect(formatPriceInput('0000')).toBe('0');
  });

  it('normalizes formatted input back to a number', () => {
    expect(stripPriceFormatting('1,234원')).toBe('1234');
    expect(parsePriceInput('1,234')).toBe(1234);
    expect(parsePriceInput('')).toBe(0);
  });

  it('formats a stored price as won', () => {
    expect(formatWon(250000)).toBe('250,000원');
  });
});
