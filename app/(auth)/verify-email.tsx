import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen(): React.JSX.Element {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resent, setResent] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-sand-50 px-6">
      <View className="flex-1 justify-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-100">
          <Ionicons name="mail-unread-outline" color="#176D62" size={38} />
        </View>

        <Text className="mt-8 text-sm font-bold text-brand-700">EMAIL VERIFICATION</Text>
        <Text className="mt-2 text-3xl font-bold leading-10 text-ink-900">
          받은 편지함을{`\n`}확인해 주세요.
        </Text>
        <Text className="mt-4 text-base leading-6 text-ink-600">
          <Text className="font-bold text-ink-900">{email ?? '입력한 이메일'}</Text>
          {` 로 확인 링크를 보내는 흐름입니다. 링크 확인 전에는 고객 계정이 활성화되지 않습니다.`}
        </Text>

        <View className="mt-7 rounded-2xl border border-stone-100 bg-white p-5">
          <FlowRow number="1" text="이메일에서 바스페이스 확인 링크 열기" />
          <FlowRow number="2" text="이메일 확인 완료" />
          <FlowRow number="3" text="앱으로 돌아와 로그인" isLast />
        </View>

        {resent ? (
          <View className="mt-4 flex-row items-center rounded-xl bg-brand-100 p-3">
            <Ionicons name="checkmark-circle" color="#176D62" size={20} />
            <Text className="ml-2 flex-1 text-sm font-semibold text-brand-900">
              재전송 요청 화면을 확인했습니다.
            </Text>
          </View>
        ) : null}
      </View>

      <View className="pb-6">
        <Pressable
          accessibilityRole="button"
          className="min-h-13 items-center justify-center rounded-xl bg-brand-900"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-base font-bold text-white">확인 후 로그인으로</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="mt-3 min-h-12 items-center justify-center"
          onPress={() => setResent(true)}
        >
          <Text className="font-bold text-brand-900">확인 이메일 다시 보내기</Text>
        </Pressable>
        <Text className="text-center text-xs leading-5 text-ink-600">
          현재는 화면 프로토타입이며 실제 이메일은 발송되지 않습니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FlowRow({
  number,
  text,
  isLast = false,
}: {
  number: string;
  text: string;
  isLast?: boolean;
}): React.JSX.Element {
  return (
    <View className={`flex-row items-center ${isLast ? '' : 'mb-4'}`}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-100">
        <Text className="text-sm font-bold text-brand-900">{number}</Text>
      </View>
      <Text className="ml-3 flex-1 text-sm font-medium text-ink-900">{text}</Text>
    </View>
  );
}
