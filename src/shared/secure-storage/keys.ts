export const SECURE_KEYS = {
  ACCESS_TOKEN: 'auth.access_token',
  REFRESH_TOKEN: 'auth.refresh_token',
  SUPABASE_SESSION: 'auth.supabase_session',
} as const;

export type TSecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];
