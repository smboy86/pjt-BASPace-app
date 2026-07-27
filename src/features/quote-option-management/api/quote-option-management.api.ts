import type { ImagePickerAsset } from 'expo-image-picker';
import {
  EQuoteOptionFormType,
  type IQuoteOption,
  type IQuoteOptionImage,
} from '@/entities/quote-option';
import { getSupabaseClient, type Database } from '@/shared/supabase';
import {
  QuoteOptionManagementError,
  type IUpdateQuoteOptionInput,
  type TQuoteOptionEditableImage,
} from '../types';
import { getRemovedStoragePaths, getUploadCleanupPaths } from '../lib';

const QUOTE_OPTION_IMAGES_BUCKET = 'quote-option-images';
const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 10;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

type TQuoteOptionRow = Database['public']['Tables']['quote_option_masters']['Row'];
type TQuoteOptionImageRow = Database['public']['Tables']['quote_option_images']['Row'];

const ERROR_MESSAGES = {
  cleanup_pending:
    '변경사항을 저장하지 못했고 임시 이미지 정리도 지연되고 있어요. 네트워크를 확인한 뒤 다시 저장해 주세요.',
  image_too_large: '옵션 이미지는 한 장당 10MB 이하만 등록할 수 있어요.',
  too_many_images: '옵션 이미지는 최대 5장까지 등록할 수 있어요.',
  unauthorized: '관리자 로그인 정보를 다시 확인해 주세요.',
  unsupported_image: 'JPEG, PNG, HEIC 또는 HEIF 이미지만 등록할 수 있어요.',
  upload_failed: '옵션 이미지를 저장하지 못했어요.',
  validation_error: '입력값을 다시 확인해 주세요.',
  unknown: '견적 옵션을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
} as const;

const mapQuoteOption = (row: TQuoteOptionRow, images: IQuoteOptionImage[] = []): IQuoteOption => ({
  id: row.id,
  code: row.code,
  name: row.name,
  displayOrder: row.display_order,
  formType:
    row.form_type === EQuoteOptionFormType.ADVANCED
      ? EQuoteOptionFormType.ADVANCED
      : EQuoteOptionFormType.SIMPLE,
  basePrice: row.base_price,
  isActive: row.is_active,
  images,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getImageExtension = (mimeType: string): string => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
};

const assertImageMetadataIsValid = (asset: ImagePickerAsset): void => {
  if (asset.mimeType && !SUPPORTED_IMAGE_TYPES.has(asset.mimeType.toLowerCase())) {
    throw new QuoteOptionManagementError('unsupported_image', ERROR_MESSAGES.unsupported_image);
  }
  if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
    throw new QuoteOptionManagementError('image_too_large', ERROR_MESSAGES.image_too_large);
  }
};

const detectImageMimeType = (imageBuffer: ArrayBuffer): string | null => {
  const bytes = new Uint8Array(imageBuffer);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes.length >= 12) {
    const boxType = String.fromCharCode(...bytes.slice(4, 8));
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (boxType === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx'].includes(brand)) {
      return 'image/heic';
    }
    if (boxType === 'ftyp' && ['mif1', 'msf1'].includes(brand)) {
      return 'image/heif';
    }
  }
  return null;
};

const createSignedImages = async (
  imageRows: TQuoteOptionImageRow[],
): Promise<IQuoteOptionImage[]> => {
  if (imageRows.length === 0) return [];

  const supabase = getSupabaseClient();
  return Promise.all(
    imageRows.map(async (image) => {
      const { data, error } = await supabase.storage
        .from(QUOTE_OPTION_IMAGES_BUCKET)
        .createSignedUrl(image.storage_path, SIGNED_URL_SECONDS);
      if (error) throw error;

      return {
        id: image.id,
        storagePath: image.storage_path,
        displayOrder: image.display_order,
        url: data.signedUrl,
      };
    }),
  );
};

const removeStoragePaths = async (paths: string[]): Promise<string[]> => {
  if (paths.length === 0) return [];

  const storage = getSupabaseClient().storage.from(QUOTE_OPTION_IMAGES_BUCKET);
  const firstAttempt = await storage.remove(paths);
  if (!firstAttempt.error) return [];

  const secondAttempt = await storage.remove(paths);
  return secondAttempt.error ? paths : [];
};

const enqueueImageCleanup = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;

  const { error } = await getSupabaseClient()
    .from('quote_option_image_cleanup_queue')
    .upsert(
      paths.map((storagePath) => ({ storage_path: storagePath })),
      { onConflict: 'storage_path' },
    );
  if (error) {
    throw new QuoteOptionManagementError('cleanup_pending', ERROR_MESSAGES.cleanup_pending);
  }
};

const clearImageCleanup = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;

  await getSupabaseClient()
    .from('quote_option_image_cleanup_queue')
    .delete()
    .in('storage_path', paths);
};

const retryPendingImageCleanup = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('quote_option_image_cleanup_queue')
    .select('storage_path, attempts')
    .order('created_at')
    .limit(20);
  if (error || data.length === 0) return;

  const paths = data.map((item) => item.storage_path);
  const failedPaths = await removeStoragePaths(paths);
  const failedPathSet = new Set(failedPaths);
  const removedPaths = paths.filter((path) => !failedPathSet.has(path));

  if (removedPaths.length > 0) {
    await supabase
      .from('quote_option_image_cleanup_queue')
      .delete()
      .in('storage_path', removedPaths);
  }

  await Promise.all(
    data
      .filter((item) => failedPathSet.has(item.storage_path))
      .map((item) =>
        supabase
          .from('quote_option_image_cleanup_queue')
          .update({
            attempts: item.attempts + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('storage_path', item.storage_path),
      ),
  );
};

export const fetchQuoteOptions = async (): Promise<IQuoteOption[]> => {
  const { data, error } = await getSupabaseClient()
    .from('quote_option_masters')
    .select('*')
    .order('display_order')
    .order('name');
  if (error) throw error;
  return data.map((row) => mapQuoteOption(row));
};

export const fetchQuoteOption = async (optionId: string): Promise<IQuoteOption> => {
  const supabase = getSupabaseClient();
  const [{ data: option, error: optionError }, { data: images, error: imagesError }] =
    await Promise.all([
      supabase.from('quote_option_masters').select('*').eq('id', optionId).single(),
      supabase
        .from('quote_option_images')
        .select('*')
        .eq('quote_option_id', optionId)
        .order('display_order'),
    ]);

  if (optionError) throw optionError;
  if (imagesError) throw imagesError;
  return mapQuoteOption(option, await createSignedImages(images));
};

const uploadImage = async (optionId: string, asset: ImagePickerAsset): Promise<string> => {
  assertImageMetadataIsValid(asset);
  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new QuoteOptionManagementError('upload_failed', ERROR_MESSAGES.upload_failed);
  }

  const imageBuffer = await response.arrayBuffer();
  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new QuoteOptionManagementError('image_too_large', ERROR_MESSAGES.image_too_large);
  }
  const mimeType = detectImageMimeType(imageBuffer);
  if (!mimeType) {
    throw new QuoteOptionManagementError('unsupported_image', ERROR_MESSAGES.unsupported_image);
  }

  const storagePath = `${optionId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${getImageExtension(mimeType)}`;
  const { error } = await getSupabaseClient()
    .storage.from(QUOTE_OPTION_IMAGES_BUCKET)
    .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: false });
  if (error) {
    throw new QuoteOptionManagementError('upload_failed', ERROR_MESSAGES.upload_failed);
  }
  return storagePath;
};

const resolveImagePaths = async (
  optionId: string,
  images: TQuoteOptionEditableImage[],
  uploadedPaths: string[],
): Promise<string[]> => {
  const paths: string[] = [];

  for (const image of images) {
    if (image.kind === 'stored') {
      paths.push(image.storagePath);
      continue;
    }

    const path = await uploadImage(optionId, image.asset);
    paths.push(path);
    uploadedPaths.push(path);
  }

  return paths;
};

export const updateQuoteOption = async (input: IUpdateQuoteOptionInput): Promise<IQuoteOption> => {
  if (input.images.length > MAX_IMAGE_COUNT) {
    throw new QuoteOptionManagementError('too_many_images', ERROR_MESSAGES.too_many_images);
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new QuoteOptionManagementError('unauthorized', ERROR_MESSAGES.unauthorized);
  }
  await retryPendingImageCleanup();

  const { data: previousImages, error: previousImagesError } = await supabase
    .from('quote_option_images')
    .select('storage_path')
    .eq('quote_option_id', input.optionId);
  if (previousImagesError) throw previousImagesError;

  const uploadedPaths: string[] = [];
  let databaseUpdated = false;
  try {
    const resolvedPaths = await resolveImagePaths(input.optionId, input.images, uploadedPaths);

    const { error } = await supabase.rpc('update_quote_option_master', {
      target_option_id: input.optionId,
      target_name: input.name.trim(),
      target_display_order: input.displayOrder,
      target_form_type: input.formType,
      target_base_price: input.basePrice,
      target_image_paths: resolvedPaths,
    });
    if (error) throw error;
    databaseUpdated = true;

    const removedPaths = getRemovedStoragePaths(
      previousImages.map((image) => image.storage_path),
      resolvedPaths,
    );
    const failedRemovalPaths = await removeStoragePaths(removedPaths);
    const failedRemovalSet = new Set(failedRemovalPaths);
    await clearImageCleanup(removedPaths.filter((path) => !failedRemovalSet.has(path)));

    return await fetchQuoteOption(input.optionId);
  } catch (error) {
    const cleanupPaths = getUploadCleanupPaths(databaseUpdated, uploadedPaths);
    await enqueueImageCleanup(await removeStoragePaths(cleanupPaths));
    if (error instanceof QuoteOptionManagementError) throw error;
    throw new QuoteOptionManagementError('unknown', ERROR_MESSAGES.unknown);
  }
};
