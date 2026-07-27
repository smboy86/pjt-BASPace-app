import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthSession, useLogout } from '@/features/auth';

type TIoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface IAdminMenuCardProps {
  icon: TIoniconName;
  title: string;
  description: string;
  destination?: Href;
}

interface IAdminMenuSection {
  title: string;
  description: string;
  items: IAdminMenuCardProps[];
}

const ADMIN_MENU_SECTIONS: IAdminMenuSection[] = [
  {
    title: '견적 및 시공 관리',
    description: '고객 견적 요청과 참여 업체를 관리합니다.',
    items: [
      {
        icon: 'document-text-outline',
        title: '견적 관리',
        description: '전체 견적 요청 조회 기능을 준비하고 있습니다.',
      },
      {
        icon: 'business-outline',
        title: '업체 관리',
        description: '등록 업체를 조회하고 새로운 업체를 추가합니다.',
        destination: '/(admin)/partners',
      },
    ],
  },
  {
    title: '운영 관리',
    description: '견적에 사용하는 제품과 선택 옵션을 관리합니다.',
    items: [
      {
        icon: 'grid-outline',
        title: '견적 옵션 관리',
        description: '고객 견적양식의 옵션과 기준 단가를 관리합니다.',
        destination: '/(admin)/catalog',
      },
    ],
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
            바스페이스의 견적 요청, 참여 업체와 견적 옵션을 관리합니다.
          </Text>
        </View>

        {ADMIN_MENU_SECTIONS.map((section, sectionIndex) => (
          <View key={section.title} className={sectionIndex === 0 ? 'mt-7' : 'mt-5'}>
            <View className="mb-4">
              <Text className="text-2xl font-bold text-ink-900">{section.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-ink-600">{section.description}</Text>
            </View>
            {section.items.map((item) => (
              <AdminMenuCard key={item.title} {...item} />
            ))}
          </View>
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

function AdminMenuCard({
  icon,
  title,
  description,
  destination,
}: IAdminMenuCardProps): React.JSX.Element {
  const isAvailable = Boolean(destination);

  return (
    <Pressable
      accessibilityRole={isAvailable ? 'button' : undefined}
      accessibilityState={{ disabled: !isAvailable }}
      className={`mb-3 flex-row items-center rounded-2xl border border-stone-100 bg-white p-4 ${
        isAvailable ? 'active:bg-brand-100' : ''
      }`}
      disabled={!isAvailable}
      onPress={destination ? () => router.push(destination) : undefined}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
        <Ionicons name={icon} color="#176D62" size={24} />
      </View>
      <View className="ml-4 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-base font-bold text-ink-900">{title}</Text>
          {!isAvailable ? (
            <View className="rounded-full bg-sand-50 px-2.5 py-1">
              <Text className="text-xs font-semibold text-ink-600">준비 중</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-1 text-sm leading-5 text-ink-600">{description}</Text>
      </View>
      {isAvailable ? (
        <Ionicons className="ml-2" name="chevron-forward" color="#62706D" size={20} />
      ) : null}
    </Pressable>
  );
}
