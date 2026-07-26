import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLogin } from '@/features/auth';

export default function LoginScreen(): React.JSX.Element {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const updateEmail = (value: string): void => {
    setEmail(value);
    setValidationError('');
    login.reset();
  };

  const updatePassword = (value: string): void => {
    setPassword(value);
    setValidationError('');
    login.reset();
  };

  const submit = async (): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setValidationError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setValidationError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    setValidationError('');
    try {
      await login.mutateAsync({ email: normalizedEmail, password });
      router.replace('/(tabs)');
    } catch {
      // The mutation exposes a sanitized, user-facing error below.
    }
  };

  const errorMessage = validationError || login.error?.message || '';

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
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
              고객 계정으로 로그인하고{`\n`}욕실 상담을 이어가세요.
            </Text>
          </View>

          <View className="rounded-3xl border border-stone-100 bg-white p-5">
            <Text className="text-sm font-semibold text-ink-900">이메일</Text>
            <TextInput
              accessibilityLabel="로그인 이메일"
              autoCapitalize="none"
              autoComplete="email"
              className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
              editable={!login.isPending}
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor="#84908D"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
              onChangeText={updateEmail}
            />

            <Text className="mt-4 text-sm font-semibold text-ink-900">비밀번호</Text>
            <TextInput
              accessibilityLabel="로그인 비밀번호"
              autoCapitalize="none"
              autoComplete="current-password"
              className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
              editable={!login.isPending}
              placeholder="비밀번호를 입력해 주세요"
              placeholderTextColor="#84908D"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={updatePassword}
              onSubmitEditing={() => void submit()}
            />

            {errorMessage ? (
              <Text accessibilityRole="alert" className="mt-3 text-sm font-medium text-red-600">
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: login.isPending, busy: login.isPending }}
              className={`mt-5 h-12 flex-row items-center justify-center rounded-xl bg-brand-900 ${
                login.isPending ? 'opacity-60' : 'active:opacity-80'
              }`}
              disabled={login.isPending}
              onPress={() => void submit()}
            >
              {login.isPending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text className="ml-2 text-base font-bold text-white">로그인 중</Text>
                </>
              ) : (
                <Text className="text-base font-bold text-white">로그인</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: login.isPending }}
              className="mt-3 h-12 items-center justify-center rounded-xl border border-brand-700"
              disabled={login.isPending}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text className="font-bold text-brand-900">고객 회원가입</Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-brand-100 p-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" color="#176D62" size={21} />
              <Text className="ml-3 flex-1 text-sm leading-5 text-ink-600">
                현재 고객 계정만 직접 가입할 수 있습니다. 업체 담당자는 운영자의 초대를 통해
                참여합니다.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
