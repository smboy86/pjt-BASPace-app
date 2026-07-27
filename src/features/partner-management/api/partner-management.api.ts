import type { PostgrestError } from '@supabase/supabase-js';
import { EPartnerApprovalStatus, type IPartner } from '@/entities/partner';
import { getSupabaseClient, type Database } from '@/shared/supabase';
import { PartnerManagementError, type ICreatePartnerInput } from '../types';

const PARTNER_DOCUMENTS_BUCKET = 'partner-documents';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

type TPartnerRow = Pick<
  Database['public']['Tables']['partners']['Row'],
  | 'id'
  | 'company_name'
  | 'business_number'
  | 'business_registration_image_path'
  | 'contact_name'
  | 'contact_phone'
  | 'note'
  | 'service_regions'
  | 'service_types'
  | 'approval_status'
  | 'created_at'
  | 'updated_at'
>;

const mapPartner = (row: TPartnerRow): IPartner => ({
  id: row.id,
  companyName: row.company_name,
  businessNumber: row.business_number,
  businessRegistrationImagePath: row.business_registration_image_path,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  note: row.note,
  serviceRegions: row.service_regions,
  serviceTypes: row.service_types,
  approvalStatus: row.approval_status as EPartnerApprovalStatus,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const normalizeBusinessNumber = (value: string): string => value.replace(/\D/g, '');

const isDuplicateError = (error: PostgrestError): boolean =>
  error.code === '23505' && error.message.includes('partners_business_number_normalized_uidx');

const getImageExtension = (mimeType: string): string => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
};

export const fetchPartners = async (): Promise<IPartner[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('partners')
    .select(
      'id, company_name, business_number, business_registration_image_path, contact_name, contact_phone, note, service_regions, service_types, approval_status, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPartner);
};

export const fetchPartner = async (partnerId: string): Promise<IPartner> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('partners')
    .select(
      'id, company_name, business_number, business_registration_image_path, contact_name, contact_phone, note, service_regions, service_types, approval_status, created_at, updated_at',
    )
    .eq('id', partnerId)
    .single();

  if (error) throw error;
  return mapPartner(data);
};

export const createPartner = async (input: ICreatePartnerInput): Promise<IPartner> => {
  const supabase = getSupabaseClient();
  const normalizedBusinessNumber = normalizeBusinessNumber(input.businessNumber);
  const { data: duplicate, error: duplicateError } = await supabase
    .from('partners')
    .select('id')
    .eq('business_number_normalized', normalizedBusinessNumber)
    .maybeSingle();

  if (duplicateError) throw duplicateError;
  if (duplicate) {
    throw new PartnerManagementError(
      'duplicate_business_number',
      '이미 등록된 사업자등록번호예요.',
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('partners')
    .insert({
      company_name: input.companyName.trim(),
      business_number: input.businessNumber.trim(),
      contact_name: input.contactName.trim(),
      contact_phone: input.contactPhone.trim(),
      note: input.note.trim() || null,
      approval_status: EPartnerApprovalStatus.APPROVED,
    })
    .select(
      'id, company_name, business_number, business_registration_image_path, contact_name, contact_phone, note, service_regions, service_types, approval_status, created_at, updated_at',
    )
    .single();

  if (insertError) {
    if (isDuplicateError(insertError)) {
      throw new PartnerManagementError(
        'duplicate_business_number',
        '이미 등록된 사업자등록번호예요.',
      );
    }
    throw insertError;
  }

  let partner = mapPartner(inserted);
  const image = input.businessRegistrationImage;
  if (!image) return partner;

  const mimeType = image.mimeType ?? 'image/jpeg';
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    await supabase.from('partners').delete().eq('id', partner.id);
    throw new PartnerManagementError(
      'unsupported_image',
      'JPEG, PNG, HEIC 또는 HEIF 이미지만 첨부할 수 있어요.',
    );
  }
  if (image.fileSize && image.fileSize > MAX_IMAGE_BYTES) {
    await supabase.from('partners').delete().eq('id', partner.id);
    throw new PartnerManagementError(
      'image_too_large',
      '사업자등록증 이미지는 10MB 이하만 첨부할 수 있어요.',
    );
  }

  const imagePath = `${partner.id}/business-registration.${getImageExtension(mimeType)}`;

  try {
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error('선택한 이미지를 읽지 못했습니다.');
    const imageBuffer = await response.arrayBuffer();
    if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new PartnerManagementError(
        'image_too_large',
        '사업자등록증 이미지는 10MB 이하만 첨부할 수 있어요.',
      );
    }

    const { error: uploadError } = await supabase.storage
      .from(PARTNER_DOCUMENTS_BUCKET)
      .upload(imagePath, imageBuffer, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;

    const { data: updated, error: updateError } = await supabase
      .from('partners')
      .update({ business_registration_image_path: imagePath })
      .eq('id', partner.id)
      .select(
        'id, company_name, business_number, business_registration_image_path, contact_name, contact_phone, note, service_regions, service_types, approval_status, created_at, updated_at',
      )
      .single();
    if (updateError) throw updateError;

    partner = mapPartner(updated);
    return partner;
  } catch (error) {
    await supabase.storage.from(PARTNER_DOCUMENTS_BUCKET).remove([imagePath]);
    await supabase.from('partners').delete().eq('id', partner.id);
    if (error instanceof PartnerManagementError) throw error;
    throw new PartnerManagementError(
      'upload_failed',
      '사업자등록증을 저장하지 못해 업체 등록을 취소했어요.',
    );
  }
};

export const createPartnerDocumentSignedUrl = async (imagePath: string): Promise<string> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(PARTNER_DOCUMENTS_BUCKET)
    .createSignedUrl(imagePath, 60 * 10);

  if (error) throw error;
  return data.signedUrl;
};
