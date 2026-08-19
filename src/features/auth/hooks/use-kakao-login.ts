import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../api';
import { AuthError } from '../types';

WebBrowser.maybeCompleteAuthSession();

export function useKakaoLogin() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const redirectTo = Linking.createURL('auth/callback');
      const { authorizationUrl } = await authApi.createKakaoOAuthUrl({ redirectTo });
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectTo);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new AuthError('oauth_cancelled', '카카오 로그인이 취소되었습니다.');
      }
      if (result.type !== 'success') {
        throw new AuthError(
          'oauth_failed',
          '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      // The dedicated /auth/callback route owns PKCE code exchange so Android
      // warm starts and cold starts follow the same single-use flow.
    },
  });
}
