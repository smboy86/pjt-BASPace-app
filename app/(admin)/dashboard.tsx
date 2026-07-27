import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthSession, useLogout } from '@/features/auth';

type TIoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface IAdminMenuCardProps {
  icon: TIoniconName;
  title: string;
  description: string;
}

const ADMIN_MENU_ITEMS: IAdminMenuCardProps[] = [
  {
    icon: 'document-text-outline',
    title: '요청 관리',
    description: '전체 요청 조회 기능을 준비하고 있습니다.',
  },
  {
    icon: 'git-branch-outline',
    title: '배정 관리',
    description: '업체와 담당자 배정 기능을 준비하고 있습니다.',
  },
  {
    icon: 'business-outline',
    title: '업체 관리',
    description: '참여 업체 관리 기능을 준비하고 있습니다.',
  },
  {
    icon: 'grid-outline',
    title: '카탈로그 관리',
    description: '제품과 가격표 관리 기능을 준비하고 있습니다.',
  },
];

export default function AdminDashboardScreen(): React.JSX.Element {
  const { user } = useAuthSession();
  const logout = useLogout();

  const handleLogout = async (): Promise<void> => {
    logout.reset();

    try {
      await logout.mutateAsync();
    } catch {
      // The mutation error is displayed inline while the auth guard handles navigation.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="rounded-3xl bg-brand-900 p-6">
          <View className="self-start rounded-full bg-brand-100 px-3 py-1">
            <Text className="text-xs font-bold text-brand-900">관리자</Text>
          </View>
          <Text className="mt-4 text-2xl font-bold text-white">
            {user?.name?.trim() || '관리자'}
          </Text>
          <Text className="mt-1 text-sm text-brand-100">{user?.email ?? ''}</Text>
          <Text className="mt-5 text-sm leading-6 text-brand-100">
            바스페이스의 요청, 배정, 업체와 카탈로그 운영 기능을 관리합니다.
          </Text>
        </View>

        <View className="mb-4 mt-7">
          <Text className="text-2xl font-bold text-ink-900">운영 현황</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-600">
            관리자 기능을 순차적으로 연결하고 있습니다.
          </Text>
        </View>

        {ADMIN_MENU_ITEMS.map((item) => (
          <AdminMenuCard key={item.title} {...item} />
        ))}

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

function AdminMenuCard({ icon, title, description }: IAdminMenuCardProps): React.JSX.Element {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-stone-100 bg-white p-4">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
        <Ionicons name={icon} color="#176D62" size={24} />
      </View>
      <View className="ml-4 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-base font-bold text-ink-900">{title}</Text>
          <View className="rounded-full bg-sand-50 px-2.5 py-1">
            <Text className="text-xs font-semibold text-ink-600">준비 중</Text>
          </View>
        </View>
        <Text className="mt-1 text-sm leading-5 text-ink-600">{description}</Text>
      </View>
    </View>
  );
}
