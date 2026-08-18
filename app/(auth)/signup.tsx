import { useMemo, useState } from 'react';
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
import { useSignup } from '@/features/auth';

export default function SignupScreen(): React.JSX.Element {
  const signup = useSignup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validationError = useMemo(() => {
    if (!submitted) return '';
    if (name.trim().length < 2) return '이름을 2자 이상 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return '올바른 이메일 주소를 입력해 주세요.';
    }
    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[^A-Za-z0-9\s]/.test(password)
    ) {
      return '비밀번호는 영문 소문자와 특수기호를 포함해 8자 이상이어야 합니다.';
    }
    if (password !== passwordConfirm) return '비밀번호가 서로 일치하지 않습니다.';
    if (!agreed) return '필수 약관에 동의해 주세요.';
    return '';
  }, [agreed, email, name, password, passwordConfirm, submitted]);

  const clearServerError = (): void => {
    signup.reset();
  };

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const normalizedEmail = email.trim().toLowerCase();
    const isValid =
      name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[^A-Za-z0-9\s]/.test(password) &&
      password === passwordConfirm &&
      agreed;
    if (!isValid) return;

    try {
      await signup.mutateAsync({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });
      router.replace({ pathname: '/(auth)/verify-email', params: { email: normalizedEmail } });
    } catch {
      // The mutation exposes a sanitized, user-facing error below.
    }
  };

  const errorMessage = validationError || signup.error?.message || '';

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-6 pb-12 pt-4" keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityLabel="로그인으로 돌아가기"
            accessibilityRole="button"
            className="min-h-11 self-start flex-row items-center"
            disabled={signup.isPending}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" color="#0B1F3A" size={22} />
            <Text className="font-semibold text-brand-900">로그인</Text>
          </Pressable>

          <Text className="mt-5 text-sm font-bold text-brand-700">CUSTOMER SIGN UP</Text>
          <Text className="mt-2 text-3xl font-bold leading-10 text-ink-900">
            내 욕실 상담 공간을{`\n`}만들어 보세요.
          </Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            고객 계정은 이메일로 가입하며, 이메일 확인 후 안전하게 이용할 수 있습니다.
          </Text>

          <View className="mt-8 gap-5 rounded-3xl border border-stone-100 bg-white p-5">
            <SignupField
              editable={!signup.isPending}
              label="이름"
              placeholder="홍길동"
              value={name}
              onChangeText={(value) => {
                setName(value);
                clearServerError();
              }}
            />
            <SignupField
              autoCapitalize="none"
              autoComplete="email"
              editable={!signup.isPending}
              keyboardType="email-address"
              label="이메일"
              placeholder="name@example.com"
              textContentType="emailAddress"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearServerError();
              }}
            />
            <SignupField
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!signup.isPending}
              helper="영문 소문자와 특수기호를 포함해 8자 이상 입력해 주세요."
              label="비밀번호"
              placeholder="8자 이상 입력"
              secureTextEntry
              textContentType="newPassword"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearServerError();
              }}
            />
            <SignupField
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!signup.isPending}
              label="비밀번호 확인"
              placeholder="비밀번호 다시 입력"
              secureTextEntry
              textContentType="newPassword"
              value={passwordConfirm}
              onChangeText={(value) => {
                setPasswordConfirm(value);
                clearServerError();
              }}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed, disabled: signup.isPending }}
              className="min-h-12 flex-row items-start rounded-xl bg-sand-50 p-3"
              disabled={signup.isPending}
              onPress={() => {
                setAgreed((value) => !value);
                clearServerError();
              }}
            >
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                color={agreed ? '#163A63' : '#667085'}
                size={22}
              />
              <Text className="ml-3 flex-1 text-sm leading-5 text-ink-600">
                서비스 이용약관 및 개인정보 처리방침에 동의합니다. (필수)
              </Text>
            </Pressable>

            {errorMessage ? (
              <Text accessibilityRole="alert" className="text-sm font-medium text-red-600">
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: signup.isPending, busy: signup.isPending }}
              className={`h-12 flex-row items-center justify-center rounded-xl bg-brand-900 ${
                signup.isPending ? 'opacity-60' : 'active:opacity-80'
              }`}
              disabled={signup.isPending}
              onPress={() => void submit()}
            >
              {signup.isPending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text className="ml-2 text-base font-bold text-white">가입 중</Text>
                </>
              ) : (
                <Text className="text-base font-bold text-white">회원가입</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ISignupFieldProps {
  label: string;
  value: string;
  placeholder: string;
  helper?: string;
  autoCapitalize?: 'none';
  autoComplete?: 'email' | 'new-password';
  editable?: boolean;
  keyboardType?: 'email-address';
  secureTextEntry?: boolean;
  textContentType?: 'emailAddress' | 'newPassword';
  onChangeText: (value: string) => void;
}

function SignupField({
  label,
  value,
  placeholder,
  helper,
  autoCapitalize,
  autoComplete,
  editable,
  keyboardType,
  secureTextEntry,
  textContentType,
  onChangeText,
}: ISignupFieldProps): React.JSX.Element {
  return (
    <View>
      <Text className="text-sm font-semibold text-ink-900">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#667085"
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
        value={value}
        onChangeText={onChangeText}
      />
      {helper ? <Text className="mt-2 text-xs leading-4 text-ink-600">{helper}</Text> : null}
    </View>
  );
}
