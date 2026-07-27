import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { clearAllSecure } from '@/shared/secure-storage';
import { getSupabaseClient } from '@/shared/supabase';
import type { Database } from '@/shared/supabase';
import {
  AuthError,
  type IAuthSession,
  type IAuthUser,
  type ILoginRequest,
  type ILoginResponse,
  type IResendVerificationRequest,
  type ISignupRequest,
  type ISignupResponse,
  type TAuthErrorCode,
} from '../types';

type TProfileRow = Database['public']['Tables']['profiles']['Row'];
type TAuthStateListener = (event: AuthChangeEvent) => void;

const EMAIL_SCHEMA = z.string().trim().toLowerCase().email();
const LOGIN_SCHEMA = z.object({
  email: EMAIL_SCHEMA,
  password: z.string().min(1),
});
const SIGNUP_SCHEMA = z.object({
  email: EMAIL_SCHEMA,
  password: z.string().min(8).regex(/[a-z]/).regex(/[^A-Za-z0-9\s]/),
  name: z.string().trim().min(2).max(80),
});

const AUTH_ERROR_MESSAGES: Record<TAuthErrorCode, string> = {
  invalid_credentials: '이메일 또는 비밀번호를 확인해 주세요.',
  email_not_verified: '이메일 확인을 완료한 뒤 로그인해 주세요.',
  email_already_registered: '이미 가입된 이메일입니다. 로그인해 주세요.',
  invalid_email: '올바른 이메일 주소를 입력해 주세요.',
  weak_password: '비밀번호 보안 기준을 충족하지 못했습니다.',
  rate_limited: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  signup_disabled: '현재 신규 회원가입을 이용할 수 없습니다.',
  account_not_customer: '고객 계정으로 로그인해 주세요.',
  account_inactive: '현재 이용할 수 없는 계정입니다. 고객센터에 문의해 주세요.',
  profile_unavailable: '고객 프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  network_error: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  validation_error: '입력한 정보를 다시 확인해 주세요.',
  unknown: '인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

const createAuthError = (code: TAuthErrorCode): AuthError =>
  new AuthError(code, AUTH_ERROR_MESSAGES[code]);

const readErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  return typeof error.code === 'string' ? error.code : null;
};

const readErrorMessage = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return '';
  }

  return typeof error.message === 'string' ? error.message.toLowerCase() : '';
};

export const mapAuthError = (error: unknown): AuthError => {
  if (error instanceof AuthError) {
    return error;
  }

  const code = readErrorCode(error);
  const message = readErrorMessage(error);

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return createAuthError('invalid_credentials');
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return createAuthError('email_not_verified');
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return createAuthError('email_already_registered');
  }
  if (code === 'email_address_invalid' || message.includes('invalid email')) {
    return createAuthError('invalid_email');
  }
  if (code === 'weak_password') {
    return createAuthError('weak_password');
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    code === 'too_many_requests' ||
    message.includes('rate limit')
  ) {
    return createAuthError('rate_limited');
  }
  if (code === 'signup_disabled') {
    return createAuthError('signup_disabled');
  }
  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror')
  ) {
    return createAuthError('network_error');
  }

  return createAuthError('unknown');
};

const mapSession = (session: Session): IAuthSession => ({
  expiresAt: session.expires_at ?? null,
});

const mapCustomer = (user: User, profile: TProfileRow): IAuthUser => ({
  id: user.id,
  email: user.email ?? '',
  name: profile.display_name.trim() || null,
  role: profile.role,
  status: profile.status,
  emailVerified: user.email_confirmed_at !== undefined && user.email_confirmed_at !== null,
});

const mapPendingCustomer = (user: User, name: string): IAuthUser => ({
  id: user.id,
  email: user.email ?? '',
  name,
  role: 'customer',
  status: 'active',
  emailVerified: false,
});

const validateLogin = (input: ILoginRequest): ILoginRequest => {
  const result = LOGIN_SCHEMA.safeParse(input);

  if (!result.success) {
    throw createAuthError('validation_error');
  }

  return result.data;
};

const validateSignup = (input: ISignupRequest): ISignupRequest => {
  const result = SIGNUP_SCHEMA.safeParse(input);

  if (!result.success) {
    throw createAuthError('validation_error');
  }

  return result.data;
};

const clearLocalSession = async (): Promise<void> => {
  try {
    await getSupabaseClient().auth.signOut({ scope: 'local' });
  } finally {
    await clearAllSecure();
  }
};

const loadCustomer = async (user: User): Promise<IAuthUser> => {
  if (!user.email_confirmed_at) {
    throw createAuthError('email_not_verified');
  }

  const { data: profile, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, role, status, display_name, phone, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw createAuthError('profile_unavailable');
  }
  if (profile.role !== 'customer') {
    throw createAuthError('account_not_customer');
  }
  if (profile.status !== 'active') {
    throw createAuthError('account_inactive');
  }

  return mapCustomer(user, profile);
};

export const authApi = {
  login: async (input: ILoginRequest): Promise<ILoginResponse> => {
    try {
      const credentials = validateLogin(input);
      const { data, error } = await getSupabaseClient().auth.signInWithPassword(credentials);

      if (error) {
        throw error;
      }

      try {
        return {
          session: mapSession(data.session),
          user: await loadCustomer(data.user),
        };
      } catch (error: unknown) {
        await clearLocalSession();
        throw error;
      }
    } catch (error: unknown) {
      throw mapAuthError(error);
    }
  },

  signup: async (input: ISignupRequest): Promise<ISignupResponse> => {
    try {
      const customer = validateSignup(input);
      const { data, error } = await getSupabaseClient().auth.signUp({
        email: customer.email,
        password: customer.password,
        options: {
          data: {
            display_name: customer.name,
          },
        },
      });

      if (error) {
        throw error;
      }
      if (!data.user) {
        throw createAuthError('unknown');
      }

      // The customer flow always requires an email confirmation. Clear an
      // unexpected immediate session if confirmation is disabled server-side.
      if (data.session) {
        await clearLocalSession();
      }

      return {
        session: null,
        user: mapPendingCustomer(data.user, customer.name),
        verificationRequired: true,
      };
    } catch (error: unknown) {
      throw mapAuthError(error);
    }
  },

  resendVerification: async (input: IResendVerificationRequest): Promise<void> => {
    try {
      const result = EMAIL_SCHEMA.safeParse(input.email);

      if (!result.success) {
        throw createAuthError('invalid_email');
      }

      const { error } = await getSupabaseClient().auth.resend({
        type: 'signup',
        email: result.data,
      });

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      throw mapAuthError(error);
    }
  },

  restoreSession: async (): Promise<ILoginResponse | null> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await getSupabaseClient().auth.getSession();

      if (sessionError) {
        throw sessionError;
      }
      if (!session) {
        return null;
      }

      const {
        data: { user },
        error: userError,
      } = await getSupabaseClient().auth.getUser();

      if (userError) {
        const mappedError = mapAuthError(userError);

        if (mappedError.code !== 'network_error') {
          await clearLocalSession();
        }
        throw mappedError;
      }
      if (!user) {
        await clearLocalSession();
        return null;
      }

      try {
        return {
          session: mapSession(session),
          user: await loadCustomer(user),
        };
      } catch (error: unknown) {
        const mappedError = mapAuthError(error);

        if (mappedError.code !== 'profile_unavailable' && mappedError.code !== 'network_error') {
          await clearLocalSession();
        }
        throw mappedError;
      }
    } catch (error: unknown) {
      throw mapAuthError(error);
    }
  },

  subscribe: (listener: TAuthStateListener): (() => void) => {
    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((event) => listener(event));

    return () => subscription.unsubscribe();
  },

  logout: async (): Promise<void> => {
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Secure storage is still cleared below.
        }
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Secure storage is still cleared below.
      }
    } finally {
      await clearAllSecure();
    }
  },
};
