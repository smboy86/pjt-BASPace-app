import { describe, expect, it } from 'vitest';
import { getNextLongEdge, getQualitySteps, getResizeDimensions } from './policy';
import { IMAGE_COMPRESSION_PROFILES } from './profiles';

describe('image compression policy', () => {
  it('keeps the aspect ratio while reducing the long edge', () => {
    expect(getResizeDimensions(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
  });

  it('does not enlarge a small image', () => {
    expect(getResizeDimensions(1200, 900, 2048)).toEqual({ width: 1200, height: 900 });
  });

  it('includes the configured minimum quality exactly once', () => {
    expect(getQualitySteps(IMAGE_COMPRESSION_PROFILES.standard)).toEqual([0.82, 0.72, 0.62, 0.52]);
  });

  it('reduces dimensions in 20 percent steps without crossing the minimum', () => {
    expect(getNextLongEdge(2048, 1280)).toBe(1638);
    expect(getNextLongEdge(1300, 1280)).toBe(1280);
    expect(getNextLongEdge(1280, 1280)).toBeNull();
  });
});
