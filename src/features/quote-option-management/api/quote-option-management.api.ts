import type { ImagePickerAsset } from 'expo-image-picker';
import {
  EQuoteOptionFormType,
  type IQuoteOption,
  type IQuoteOptionProduct,
} from '@/entities/quote-option';
import { getSupabaseClient, type Database, type TJson } from '@/shared/supabase';
import {
  QuoteOptionManagementError,
  type IUpdateQuoteOptionInput,
} from '../types';
import { getUploadCleanupPaths } from '../lib';

const QUOTE_OPTION_IMAGES_BUCKET = 'quote-option-images';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 10;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

type TQuoteOptionRow = Database['public']['Tables']['quote_option_masters']['Row'];
type TQuoteOptionProductRow = Database['public']['Tables']['quote_option_products']['Row'];

const ERROR_MESSAGES = {
  cleanup_pending: '변경사항을 저장하지 못했고 임시 이미지 정리도 지연되고 있어요. 네트워크를 확인한 뒤 다시 저장해 주세요.',
  image_too_large: '제품 이미지는 한 장당 10MB 이하만 등록할 수 있어요.',
  missing_product_image: '각 제품에 이미지 한 장을 등록해 주세요.',
  unauthorized: '관리자 로그인 정보를 다시 확인해 주세요.',
  unsupported_image: 'JPEG, PNG, HEIC 또는 HEIF 이미지만 등록할 수 있어요.',
  upload_failed: '제품 이미지를 저장하지 못했어요.',
  validation_error: '입력값을 다시 확인해 주세요.',
  unknown: '견적 옵션을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
} as const;

const mapQuoteOption = (row: TQuoteOptionRow, products: IQuoteOptionProduct[] = []): IQuoteOption => ({
  id: row.id,
  code: row.code,
  name: row.name,
  displayOrder: row.display_order,
  formType: row.form_type === EQuoteOptionFormType.ADVANCED ? EQuoteOptionFormType.ADVANCED : EQuoteOptionFormType.SIMPLE,
  isActive: row.is_active,
  products,
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

const detectImageMimeType = (buffer: ArrayBuffer): string | null => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
  }
  return null;
};

const createSignedProducts = async (rows: TQuoteOptionProductRow[]): Promise<IQuoteOptionProduct[]> => {
  const storage = getSupabaseClient().storage.from(QUOTE_OPTION_IMAGES_BUCKET);
  return Promise.all(rows.map(async (product) => {
    if (!product.image_path) return { id: product.id, name: product.name, price: product.price, storagePath: '', url: '' };
    const { data, error } = await storage.createSignedUrl(product.image_path, SIGNED_URL_SECONDS);
    if (error) throw error;
    return { id: product.id, name: product.name, price: product.price, storagePath: product.image_path, url: data.signedUrl };
  }));
};

const removeStoragePaths = async (paths: string[]): Promise<string[]> => {
  if (paths.length === 0) return [];
  const storage = getSupabaseClient().storage.from(QUOTE_OPTION_IMAGES_BUCKET);
  const first = await storage.remove(paths);
  if (!first.error) return [];
  const second = await storage.remove(paths);
  return second.error ? paths : [];
};

const enqueueImageCleanup = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  const { error } = await getSupabaseClient().from('quote_option_image_cleanup_queue').upsert(
    paths.map((storage_path) => ({ storage_path })), { onConflict: 'storage_path' },
  );
  if (error) throw new QuoteOptionManagementError('cleanup_pending', ERROR_MESSAGES.cleanup_pending);
};

const uploadImage = async (optionId: string, asset: ImagePickerAsset): Promise<string> => {
  assertImageMetadataIsValid(asset);
  const response = await fetch(asset.uri);
  if (!response.ok) throw new QuoteOptionManagementError('upload_failed', ERROR_MESSAGES.upload_failed);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new QuoteOptionManagementError('image_too_large', ERROR_MESSAGES.image_too_large);
  const mimeType = detectImageMimeType(buffer);
  if (!mimeType) throw new QuoteOptionManagementError('unsupported_image', ERROR_MESSAGES.unsupported_image);
  const storagePath = `${optionId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${getImageExtension(mimeType)}`;
  const { error } = await getSupabaseClient().storage.from(QUOTE_OPTION_IMAGES_BUCKET).upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (error) throw new QuoteOptionManagementError('upload_failed', ERROR_MESSAGES.upload_failed);
  return storagePath;
};

export const fetchQuoteOptions = async (): Promise<IQuoteOption[]> => {
  const supabase = getSupabaseClient();
  const [{ data: options, error: optionsError }, { data: products, error: productsError }] = await Promise.all([
    supabase.from('quote_option_masters').select('*').order('display_order').order('name'),
    supabase.from('quote_option_products').select('*'),
  ]);
  if (optionsError) throw optionsError;
  if (productsError) throw productsError;
  const productsByOption = new Map<string, IQuoteOptionProduct[]>();
  for (const product of products) {
    const current = productsByOption.get(product.quote_option_id) ?? [];
    current.push({ id: product.id, name: product.name, price: product.price, storagePath: product.image_path ?? '', url: '' });
    productsByOption.set(product.quote_option_id, current);
  }
  return options.map((row) => mapQuoteOption(row, productsByOption.get(row.id) ?? []));
};

export const fetchQuoteOption = async (optionId: string): Promise<IQuoteOption> => {
  const supabase = getSupabaseClient();
  const [{ data: option, error: optionError }, { data: products, error: productsError }] = await Promise.all([
    supabase.from('quote_option_masters').select('*').eq('id', optionId).single(),
    supabase.from('quote_option_products').select('*').eq('quote_option_id', optionId).order('created_at'),
  ]);
  if (optionError) throw optionError;
  if (productsError) throw productsError;
  return mapQuoteOption(option, await createSignedProducts(products));
};

export const updateQuoteOption = async (input: IUpdateQuoteOptionInput): Promise<IQuoteOption> => {
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new QuoteOptionManagementError('unauthorized', ERROR_MESSAGES.unauthorized);

  const uploadedPaths: string[] = [];
  let databaseUpdated = false;
  try {
    const products: TJson[] = [];
    for (const product of input.products) {
      if (!product.image) throw new QuoteOptionManagementError('missing_product_image', ERROR_MESSAGES.missing_product_image);
      const imagePath = product.image.kind === 'stored'
        ? product.image.storagePath
        : await uploadImage(input.optionId, product.image.asset);
      if (product.image.kind === 'new') uploadedPaths.push(imagePath);
      products.push({ id: product.id ?? null, name: product.name.trim(), price: product.price, image_path: imagePath });
    }
    const { error } = await supabase.rpc('update_quote_option_master', {
      target_option_id: input.optionId,
      target_name: input.name.trim(),
      target_display_order: input.displayOrder,
      target_form_type: input.formType,
      target_products: products,
    });
    if (error) throw error;
    databaseUpdated = true;
    return await fetchQuoteOption(input.optionId);
  } catch (error) {
    const cleanupPaths = getUploadCleanupPaths(databaseUpdated, uploadedPaths);
    await enqueueImageCleanup(await removeStoragePaths(cleanupPaths));
    if (error instanceof QuoteOptionManagementError) throw error;
    throw new QuoteOptionManagementError('unknown', ERROR_MESSAGES.unknown);
  }
};
