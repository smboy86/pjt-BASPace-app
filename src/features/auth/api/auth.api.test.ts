import { beforeEach, describe, expect, test, vi } from 'vitest';
import { authApi, mapAuthError } from './auth.api';
import { AuthError } from '../types';

const mocks = vi.hoisted(() => ({
  clearAllSecure: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  resend: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/shared/secure-storage', () => ({
  clearAllSecure: mocks.clearAllSecure,
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      resend: mocks.resend,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: mocks.signUp,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mocks.single,
        }),
      }),
    }),
  }),
}));

const AUTH_USER = {
  id: 'user-1',
  email: 'customer@example.com',
  email_confirmed_at: '2026-07-25T00:00:00.000Z',
  user_metadata: { display_name: '고객' },
};

const SESSION = {
  expires_at: 1_800_000_000,
};

const CUSTOMER_PROFILE = {
  id: 'user-1',
  role: 'customer',
  status: 'active',
  display_name: '고객',
  phone: null,
  created_at: '2026-07-25T00:00:00.000Z',
  updated_at: '2026-07-25T00:00:00.000Z',
};

const ADMIN_PROFILE = {
  ...CUSTOMER_PROFILE,
  role: 'admin',
  display_name: '관리자',
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clearAllSecure.mockResolvedValue([]);
    mocks.signOut.mockResolvedValue({ error: null });
  });

  test('logs in after loading an active customer profile', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: SESSION, user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({ data: CUSTOMER_PROFILE, error: null });

    await expect(
      authApi.login({ email: ' Customer@Example.com ', password: 'Password1' }),
    ).resolves.toEqual({
      session: { expiresAt: SESSION.expires_at },
      user: {
        id: AUTH_USER.id,
        email: AUTH_USER.email,
        name: CUSTOMER_PROFILE.display_name,
        role: 'customer',
        status: 'active',
        emailVerified: true,
      },
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'customer@example.com',
      password: 'Password1',
    });
  });

  test('logs in after loading an active admin profile', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: SESSION, user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({ data: ADMIN_PROFILE, error: null });

    await expect(authApi.login({ email: AUTH_USER.email, password: 'Password1' })).resolves.toEqual(
      {
        session: { expiresAt: SESSION.expires_at },
        user: {
          id: AUTH_USER.id,
          email: AUTH_USER.email,
          name: ADMIN_PROFILE.display_name,
          role: 'admin',
          status: 'active',
          emailVerified: true,
        },
      },
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.clearAllSecure).not.toHaveBeenCalled();
  });

  test('restores an active admin session', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: SESSION },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({ data: ADMIN_PROFILE, error: null });

    await expect(authApi.restoreSession()).resolves.toEqual({
      session: { expiresAt: SESSION.expires_at },
      user: {
        id: AUTH_USER.id,
        email: AUTH_USER.email,
        name: ADMIN_PROFILE.display_name,
        role: 'admin',
        status: 'active',
        emailVerified: true,
      },
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.clearAllSecure).not.toHaveBeenCalled();
  });

  test('rejects an unsupported partner account and clears its local session', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: SESSION, user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: { ...CUSTOMER_PROFILE, role: 'partner_staff' },
      error: null,
    });

    await expect(
      authApi.login({ email: AUTH_USER.email, password: 'Password1' }),
    ).rejects.toMatchObject({
      code: 'unsupported_role',
      message: '업체 담당자 계정은 아직 앱에서 지원하지 않습니다.',
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.clearAllSecure).toHaveBeenCalledOnce();
  });

  test('preserves the unsupported-role error when local Supabase sign-out throws', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: SESSION, user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: { ...CUSTOMER_PROFILE, role: 'partner_staff' },
      error: null,
    });
    mocks.signOut.mockRejectedValue(new Error('Local auth storage unavailable'));

    await expect(
      authApi.login({ email: AUTH_USER.email, password: 'Password1' }),
    ).rejects.toMatchObject({
      code: 'unsupported_role',
      message: '업체 담당자 계정은 아직 앱에서 지원하지 않습니다.',
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.clearAllSecure).toHaveBeenCalledOnce();
  });

  test('rejects an unsupported restored partner session and clears local credentials', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: SESSION },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: { ...CUSTOMER_PROFILE, role: 'partner_staff' },
      error: null,
    });

    await expect(authApi.restoreSession()).rejects.toMatchObject({
      code: 'unsupported_role',
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.clearAllSecure).toHaveBeenCalledOnce();
  });

  test('rejects an inactive admin account and clears its local session', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: SESSION, user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: { ...ADMIN_PROFILE, status: 'suspended' },
      error: null,
    });

    await expect(
      authApi.login({ email: AUTH_USER.email, password: 'Password1' }),
    ).rejects.toMatchObject({
      code: 'account_inactive',
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.clearAllSecure).toHaveBeenCalledOnce();
  });

  test('rejects an unverified admin account and clears its local session', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: SESSION,
        user: { ...AUTH_USER, email_confirmed_at: null },
      },
      error: null,
    });

    await expect(
      authApi.login({ email: AUTH_USER.email, password: 'Password1' }),
    ).rejects.toMatchObject({
      code: 'email_not_verified',
    });
    expect(mocks.single).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.clearAllSecure).toHaveBeenCalledOnce();
  });

  test('always ends sign-up in an email-verification-required state', async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        session: SESSION,
        user: { ...AUTH_USER, email_confirmed_at: null },
      },
      error: null,
    });

    await expect(
      authApi.signup({
        email: AUTH_USER.email,
        password: 'qwer1234$',
        name: ' 고객 ',
      }),
    ).resolves.toMatchObject({
      verificationRequired: true,
      user: {
        role: 'customer',
        emailVerified: false,
        name: '고객',
      },
    });
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: AUTH_USER.email,
      password: 'qwer1234$',
      options: {
        data: {
          display_name: '고객',
        },
      },
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  test('preserves the stored session when restoration fails because the network is unavailable', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: SESSION },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Network request failed'),
    });

    await expect(authApi.restoreSession()).rejects.toMatchObject({
      code: 'network_error',
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.clearAllSecure).not.toHaveBeenCalled();
  });

  test('clears the stored session when restoration finds invalid credentials', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: SESSION },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'invalid JWT' },
    });

    await expect(authApi.restoreSession()).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.clearAllSecure).toHaveBeenCalledOnce();
  });
});

describe('mapAuthError', () => {
  test('maps backend details to a stable safe error', () => {
    const result = mapAuthError({
      code: 'invalid_credentials',
      message: 'sensitive provider detail',
    });

    expect(result).toBeInstanceOf(AuthError);
    expect(result).toMatchObject({
      code: 'invalid_credentials',
      message: '이메일 또는 비밀번호를 확인해 주세요.',
    });
  });
});
