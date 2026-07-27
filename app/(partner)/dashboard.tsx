import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthSession, useLogout } from '@/features/auth';
import { useCurrentPartnerWorkspace } from '@/features/partner-management';

export default function PartnerDashboardScreen(): React.JSX.Element {
  const { user } = useAuthSession();
  const workspaceQuery = useCurrentPartnerWorkspace();
  const logout = useLogout();

  const handleLogout = async (): Promise<void> => {
    logout.reset();
    try {
      await logout.mutateAsync();
    } catch {
      // The inline error remains visible while the auth guard preserves the session.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="rounded-3xl bg-brand-900 p-6">
          <View className="self-start rounded-full bg-brand-100 px-3 py-1">
            <Text className="text-xs font-bold text-brand-900">업체 담당자</Text>
          </View>
          <Text className="mt-4 text-2xl font-bold text-white">
            {workspaceQuery.data?.companyName ?? '연결 업체 확인 중'}
          </Text>
          <Text className="mt-2 text-base font-semibold text-brand-100">
            {user?.name?.trim() || '담당자'}
          </Text>
          <Text className="mt-1 text-sm text-brand-100">{user?.email ?? ''}</Text>
        </View>

        <View className="mt-6 rounded-2xl border border-stone-100 bg-white p-5">
          <Text className="text-base font-bold text-ink-900">업체 연결 상태</Text>
          {workspaceQuery.isLoading ? (
            <View className="mt-4 flex-row items-center">
              <ActivityIndicator color="#176D62" />
              <Text className="ml-3 text-sm text-ink-600">업체 연결 정보를 불러오고 있어요.</Text>
            </View>
          ) : workspaceQuery.isError ? (
            <View accessibilityRole="alert" className="mt-4">
              <Text className="text-sm leading-6 text-red-600">
                업체 연결 정보를 불러오지 못했어요. 네트워크 상태를 확인해 주세요.
              </Text>
              <Pressable
                accessibilityRole="button"
                className="mt-3 min-h-11 items-center justify-center rounded-xl bg-brand-100"
                onPress={() => void workspaceQuery.refetch()}
              >
                <Text className="font-bold text-brand-700">다시 시도</Text>
              </Pressable>
            </View>
          ) : workspaceQuery.data ? (
            <View className="mt-4">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" color="#277A57" size={22} />
                <Text className="ml-2 font-bold text-ink-900">연결 완료</Text>
              </View>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                {workspaceQuery.data.companyName}의{' '}
                {workspaceQuery.data.isManager ? '대표 담당자' : '담당자'}로 연결되어 있습니다.
              </Text>
            </View>
          ) : (
            <View accessibilityRole="alert" className="mt-4">
              <Text className="text-sm leading-6 text-ink-600">
                연결된 업체가 없습니다. 바스페이스 관리자에게 업체 연결을 요청해 주세요.
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 flex-row items-center rounded-2xl border border-stone-100 bg-white p-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
            <Ionicons name="document-text-outline" color="#176D62" size={24} />
          </View>
          <View className="ml-4 flex-1">
            <View className="flex-row items-center">
              <Text className="flex-1 text-base font-bold text-ink-900">배정 요청</Text>
              <View className="rounded-full bg-sand-50 px-2.5 py-1">
                <Text className="text-xs font-semibold text-ink-600">준비 중</Text>
              </View>
            </View>
            <Text className="mt-1 text-sm leading-5 text-ink-600">
              고객 요청 확인과 견적 작성 기능을 준비하고 있습니다.
            </Text>
          </View>
        </View>

        {logout.error ? (
          <View
            accessibilityRole="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <Text className="font-semibold text-red-700">로그아웃을 완료하지 못했어요.</Text>
            <Text className="mt-1 text-sm leading-5 text-red-600">
              네트워크 상태를 확인한 뒤 다시 시도해 주세요.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: logout.isPending, disabled: logout.isPending }}
          className={`mt-7 min-h-12 flex-row items-center justify-center rounded-xl border border-stone-100 bg-white ${
            logout.isPending ? 'opacity-60' : 'active:bg-stone-100'
          }`}
          disabled={logout.isPending}
          onPress={() => void handleLogout()}
        >
          {logout.isPending ? (
            <ActivityIndicator color="#62706D" />
          ) : (
            <Ionicons name="log-out-outline" color="#62706D" size={20} />
          )}
          <Text className="ml-2 font-bold text-ink-600">
            {logout.isPending ? '로그아웃 중...' : '로그아웃'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
