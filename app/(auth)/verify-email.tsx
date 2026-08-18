import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useResendVerification } from '@/features/auth';

export default function VerifyEmailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const resendVerification = useResendVerification();
  const [resent, setResent] = useState(false);

  const resend = async (): Promise<void> => {
    if (!email) return;

    setResent(false);
    try {
      await resendVerification.mutateAsync({ email });
      setResent(true);
    } catch {
      // The mutation exposes a sanitized, user-facing error below.
    }
  };

  const resendError = resendVerification.error?.message ?? '';

  return (
    <SafeAreaView className="flex-1 bg-sand-50 px-6">
      <View className="flex-1 justify-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-100">
          <Ionicons name="mail-unread-outline" color="#163A63" size={38} />
        </View>

        <Text className="mt-8 text-sm font-bold text-brand-700">EMAIL VERIFICATION</Text>
        <Text className="mt-2 text-3xl font-bold leading-10 text-ink-900">
          받은 편지함을{`\n`}확인해 주세요.
        </Text>
        <Text className="mt-4 text-base leading-6 text-ink-600">
          {email ? (
            <>
              <Text className="font-bold text-ink-900">{email}</Text>
              {`로 확인 링크를 보냈습니다. 이메일 확인을 마치면 고객 계정으로 로그인할 수 있습니다.`}
            </>
          ) : (
            '가입할 때 입력한 이메일에서 바스페이스 확인 링크를 열어 주세요.'
          )}
        </Text>

        <View className="mt-7 rounded-2xl border border-stone-100 bg-white p-5">
          <FlowRow number="1" text="이메일에서 바스페이스 확인 링크 열기" />
          <FlowRow number="2" text="이메일 확인 완료하기" />
          <FlowRow number="3" text="앱으로 돌아와 로그인하기" isLast />
        </View>

        {resent ? (
          <View
            accessibilityLiveRegion="polite"
            className="mt-4 flex-row items-center rounded-xl bg-brand-100 p-3"
          >
            <Ionicons name="checkmark-circle" color="#163A63" size={20} />
            <Text className="ml-2 flex-1 text-sm font-semibold text-brand-900">
              확인 이메일을 다시 보냈습니다.
            </Text>
          </View>
        ) : null}
        {resendError ? (
          <Text accessibilityRole="alert" className="mt-4 text-sm font-medium text-red-600">
            {resendError}
          </Text>
        ) : null}
      </View>

      <View className="pb-6">
        <Pressable
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-xl bg-brand-900"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-base font-bold text-white">로그인으로 이동</Text>
        </Pressable>
        {email ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: resendVerification.isPending,
              busy: resendVerification.isPending,
            }}
            className={`mt-3 min-h-12 flex-row items-center justify-center ${
              resendVerification.isPending ? 'opacity-60' : ''
            }`}
            disabled={resendVerification.isPending}
            onPress={() => void resend()}
          >
            {resendVerification.isPending ? (
              <>
                <ActivityIndicator color="#0B1F3A" />
                <Text className="ml-2 font-bold text-brand-900">보내는 중</Text>
              </>
            ) : (
              <Text className="font-bold text-brand-900">확인 이메일 다시 보내기</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

interface IFlowRowProps {
  number: string;
  text: string;
  isLast?: boolean;
}

function FlowRow({ number, text, isLast = false }: IFlowRowProps): React.JSX.Element {
  return (
    <View className={`flex-row items-center ${isLast ? '' : 'mb-4'}`}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-100">
        <Text className="text-sm font-bold text-brand-900">{number}</Text>
      </View>
      <Text className="ml-3 flex-1 text-sm font-medium text-ink-900">{text}</Text>
    </View>
  );
}
