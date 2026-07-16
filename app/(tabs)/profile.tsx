import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDemoSessionStore } from '@/features/demo-session';

const ROLES = [
  {
    role: 'customer' as const,
    title: '고객',
    description: '욕실 조건을 설정하고 견적을 받습니다.',
  },
  {
    role: 'partner' as const,
    title: '업체 담당자',
    description: '매칭된 고객 요청에 견적을 제안합니다.',
  },
  { role: 'admin' as const, title: '관리자', description: '참여 업체와 카탈로그를 관리합니다.' },
];

export default function ProfileScreen(): React.JSX.Element {
  const user = useDemoSessionStore((state) => state.user);
  const selectRole = useDemoSessionStore((state) => state.selectRole);
  const signOut = useDemoSessionStore((state) => state.signOut);

  const changeRole = (role: (typeof ROLES)[number]['role']): void => {
    selectRole(role);
    router.replace('/(tabs)');
  };

  const logout = (): void => {
    signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">내 정보</Text>
        <View className="mt-5 rounded-3xl bg-brand-900 p-6">
          <Text className="text-sm font-semibold text-brand-100">현재 데모 세션</Text>
          <Text className="mt-2 text-2xl font-bold text-white">{user?.name ?? '사용자'}</Text>
          <Text className="mt-1 text-sm text-brand-100">{user?.companyName ?? '고객 계정'}</Text>
        </View>

        <Text className="mt-8 text-lg font-bold text-ink-900">역할 전환</Text>
        <Text className="mt-1 text-sm text-ink-600">
          하나의 앱에서 역할별 화면과 업무 흐름을 확인할 수 있어요.
        </Text>
        <View className="mt-4 gap-3">
          {ROLES.map((option) => {
            const selected = user?.role === option.role;
            return (
              <Pressable
                key={option.role}
                accessibilityLabel={`${option.title} 역할로 전환`}
                className={`min-h-20 rounded-2xl border p-5 ${selected ? 'border-brand-700 bg-brand-100' : 'border-stone-100 bg-white'}`}
                onPress={() => changeRole(option.role)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-ink-900">{option.title}</Text>
                    <Text className="mt-1 text-sm leading-5 text-ink-600">
                      {option.description}
                    </Text>
                  </View>
                  {selected && <Text className="text-sm font-bold text-brand-900">사용 중</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          className="mt-8 min-h-12 items-center justify-center rounded-xl border border-stone-100 bg-white"
          onPress={logout}
        >
          <Text className="font-bold text-ink-600">데모 세션 종료</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
