import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthSession, useLogout } from '@/features/auth';

export default function ProfileScreen(): React.JSX.Element {
  const { user } = useAuthSession();
  const logout = useLogout();

  const handleLogout = async (): Promise<void> => {
    try {
      await logout.mutateAsync();
      router.replace('/(auth)/login');
    } catch {
      Alert.alert('로그아웃할 수 없어요', '네트워크 상태를 확인하고 다시 시도해 주세요.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">내 정보</Text>

        <View className="mt-5 rounded-3xl bg-brand-900 p-6">
          <Text className="text-sm font-semibold text-brand-100">고객 계정</Text>
          <Text className="mt-2 text-2xl font-bold text-white">{user?.name ?? '고객'}</Text>
          <Text className="mt-1 text-sm text-brand-100">{user?.email ?? ''}</Text>
        </View>

        <View className="mt-6 rounded-2xl border border-stone-100 bg-white p-5">
          <Text className="text-sm font-semibold text-ink-600">계정 유형</Text>
          <Text className="mt-2 text-base font-bold text-ink-900">고객</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-600">
            욕실 견적을 요청하고 상담 진행 상황을 확인할 수 있습니다.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          className={`mt-8 min-h-12 items-center justify-center rounded-xl border border-stone-100 bg-white ${
            logout.isPending ? 'opacity-60' : ''
          }`}
          disabled={logout.isPending}
          onPress={() => void handleLogout()}
        >
          <Text className="font-bold text-ink-600">
            {logout.isPending ? '로그아웃 중...' : '로그아웃'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
