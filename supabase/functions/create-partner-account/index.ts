import { createClient } from 'npm:@supabase/supabase-js@2.110.8';

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_LOWERCASE_PATTERN = /[a-z]/;
const PASSWORD_SPECIAL_PATTERN = /[^A-Za-z0-9\s]/;

type TErrorCode =
  | 'duplicate_business_number'
  | 'email_already_registered'
  | 'forbidden'
  | 'invalid_email'
  | 'unauthorized'
  | 'unknown'
  | 'validation_error'
  | 'weak_password';

interface IPartnerAccountRequest {
  businessNumber: string;
  businessRegistrationImagePath: string | null;
  companyName: string;
  contactName: string;
  contactPhone: string;
  note: string;
  password: string;
  representativeEmail: string;
}

const respond = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });

const readString = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === 'string' ? record[key] : '';

const parseRequest = (value: unknown): IPartnerAccountRequest | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const imagePathValue = record.businessRegistrationImagePath;
  if (imagePathValue !== null && typeof imagePathValue !== 'string') {
    return null;
  }

  return {
    businessNumber: readString(record, 'businessNumber').trim(),
    businessRegistrationImagePath: imagePathValue,
    companyName: readString(record, 'companyName').trim(),
    contactName: readString(record, 'contactName').trim(),
    contactPhone: readString(record, 'contactPhone').trim(),
    note: readString(record, 'note').trim(),
    password: readString(record, 'password'),
    representativeEmail: readString(record, 'representativeEmail').trim().toLowerCase(),
  };
};

const errorMessage = (code: TErrorCode): string => {
  const messages: Record<TErrorCode, string> = {
    duplicate_business_number: '이미 등록된 사업자등록번호예요.',
    email_already_registered: '이미 등록된 로그인 이메일이에요.',
    forbidden: '관리자만 업체 계정을 등록할 수 있어요.',
    invalid_email: '올바른 이메일 주소를 입력해 주세요.',
    unauthorized: '로그인 정보를 다시 확인해 주세요.',
    unknown: '업체 계정을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
    validation_error: '필수 입력값을 다시 확인해 주세요.',
    weak_password: '비밀번호는 영문 소문자와 특수문자를 포함해 8자 이상이어야 합니다.',
  };

  return messages[code];
};

const errorResponse = (status: number, code: TErrorCode): Response =>
  respond(status, { code, message: errorMessage(code) });

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return respond(405, { code: 'method_not_allowed', message: 'POST 요청만 지원합니다.' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return errorResponse(401, 'unauthorized');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse(500, 'unknown');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const accessToken = authorization.slice('Bearer '.length);
  const { data: callerData, error: callerError } =
    await supabaseAdmin.auth.getUser(accessToken);
  if (callerError || !callerData.user) {
    return errorResponse(401, 'unauthorized');
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
    .from('profiles')
    .select('role, status')
    .eq('id', callerData.user.id)
    .single();
  if (
    callerProfileError ||
    callerProfile?.role !== 'admin' ||
    callerProfile.status !== 'active'
  ) {
    return errorResponse(403, 'forbidden');
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, 'validation_error');
  }

  const input = parseRequest(rawBody);
  if (
    !input ||
    !input.companyName ||
    !input.businessNumber ||
    !input.contactName ||
    !input.contactPhone ||
    !input.representativeEmail ||
    !input.password
  ) {
    return errorResponse(400, 'validation_error');
  }
  if (!EMAIL_PATTERN.test(input.representativeEmail)) {
    return errorResponse(400, 'invalid_email');
  }
  if (
    input.password.length < 8 ||
    !PASSWORD_LOWERCASE_PATTERN.test(input.password) ||
    !PASSWORD_SPECIAL_PATTERN.test(input.password)
  ) {
    return errorResponse(400, 'weak_password');
  }
  if (
    input.businessRegistrationImagePath &&
    !input.businessRegistrationImagePath.startsWith(`${callerData.user.id}/registrations/`)
  ) {
    return errorResponse(400, 'validation_error');
  }

  const normalizedBusinessNumber = input.businessNumber.replace(/\D/g, '');
  const { data: existingPartner, error: existingPartnerError } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('business_number_normalized', normalizedBusinessNumber)
    .maybeSingle();
  if (existingPartnerError) {
    return errorResponse(500, 'unknown');
  }
  if (existingPartner) {
    return errorResponse(409, 'duplicate_business_number');
  }

  const { data: createdUser, error: createUserError } =
    await supabaseAdmin.auth.admin.createUser({
      email: input.representativeEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        display_name: input.contactName,
      },
    });
  if (createUserError || !createdUser.user) {
    if (
      createUserError?.code === 'email_exists' ||
      createUserError?.code === 'user_already_exists'
    ) {
      return errorResponse(409, 'email_already_registered');
    }
    if (createUserError?.code === 'weak_password') {
      return errorResponse(400, 'weak_password');
    }
    return errorResponse(500, 'unknown');
  }

  const { data: partner, error: partnerError } = await supabaseAdmin.rpc(
    'create_partner_with_representative',
    {
      p_target_user_id: createdUser.user.id,
      p_company_name: input.companyName,
      p_business_number: input.businessNumber,
      p_business_registration_image_path: input.businessRegistrationImagePath,
      p_contact_name: input.contactName,
      p_contact_phone: input.contactPhone,
      p_login_email: input.representativeEmail,
      p_note: input.note,
    },
  );

  if (partnerError || !partner) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    if (
      partnerError?.code === '23505' &&
      partnerError.message.includes('partners_business_number_normalized_uidx')
    ) {
      return errorResponse(409, 'duplicate_business_number');
    }
    if (
      partnerError?.code === '23505' &&
      partnerError.message.includes('partner_login_accounts_login_email_uidx')
    ) {
      return errorResponse(409, 'email_already_registered');
    }
    return errorResponse(500, 'unknown');
  }

  return respond(201, {
    partner,
    representativeEmail: input.representativeEmail,
  });
});
