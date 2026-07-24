import type { Session, User } from '@supabase/supabase-js';
import { clearAllSecure } from '@/shared/secure-storage';
import { getSupabaseClient } from '@/shared/supabase';
import type {
  IAuthSession,
  IAuthUser,
  ILoginRequest,
  ILoginResponse,
  ISignupRequest,
  ISignupResponse,
} from '../types';

const mapUser = (user: User): IAuthUser => ({
  id: user.id,
  email: user.email ?? '',
  name:
    typeof user.user_metadata.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user.user_metadata.name === 'string'
        ? user.user_metadata.name
        : null,
});

const mapSession = (session: Session): IAuthSession => ({
  expiresAt: session.expires_at ?? null,
});

export const authApi = {
  login: async (data: ILoginRequest): Promise<ILoginResponse> => {
    const { data: authData, error } = await getSupabaseClient().auth.signInWithPassword(data);

    if (error) {
      throw error;
    }

    return {
      session: mapSession(authData.session),
      user: mapUser(authData.user),
    };
  },

  signup: async (data: ISignupRequest): Promise<ISignupResponse> => {
    const { data: authData, error } = await getSupabaseClient().auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.name,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!authData.user) {
      throw new Error('Supabase did not return a user after sign-up.');
    }

    return {
      session: authData.session ? mapSession(authData.session) : null,
      user: mapUser(authData.user),
    };
  },

  logout: async (): Promise<void> => {
    try {
      const { error } = await getSupabaseClient().auth.signOut();

      if (error) {
        throw error;
      }
    } finally {
      await clearAllSecure();
    }
  },
};
