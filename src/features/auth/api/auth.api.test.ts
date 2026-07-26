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

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clearAllSecure.mockResolvedValue([]);
    mocks.signOut.mockResolvedValue({ error: null });
  });

  test('logs in only after loading an active customer profile', async () => {
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

  test('clears a session when a non-customer account enters the customer flow', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: SESSION, user: AUTH_USER },
      error: null,
    });
    mocks.single.mockResolvedValue({
      data: { ...CUSTOMER_PROFILE, role: 'admin' },
      error: null,
    });

    await expect(
      authApi.login({ email: AUTH_USER.email, password: 'Password1' }),
    ).rejects.toMatchObject({
      code: 'account_not_customer',
    });
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
