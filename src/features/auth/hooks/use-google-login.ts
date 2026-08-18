import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authApi, mapAuthError } from '../api';
import { useAuthStore } from '../store';
import { AuthError, type ILoginResponse } from '../types';

WebBrowser.maybeCompleteAuthSession();

const readCallbackValue = (url: string, key: string): string | null => {
  const parsed = Linking.parse(url);
  const value = parsed.queryParams?.[key];
  return typeof value === 'string' ? value : null;
};

export function useGoogleLogin() {
  return useMutation<ILoginResponse, Error, void>({
    mutationFn: async () => {
      const redirectTo = Linking.createURL('auth/callback');
      const { authorizationUrl } = await authApi.createGoogleOAuthUrl({ redirectTo });
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectTo);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new AuthError('oauth_cancelled', 'Google 로그인이 취소되었습니다.');
      }
      if (result.type !== 'success') {
        throw new AuthError(
          'oauth_failed',
          'Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      const callbackError = readCallbackValue(result.url, 'error_description');
      if (callbackError) throw mapAuthError(new Error(callbackError));

      const code = readCallbackValue(result.url, 'code');
      if (!code) {
        throw new AuthError(
          'oauth_failed',
          'Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      return authApi.completeGoogleLogin(code);
    },
    onSuccess: ({ session, user }) => {
      useAuthStore.getState().setAuthenticated(session, user);
    },
  });
}
