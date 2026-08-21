import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  Keyboard,
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
import { useGoogleLogin, useKakaoLogin, useLogin } from '@/features/auth';

const TEMP_LOGIN_ACCOUNTS = [
  { label: '고객', email: 'smboy86@gmail.com', password: 'Qwer1234$' },
  { label: '업체', email: 'aaa@aaa.aaa', password: 'qwer1234$' },
  { label: '관리자', email: 'smboy86@naver.com', password: 'qwer1234' },
] as const;

export default function LoginScreen(): React.JSX.Element {
  const login = useLogin();
  const kakaoLogin = useKakaoLogin();
  const googleLogin = useGoogleLogin();
  const isAuthenticating = login.isPending || kakaoLogin.isPending || googleLogin.isPending;
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const updateEmail = (value: string): void => {
    setEmail(value);
    setValidationError('');
    login.reset();
    kakaoLogin.reset();
    googleLogin.reset();
  };

  const updatePassword = (value: string): void => {
    setPassword(value);
    setValidationError('');
    login.reset();
    kakaoLogin.reset();
    googleLogin.reset();
  };

  const fillTempAccount = (account: (typeof TEMP_LOGIN_ACCOUNTS)[number]): void => {
    setEmail(account.email);
    setPassword(account.password);
    setValidationError('');
    login.reset();
    kakaoLogin.reset();
    googleLogin.reset();
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
    } catch {
      // The mutation exposes a sanitized, user-facing error below.
    }
  };

  const continueWithGoogle = async (): Promise<void> => {
    setValidationError('');
    login.reset();
    kakaoLogin.reset();
    googleLogin.reset();

    try {
      await googleLogin.mutateAsync();
    } catch {
      // The mutation exposes a sanitized, user-facing error below.
    }
  };

  const continueWithKakao = async (): Promise<void> => {
    setValidationError('');
    login.reset();
    kakaoLogin.reset();
    googleLogin.reset();

    try {
      await kakaoLogin.mutateAsync();
    } catch {
      // The mutation exposes a sanitized, user-facing error below.
    }
  };

  const errorMessage =
    validationError ||
    login.error?.message ||
    kakaoLogin.error?.message ||
    googleLogin.error?.message ||
    '';

  const scrollToInput = useCallback((input: TextInput | null): void => {
    const inputHandle = findNodeHandle(input);
    if (inputHandle === null) return;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(inputHandle, 24, true);
    });
  }, []);

  const handleInputFocus = useCallback(
    (input: TextInput | null): void => {
      focusedInputRef.current = input;

      if (Platform.OS === 'ios' || Keyboard.isVisible()) {
        scrollToInput(input);
      }
    },
    [scrollToInput],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      scrollToInput(focusedInputRef.current);
    });

    return () => subscription.remove();
  }, [scrollToInput]);

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerClassName="flex-grow px-6 pb-10 pt-8"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
              노크 계정으로 로그인하고{`\n`}역할에 맞는 업무를 이어가세요.
            </Text>
          </View>

          <View className="rounded-3xl border border-stone-100 bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink-900">이메일</Text>
              {__DEV__ ? (
                <View className="flex-row gap-1">
                  {TEMP_LOGIN_ACCOUNTS.map((account) => (
                    <Pressable
                      key={account.label}
                      accessibilityHint="선택한 임시 계정의 이메일과 비밀번호를 입력합니다."
                      accessibilityLabel={`${account.label} 임시 계정 입력`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isAuthenticating }}
                      className={`h-11 items-center justify-center rounded-full border border-brand-700 bg-brand-100 px-3 ${
                        isAuthenticating ? 'opacity-50' : 'active:opacity-70'
                      }`}
                      disabled={isAuthenticating}
                      onPress={() => fillTempAccount(account)}
                    >
                      <Text className="text-xs font-bold text-brand-900">{account.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <TextInput
              ref={emailInputRef}
              accessibilityLabel="로그인 이메일"
              autoCapitalize="none"
              autoComplete="email"
              className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
              editable={!isAuthenticating}
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor="#667085"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
              onChangeText={updateEmail}
              onFocus={() => handleInputFocus(emailInputRef.current)}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />

            <Text className="mt-4 text-sm font-semibold text-ink-900">비밀번호</Text>
            <TextInput
              ref={passwordInputRef}
              accessibilityLabel="로그인 비밀번호"
              autoCapitalize="none"
              autoComplete="current-password"
              className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
              editable={!isAuthenticating}
              placeholder="비밀번호를 입력해 주세요"
              placeholderTextColor="#667085"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={updatePassword}
              onFocus={() => handleInputFocus(passwordInputRef.current)}
              onSubmitEditing={() => void submit()}
            />

            {errorMessage ? (
              <Text accessibilityRole="alert" className="mt-3 text-sm font-medium text-red-600">
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isAuthenticating, busy: login.isPending }}
              className={`mt-5 h-12 flex-row items-center justify-center rounded-xl bg-brand-900 ${
                login.isPending ? 'opacity-60' : 'active:opacity-80'
              }`}
              disabled={isAuthenticating}
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

            <View className="my-4 flex-row items-center">
              <View className="h-px flex-1 bg-stone-100" />
              <Text className="mx-3 text-xs font-semibold text-ink-600">또는</Text>
              <View className="h-px flex-1 bg-stone-100" />
            </View>

            <Pressable
              accessibilityLabel="카카오로 계속하기"
              accessibilityRole="button"
              accessibilityState={{ disabled: isAuthenticating, busy: kakaoLogin.isPending }}
              className={`h-12 flex-row items-center justify-center rounded-xl bg-[#FEE500] ${
                isAuthenticating ? 'opacity-60' : 'active:opacity-80'
              }`}
              disabled={isAuthenticating}
              onPress={() => void continueWithKakao()}
            >
              {kakaoLogin.isPending ? (
                <>
                  <ActivityIndicator color="#191919" />
                  <Text className="ml-2 font-bold text-[#191919]">카카오 로그인 중</Text>
                </>
              ) : (
                <>
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-[#191919]">
                    <Text className="text-xs font-black text-[#FEE500]">K</Text>
                  </View>
                  <Text className="ml-3 font-bold text-[#191919]">카카오로 계속하기</Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityLabel="Google로 계속하기"
              accessibilityRole="button"
              accessibilityState={{ disabled: isAuthenticating, busy: googleLogin.isPending }}
              className={`mt-3 h-12 flex-row items-center justify-center rounded-xl border border-stone-100 bg-white ${
                isAuthenticating ? 'opacity-60' : 'active:bg-sand-50'
              }`}
              disabled={isAuthenticating}
              onPress={() => void continueWithGoogle()}
            >
              {googleLogin.isPending ? (
                <>
                  <ActivityIndicator color="#123F3B" />
                  <Text className="ml-2 font-bold text-ink-900">Google 로그인 중</Text>
                </>
              ) : (
                <>
                  <Ionicons name="logo-google" color="#4285F4" size={20} />
                  <Text className="ml-3 font-bold text-ink-900">Google로 계속하기</Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isAuthenticating }}
              className="mt-3 h-12 items-center justify-center rounded-xl border border-brand-700"
              disabled={isAuthenticating}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text className="font-bold text-brand-900">고객 회원가입</Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-brand-100 p-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" color="#163A63" size={21} />
              <Text className="ml-3 flex-1 text-sm leading-5 text-ink-600">
                고객 계정만 직접 가입할 수 있습니다. 업체 담당자와 관리자는 운영자가 생성한 계정으로
                참여합니다.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
