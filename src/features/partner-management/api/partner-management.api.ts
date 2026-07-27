import { FunctionsHttpError } from '@supabase/supabase-js';
import { EPartnerApprovalStatus, type IPartner } from '@/entities/partner';
import { getSupabaseClient, type Database } from '@/shared/supabase';
import {
  PartnerManagementError,
  type ICreatePartnerInput,
  type IPartnerWorkspace,
  type TPartnerManagementErrorCode,
} from '../types';

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

interface ICreatePartnerFunctionResponse {
  partner: TPartnerRow;
  representativeEmail: string;
}

const ERROR_MESSAGES: Record<TPartnerManagementErrorCode, string> = {
  duplicate_business_number: '이미 등록된 사업자등록번호예요.',
  email_already_registered: '이미 등록된 로그인 이메일이에요.',
  image_too_large: '사업자등록증 이미지는 10MB 이하만 첨부할 수 있어요.',
  invalid_email: '올바른 이메일 주소를 입력해 주세요.',
  unauthorized: '관리자 로그인 정보를 다시 확인해 주세요.',
  unsupported_image: 'JPEG, PNG, HEIC 또는 HEIF 이미지만 첨부할 수 있어요.',
  upload_failed: '사업자등록증을 저장하지 못해 업체 등록을 취소했어요.',
  validation_error: '필수 입력값을 다시 확인해 주세요.',
  weak_password: '비밀번호는 영문 소문자와 특수문자를 포함해 8자 이상이어야 합니다.',
  unknown: '업체 계정을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

const mapPartner = (row: TPartnerRow, representativeEmail: string | null): IPartner => ({
  id: row.id,
  companyName: row.company_name,
  businessNumber: row.business_number,
  businessRegistrationImagePath: row.business_registration_image_path,
  representativeEmail,
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

const getImageExtension = (mimeType: string): string => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
};

const isPartnerManagementErrorCode = (value: unknown): value is TPartnerManagementErrorCode =>
  typeof value === 'string' && Object.hasOwn(ERROR_MESSAGES, value);

const mapFunctionError = async (error: unknown): Promise<PartnerManagementError> => {
  if (error instanceof PartnerManagementError) return error;

  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        const code = body.code;
        if (isPartnerManagementErrorCode(code)) {
          return new PartnerManagementError(code, ERROR_MESSAGES[code]);
        }
      }
    } catch {
      // A stable generic error is returned when the response is not JSON.
    }
  }

  return new PartnerManagementError('unknown', ERROR_MESSAGES.unknown);
};

const fetchRepresentativeEmails = async (partnerIds: string[]): Promise<Map<string, string>> => {
  const emails = new Map<string, string>();
  if (partnerIds.length === 0) return emails;

  const { data, error } = await getSupabaseClient()
    .from('partner_login_accounts')
    .select('partner_id, login_email')
    .in('partner_id', partnerIds);
  if (error) throw error;

  data.forEach((account) => emails.set(account.partner_id, account.login_email));
  return emails;
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
  const emails = await fetchRepresentativeEmails(data.map((partner) => partner.id));
  return data.map((partner) => mapPartner(partner, emails.get(partner.id) ?? null));
};

export const fetchPartner = async (partnerId: string): Promise<IPartner> => {
  const supabase = getSupabaseClient();
  const [{ data: partner, error: partnerError }, { data: account, error: accountError }] =
    await Promise.all([
      supabase
        .from('partners')
        .select(
          'id, company_name, business_number, business_registration_image_path, contact_name, contact_phone, note, service_regions, service_types, approval_status, created_at, updated_at',
        )
        .eq('id', partnerId)
        .single(),
      supabase
        .from('partner_login_accounts')
        .select('login_email')
        .eq('partner_id', partnerId)
        .maybeSingle(),
    ]);

  if (partnerError) throw partnerError;
  if (accountError) throw accountError;
  return mapPartner(partner, account?.login_email ?? null);
};

const uploadBusinessRegistrationImage = async (
  input: ICreatePartnerInput,
): Promise<string | null> => {
  const image = input.businessRegistrationImage;
  if (!image) return null;

  const mimeType = image.mimeType ?? 'image/jpeg';
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new PartnerManagementError('unsupported_image', ERROR_MESSAGES.unsupported_image);
  }
  if (image.fileSize && image.fileSize > MAX_IMAGE_BYTES) {
    throw new PartnerManagementError('image_too_large', ERROR_MESSAGES.image_too_large);
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new PartnerManagementError('unauthorized', ERROR_MESSAGES.unauthorized);
  }

  const response = await fetch(image.uri);
  if (!response.ok) {
    throw new PartnerManagementError('upload_failed', ERROR_MESSAGES.upload_failed);
  }
  const imageBuffer = await response.arrayBuffer();
  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new PartnerManagementError('image_too_large', ERROR_MESSAGES.image_too_large);
  }

  const imagePath = `${user.id}/registrations/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${getImageExtension(mimeType)}`;
  const { error: uploadError } = await supabase.storage
    .from(PARTNER_DOCUMENTS_BUCKET)
    .upload(imagePath, imageBuffer, { contentType: mimeType, upsert: false });
  if (uploadError) {
    throw new PartnerManagementError('upload_failed', ERROR_MESSAGES.upload_failed);
  }

  return imagePath;
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
      ERROR_MESSAGES.duplicate_business_number,
    );
  }

  let imagePath: string | null = null;
  try {
    imagePath = await uploadBusinessRegistrationImage(input);
    const { data, error } = await supabase.functions.invoke<ICreatePartnerFunctionResponse>(
      'create-partner-account',
      {
        body: {
          companyName: input.companyName.trim(),
          businessNumber: input.businessNumber.trim(),
          businessRegistrationImagePath: imagePath,
          representativeEmail: input.representativeEmail.trim().toLowerCase(),
          password: input.password,
          contactName: input.contactName.trim(),
          contactPhone: input.contactPhone.trim(),
          note: input.note.trim(),
        },
      },
    );

    if (error) throw await mapFunctionError(error);
    if (!data?.partner?.id) {
      throw new PartnerManagementError('unknown', ERROR_MESSAGES.unknown);
    }

    return mapPartner(data.partner, data.representativeEmail);
  } catch (error) {
    if (imagePath) {
      await supabase.storage.from(PARTNER_DOCUMENTS_BUCKET).remove([imagePath]);
    }
    throw await mapFunctionError(error);
  }
};

export const fetchCurrentPartnerWorkspace = async (): Promise<IPartnerWorkspace | null> => {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from('partner_members')
    .select('partner_id, is_manager')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('company_name')
    .eq('id', membership.partner_id)
    .single();
  if (partnerError) throw partnerError;

  return {
    partnerId: membership.partner_id,
    companyName: partner.company_name,
    isManager: membership.is_manager,
  };
};

export const createPartnerDocumentSignedUrl = async (imagePath: string): Promise<string> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(PARTNER_DOCUMENTS_BUCKET)
    .createSignedUrl(imagePath, 60 * 10);

  if (error) throw error;
  return data.signedUrl;
};
