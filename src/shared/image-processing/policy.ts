import type { IImageCompressionProfile, IImageDimensions } from './types';

export const getResizeDimensions = (
  width: number,
  height: number,
  maxLongEdge: number,
): IImageDimensions => {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const getQualitySteps = (profile: IImageCompressionProfile): number[] => {
  const steps: number[] = [];
  let quality = profile.initialQuality;

  while (quality > profile.minQuality) {
    steps.push(Number(quality.toFixed(2)));
    quality -= profile.qualityStep;
  }
  steps.push(profile.minQuality);

  return [...new Set(steps)];
};

export const getNextLongEdge = (currentLongEdge: number, minLongEdge: number): number | null => {
  if (currentLongEdge <= minLongEdge) return null;
  return Math.max(minLongEdge, Math.floor(currentLongEdge * 0.8));
};
