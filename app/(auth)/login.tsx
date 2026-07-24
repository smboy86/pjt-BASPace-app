import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDemoSessionStore, type TUserRole } from '@/features/demo-session';

const ROLE_PREVIEWS = [
  { role: 'customer' as const, label: '고객', icon: 'home-outline' as const },
  { role: 'partner' as const, label: '업체 담당자', icon: 'construct-outline' as const },
  { role: 'admin' as const, label: '관리자', icon: 'shield-checkmark-outline' as const },
];

export default function LoginScreen(): React.JSX.Element {
  const selectRole = useDemoSessionStore((state) => state.selectRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const previewLogin = (role: TUserRole = 'customer'): void => {
    if (role === 'customer' && (!email.trim() || !password)) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setError('');
    selectRole(role);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView
        contentContainerClassName="flex-grow px-6 pb-10 pt-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 mt-3">
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-brand-900">
            <Ionicons name="water-outline" color="#FFFFFF" size={26} />
          </View>
          <Text className="text-sm font-bold text-brand-700">BATHROOM ESTIMATE PLATFORM</Text>
          <Text className="mt-2 text-3xl font-bold tracking-tight text-ink-900">
            다시 만나서 반가워요.
          </Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            고객의 요청부터 담당자 배정, 견적 협의까지{`\n`}바스페이스에서 이어집니다.
          </Text>
        </View>

        <View className="rounded-3xl border border-stone-100 bg-white p-5">
          <Text className="text-sm font-semibold text-ink-900">이메일</Text>
          <TextInput
            accessibilityLabel="로그인 이메일"
            autoCapitalize="none"
            autoComplete="email"
            className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor="#84908D"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="mt-4 text-sm font-semibold text-ink-900">비밀번호</Text>
          <TextInput
            accessibilityLabel="로그인 비밀번호"
            autoCapitalize="none"
            autoComplete="password"
            className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
            placeholder="비밀번호를 입력해 주세요"
            placeholderTextColor="#84908D"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text className="mt-3 text-sm font-medium text-red-600">{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            className="mt-5 min-h-13 items-center justify-center rounded-xl bg-brand-900 active:opacity-80"
            onPress={() => previewLogin()}
          >
            <Text className="text-base font-bold text-white">로그인 플로우 미리보기</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-3 min-h-12 items-center justify-center rounded-xl border border-brand-700"
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text className="font-bold text-brand-900">고객 회원가입</Text>
          </Pressable>
        </View>

        <View className="mt-5 rounded-2xl bg-brand-100 p-4">
          <View className="flex-row items-start">
            <Ionicons name="mail-unread-outline" color="#176D62" size={21} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-brand-900">
                업체 담당자는 초대로 참여해요
              </Text>
              <Text className="mt-1 text-sm leading-5 text-ink-600">
                업체 담당자와 관리자는 공개 회원가입을 하지 않습니다. 운영자가 등록한 초대 이메일을
                통해 계정을 준비합니다.
              </Text>
            </View>
          </View>
        </View>

        <Text className="mb-3 mt-8 text-sm font-bold text-ink-900">역할별 화면 미리보기</Text>
        <View className="flex-row gap-2">
          {ROLE_PREVIEWS.map((option) => (
            <Pressable
              key={option.role}
              accessibilityLabel={`${option.label} 화면 미리보기`}
              className="min-h-20 flex-1 items-center justify-center rounded-2xl border border-stone-100 bg-white px-2 active:bg-brand-100"
              onPress={() => previewLogin(option.role)}
            >
              <Ionicons name={option.icon} color="#176D62" size={20} />
              <Text className="mt-2 text-center text-xs font-bold text-ink-900">
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-6 text-center text-xs leading-5 text-ink-600">
          현재 화면은 로컬 프로토타입이며 입력한 인증 정보는 저장되거나 전송되지 않습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
