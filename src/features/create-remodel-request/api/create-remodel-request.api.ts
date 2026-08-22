import { calculateFloorTilePrice, FLOOR_TILE_OPTION_CODE } from '@/entities/quote-option';
import {
  ERemodelRequestStatus,
  ERemodelScope,
  ESelectionDecision,
  type IRemodelRequest,
} from '@/entities/remodel-request';
import { getSupabaseClient, type TJson } from '@/shared/supabase';
import type { ISubmitRemodelRequestInput } from '../types';

const REQUEST_PHOTOS_BUCKET = 'request-photos';
const MAX_PHOTO_BYTES = 1_572_864;

interface IUploadedPhoto {
  category: 'bathroom';
  mimeType: 'image/jpeg';
  sizeBytes: number;
  sortOrder: number;
  storagePath: string;
}

const toPhotoPayload = (photos: IUploadedPhoto[]): TJson[] =>
  photos.map((photo) => ({
    category: photo.category,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    sortOrder: photo.sortOrder,
    storagePath: photo.storagePath,
  }));

const isJpeg = (buffer: ArrayBuffer): boolean => {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
};

const removeUploadedPhotos = async (storagePaths: string[]): Promise<void> => {
  if (storagePaths.length === 0) return;

  const storage = getSupabaseClient().storage.from(REQUEST_PHOTOS_BUCKET);
  const firstAttempt = await storage.remove(storagePaths);
  if (!firstAttempt.error) return;

  const secondAttempt = await storage.remove(storagePaths);
  if (secondAttempt.error) {
    throw new Error('업로드 실패 사진을 정리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
};

const uploadPhotos = async (
  customerId: string,
  photos: ISubmitRemodelRequestInput['photos'],
): Promise<IUploadedPhoto[]> => {
  if (photos.length > 5) throw new Error('욕실 사진은 최대 5장까지 등록할 수 있어요.');

  const uploadedPhotos: IUploadedPhoto[] = [];
  try {
    for (const [index, photo] of photos.entries()) {
      if (!photo.localUri) throw new Error('업로드할 욕실 사진을 찾지 못했어요.');

      const response = await fetch(photo.localUri);
      if (!response.ok) throw new Error('욕실 사진을 읽지 못했어요.');
      const buffer = await response.arrayBuffer();
      if (!isJpeg(buffer)) throw new Error('압축된 JPEG 욕실 사진만 업로드할 수 있어요.');
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_PHOTO_BYTES) {
        throw new Error('욕실 사진은 장당 1.5MB 이하여야 해요.');
      }

      const storagePath = `${customerId}/${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 10)}.jpg`;
      const { error } = await getSupabaseClient()
        .storage.from(REQUEST_PHOTOS_BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      if (error) throw error;

      uploadedPhotos.push({
        category: 'bathroom',
        mimeType: 'image/jpeg',
        sizeBytes: buffer.byteLength,
        sortOrder: index,
        storagePath,
      });
    }
    return uploadedPhotos;
  } catch (error) {
    await removeUploadedPhotos(uploadedPhotos.map((photo) => photo.storagePath));
    throw error;
  }
};

const toSelectionPayload = (input: ISubmitRemodelRequestInput): TJson[] =>
  input.selections.map((selection) => ({
    optionId: selection.optionId,
    productId: selection.productId,
  }));

export const submitRemodelRequest = async (
  input: ISubmitRemodelRequestInput,
): Promise<IRemodelRequest> => {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || user.id !== input.customerId) {
    throw new Error('로그인 고객 정보가 일치하지 않아요. 다시 로그인해 주세요.');
  }

  const uploadedPhotos = await uploadPhotos(user.id, input.photos);
  let requestId: string;
  try {
    const { data, error } = await supabase.rpc('submit_customer_remodel_request_with_photos', {
      target_address_detail: input.addressDetail,
      target_bathroom_height: input.bathroomHeight,
      target_bathroom_length: input.bathroomLength,
      target_bathroom_width: input.bathroomWidth,
      target_budget_range: input.budgetCode,
      target_desired_construction_date: input.desiredConstructionDate,
      target_notes: input.notes,
      target_photos: toPhotoPayload(uploadedPhotos),
      target_region: input.region,
      target_requires_demolition: input.requiresDemolition,
      target_selections: toSelectionPayload(input),
    });
    if (error) throw error;
    requestId = data;
  } catch (error) {
    await removeUploadedPhotos(uploadedPhotos.map((photo) => photo.storagePath));
    throw error;
  }

  const now = new Date().toISOString();

  return {
    id: requestId,
    customerId: input.customerId,
    status: ERemodelRequestStatus.SUBMITTED,
    region: input.region,
    addressDetail: input.addressDetail,
    housingType: '아파트',
    bathroomType: '공용 욕실',
    bathroomWidth: input.bathroomWidth,
    bathroomLength: input.bathroomLength,
    bathroomHeight: input.bathroomHeight,
    estimatedSize: '약 3㎡',
    hasBathtub: false,
    requiresDemolition: input.requiresDemolition,
    budgetRange: input.budgetCode,
    desiredSchedule: input.desiredConstructionDate,
    customerDesiredSchedule: input.desiredConstructionDate,
    scope: ERemodelScope.FULL,
    priorities: [],
    notes: input.notes,
    photos: input.photos.map((photo, index) => ({
      ...photo,
      displayUri: photo.localUri,
      storagePath: uploadedPhotos[index]?.storagePath,
      mimeType: uploadedPhotos[index]?.mimeType,
      sizeBytes: uploadedPhotos[index]?.sizeBytes,
    })),
    selections: input.selections.map((selection) => {
      const floorTilePrice =
        selection.optionCode === FLOOR_TILE_OPTION_CODE
          ? calculateFloorTilePrice({
              bathroomLengthMm: input.bathroomLength,
              bathroomWidthMm: input.bathroomWidth,
              unitPrice: selection.price,
            })
          : null;

      return {
        id: `${requestId}-${selection.optionId}`,
        category: selection.optionName,
        itemName: selection.productName,
        optionCode: selection.optionCode,
        selectedOptionIds: [selection.productId],
        selectedOptionNames: [selection.productName],
        tileSize: selection.tileSize,
        unitPriceSnapshot: selection.price,
        priceCalculationUnavailable: floorTilePrice ? !floorTilePrice.isCalculable : undefined,
        basePriceSnapshot: floorTilePrice?.amount ?? selection.price,
        decisionStatus: ESelectionDecision.SELECTED,
      };
    }),
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
};
