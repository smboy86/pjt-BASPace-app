import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDemoSessionStore } from '@/features/demo-session';

const ROLE_OPTIONS = [
  {
    role: 'customer' as const,
    title: '고객으로 시작하기',
    description: '내 욕실 조건을 설정하고 견적을 받아보세요.',
    icon: 'home-outline' as const,
  },
  {
    role: 'partner' as const,
    title: '업체 담당자로 시작하기',
    description: '매칭된 상담 요청에 견적과 코멘트를 보내세요.',
    icon: 'construct-outline' as const,
  },
  {
    role: 'admin' as const,
    title: '관리자로 시작하기',
    description: '업체 매칭과 제품 카탈로그를 관리하세요.',
    icon: 'settings-outline' as const,
  },
];

export default function LoginScreen(): React.JSX.Element {
  const selectRole = useDemoSessionStore((state) => state.selectRole);

  const handleLogin = (role: (typeof ROLE_OPTIONS)[number]['role']): void => {
    selectRole(role);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="flex-grow px-6 py-8">
        <View className="mb-10 mt-8">
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-brand-900">
            <Ionicons name="water-outline" color="#FFFFFF" size={26} />
          </View>
          <Text className="text-3xl font-bold tracking-tight text-ink-900">바스페이스</Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            욕실 리모델링의 선택부터 견적 협의까지{`\n`}한 공간에서 관리하세요.
          </Text>
        </View>

        <Text className="mb-3 text-sm font-semibold text-ink-600">데모 역할 선택</Text>
        <View className="gap-3">
          {ROLE_OPTIONS.map((option) => (
            <Pressable
              key={option.role}
              accessibilityLabel={option.title}
              className="min-h-28 rounded-2xl border border-stone-100 bg-white p-5 active:bg-brand-100"
              onPress={() => handleLogin(option.role)}
            >
              <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                <Ionicons name={option.icon} color="#176D62" size={22} />
              </View>
              <Text className="text-base font-bold text-ink-900">{option.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-ink-600">{option.description}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-8 text-center text-xs leading-5 text-ink-600">
          현재는 로컬 데이터로 흐름을 체험하는 MVP입니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
