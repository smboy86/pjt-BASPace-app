import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { QueryProvider, ThemeProvider } from '@core/providers';
import { toastConfig, ErrorBoundary } from '@shared/ui';
import { useAuthSession } from '@/features/auth';
import '../global.css';

function AuthenticatedNavigator(): React.JSX.Element {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isAuthenticated, isLoading, error, retry } = useAuthSession();

  useEffect(() => {
    if (!navigationState?.key || isLoading || error) return;

    const isInAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !isInAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && isInAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [error, isAuthenticated, isLoading, navigationState?.key, segments]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50">
        <ActivityIndicator color="#123F3B" size="large" />
        <Text className="mt-4 text-sm font-semibold text-ink-600">
          로그인 정보를 확인하고 있어요.
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <View className="w-full rounded-3xl border border-stone-100 bg-white p-6">
          <Text accessibilityRole="alert" className="text-xl font-bold text-ink-900">
            로그인 정보를 확인하지 못했어요.
          </Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            네트워크 연결을 확인한 뒤 다시 시도해 주세요.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-5 min-h-12 items-center justify-center rounded-xl bg-brand-900"
            onPress={retry}
          >
            <Text className="font-bold text-white">다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toast config={toastConfig} />
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <QueryProvider>
            <ThemeProvider>
              <StatusBar style="dark" />
              <AuthenticatedNavigator />
            </ThemeProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
