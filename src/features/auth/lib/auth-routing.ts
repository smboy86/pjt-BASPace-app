import type { TAuthRole } from '../types';

export type TAuthRedirectPath =
  | '/(admin)/dashboard'
  | '/(auth)/login'
  | '/(partner)/dashboard'
  | '/(tabs)/home';

interface IResolveAuthRedirectInput {
  isAuthenticated: boolean;
  role: TAuthRole | null;
  segments: readonly string[];
}

export const resolveAuthRedirect = ({
  isAuthenticated,
  role,
  segments,
}: IResolveAuthRedirectInput): TAuthRedirectPath | null => {
  const currentGroup = segments[0];
  const isInOAuthCallback = segments.join('/') === 'auth/callback';

  // The callback owns its lifecycle even when another account is already
  // authenticated. Redirecting early can desynchronize Supabase and Zustand.
  if (isInOAuthCallback) return null;

  const isInAuthGroup = currentGroup === '(auth)';
  if (!isAuthenticated || !role) {
    return isInAuthGroup ? null : '/(auth)/login';
  }

  if (role === 'admin') {
    return currentGroup === '(admin)' ? null : '/(admin)/dashboard';
  }
  if (role === 'partner_staff') {
    return currentGroup === '(partner)' ? null : '/(partner)/dashboard';
  }
  if (role === 'customer') {
    return currentGroup === '(tabs)' ? null : '/(tabs)/home';
  }

  return isInAuthGroup ? null : '/(auth)/login';
};
