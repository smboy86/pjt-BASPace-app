import type { ImagePickerAsset } from 'expo-image-picker';

export type TImageCompressionProfileName = 'document' | 'standard';

export interface IImageCompressionProfile {
  initialQuality: number;
  maxLongEdge: number;
  minLongEdge: number;
  minQuality: number;
  qualityStep: number;
  targetBytes: number;
}

export interface IImageDimensions {
  height: number;
  width: number;
}

export interface ICompressedImageAsset extends ImagePickerAsset {
  fileSize: number;
  mimeType: 'image/jpeg';
}
