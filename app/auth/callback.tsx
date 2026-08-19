import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi, mapAuthError, useAuthStore } from '@/features/auth';

const CALLBACK_ERROR_MESSAGE = '인증을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const readSingleParam = (value: string | string[] | undefined): string | null => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
};

export default function SocialAuthCallbackScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
  }>();
  const handledCodeRef = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const callbackError =
      readSingleParam(params.error) ??
      readSingleParam(params.error_code) ??
      readSingleParam(params.error_description);
    if (callbackError) {
      setErrorMessage(CALLBACK_ERROR_MESSAGE);
      return;
    }

    const code = readSingleParam(params.code);
    if (!code) {
      setErrorMessage(CALLBACK_ERROR_MESSAGE);
      return;
    }
    if (handledCodeRef.current === code) return;
    handledCodeRef.current = code;

    let isActive = true;

    void authApi
      .completeCustomerAuthCallback(code)
      .then(({ session, user }) => {
        useAuthStore.getState().setAuthenticated(session, user);
        if (isActive) router.replace('/(tabs)/home');
      })
      .catch((error: unknown) => {
        useAuthStore.getState().setUnauthenticated();
        if (isActive) setErrorMessage(mapAuthError(error).message);
      });

    return () => {
      isActive = false;
    };
  }, [params.code, params.error, params.error_code, params.error_description]);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
      <View className="w-full rounded-3xl border border-stone-100 bg-white p-6">
        {errorMessage ? (
          <>
            <Text accessibilityRole="alert" className="text-xl font-bold text-ink-900">
              로그인을 완료하지 못했어요.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">{errorMessage}</Text>
            <Pressable
              accessibilityLabel="로그인 화면으로 돌아가기"
              accessibilityRole="button"
              className="mt-5 min-h-12 items-center justify-center rounded-xl bg-brand-900 active:opacity-80"
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text className="font-bold text-white">로그인으로 돌아가기</Text>
            </Pressable>
          </>
        ) : (
          <View className="items-center py-3">
            <ActivityIndicator color="#123F3B" size="large" />
            <Text className="mt-4 text-lg font-bold text-ink-900">로그인을 완료하고 있어요.</Text>
            <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
              잠시만 기다려 주세요.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
