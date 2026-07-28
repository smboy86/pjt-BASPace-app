import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { QueryProvider, ThemeProvider } from '@core/providers';
import { toastConfig, ErrorBoundary } from '@shared/ui';
import { useQuoteStore } from '@/entities/quote';
import { useRemodelRequestStore } from '@/entities/remodel-request';
import { useAuthSession } from '@/features/auth';
import { useRequestConsultationStore } from '@/features/request-consultation';
import '../global.css';

function AuthenticatedNavigator(): React.JSX.Element {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const queryClient = useQueryClient();
  const { user, status, isAuthenticated, isLoading, error, retry } = useAuthSession();

  useEffect(() => {
    if (status !== 'unauthenticated') return;

    queryClient.clear();
    useRemodelRequestStore.getState().clearRequests();
    useQuoteStore.getState().clearQuotes();
    useRequestConsultationStore.getState().clearMessages();
  }, [queryClient, status]);

  useEffect(() => {
    if (!navigationState?.key || isLoading || error) return;

    const currentGroup = segments[0];
    const isInAuthGroup = currentGroup === '(auth)';
    const isInCustomerGroup = currentGroup === '(tabs)';
    const isInAdminGroup = currentGroup === '(admin)';
    const isInPartnerGroup = currentGroup === '(partner)';

    if (!isAuthenticated || !user) {
      if (!isInAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (user.role === 'admin') {
      if (!isInAdminGroup) {
        router.replace('/(admin)/dashboard');
      }
      return;
    }

    if (user.role === 'partner_staff') {
      if (!isInPartnerGroup) {
        router.replace('/(partner)/dashboard');
      }
      return;
    }

    if (user.role === 'customer') {
      if (!isInCustomerGroup) {
        router.replace('/(tabs)');
      }
      return;
    }

    if (!isInAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [error, isAuthenticated, isLoading, navigationState?.key, segments, user]);

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
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(partner)" />
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
