import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  createClient: vi.fn(),
  startAutoRefresh: vi.fn(),
  stopAutoRefresh: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

vi.mock('react-native-url-polyfill/auto', () => ({}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: mocks.addEventListener,
    currentState: 'active',
  },
  Platform: { OS: 'android' },
}));

vi.mock('@/shared/secure-storage', () => ({
  supabaseSecureStorage: {
    getItem: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('./config', () => ({
  getSupabaseConfig: () => ({
    publishableKey: 'test-publishable-key',
    url: 'https://example.supabase.co',
  }),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.startAutoRefresh.mockResolvedValue(undefined);
  mocks.stopAutoRefresh.mockResolvedValue(undefined);
  mocks.createClient.mockReturnValue({
    auth: {
      startAutoRefresh: mocks.startAutoRefresh,
      stopAutoRefresh: mocks.stopAutoRefresh,
    },
  });
});

test('creates the native Supabase client with encrypted PKCE storage', async () => {
  const { supabaseSecureStorage } = await import('@/shared/secure-storage');
  const { getSupabaseClient } = await import('./client');

  getSupabaseClient();

  expect(mocks.createClient).toHaveBeenCalledWith(
    'https://example.supabase.co',
    'test-publishable-key',
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
        storage: supabaseSecureStorage,
      },
    },
  );
  expect(mocks.startAutoRefresh).toHaveBeenCalledOnce();
});
