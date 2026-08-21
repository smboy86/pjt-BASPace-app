import type { IImageCompressionProfile, TImageCompressionProfileName } from './types';

export const IMAGE_COMPRESSION_PROFILES: Record<
  TImageCompressionProfileName,
  IImageCompressionProfile
> = {
  standard: {
    initialQuality: 0.82,
    maxLongEdge: 2048,
    minLongEdge: 1280,
    minQuality: 0.52,
    qualityStep: 0.1,
    targetBytes: 1_500_000,
  },
  document: {
    initialQuality: 0.88,
    maxLongEdge: 2560,
    minLongEdge: 1600,
    minQuality: 0.64,
    qualityStep: 0.08,
    targetBytes: 2_000_000,
  },
};
