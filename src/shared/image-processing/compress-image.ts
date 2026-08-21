import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { getNextLongEdge, getQualitySteps, getResizeDimensions } from './policy';
import { IMAGE_COMPRESSION_PROFILES } from './profiles';
import type {
  ICompressedImageAsset,
  IImageDimensions,
  TImageCompressionProfileName,
} from './types';

export class ImageCompressionError extends Error {
  constructor() {
    super('이미지를 화면용 크기로 줄이지 못했어요. 다른 이미지를 선택해 주세요.');
    this.name = 'ImageCompressionError';
  }
}

const getFileSize = async (uri: string): Promise<number> => {
  const response = await fetch(uri);
  if (!response.ok) throw new ImageCompressionError();
  return (await response.arrayBuffer()).byteLength;
};

const getSourceDimensions = async (asset: ImagePickerAsset): Promise<IImageDimensions> => {
  if (asset.width > 0 && asset.height > 0) {
    return { width: asset.width, height: asset.height };
  }

  const rendered = await ImageManipulator.manipulate(asset.uri).renderAsync();
  return { width: rendered.width, height: rendered.height };
};

const getJpegFileName = (fileName: string | null | undefined): string => {
  const baseName = fileName?.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.jpg`;
};

export const compressImageAsset = async (
  asset: ImagePickerAsset,
  profileName: TImageCompressionProfileName = 'standard',
): Promise<ICompressedImageAsset> => {
  const profile = IMAGE_COMPRESSION_PROFILES[profileName];
  const sourceDimensions = await getSourceDimensions(asset);
  const sourceLongEdge = Math.max(sourceDimensions.width, sourceDimensions.height);
  let longEdge = Math.min(sourceLongEdge, profile.maxLongEdge);
  const minLongEdge = Math.min(sourceLongEdge, profile.minLongEdge);

  while (longEdge >= minLongEdge) {
    const dimensions = getResizeDimensions(
      sourceDimensions.width,
      sourceDimensions.height,
      longEdge,
    );
    const context = ImageManipulator.manipulate(asset.uri);
    if (
      dimensions.width !== sourceDimensions.width ||
      dimensions.height !== sourceDimensions.height
    ) {
      context.resize(dimensions);
    }
    const rendered = await context.renderAsync();

    for (const quality of getQualitySteps(profile)) {
      const result = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
      const fileSize = await getFileSize(result.uri);
      if (fileSize <= profile.targetBytes) {
        return {
          ...asset,
          base64: null,
          file: undefined,
          fileName: getJpegFileName(asset.fileName),
          fileSize,
          height: result.height,
          mimeType: 'image/jpeg',
          uri: result.uri,
          width: result.width,
        };
      }
    }

    const nextLongEdge = getNextLongEdge(longEdge, minLongEdge);
    if (nextLongEdge === null) break;
    longEdge = nextLongEdge;
  }

  throw new ImageCompressionError();
};
