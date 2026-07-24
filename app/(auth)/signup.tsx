import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const error = useMemo(() => {
    if (!submitted) return '';
    if (name.trim().length < 2) return '이름을 2자 이상 입력해 주세요.';
    if (!email.includes('@')) return '올바른 이메일 주소를 입력해 주세요.';
    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return '비밀번호는 영문 대·소문자와 숫자를 포함해 8자 이상이어야 합니다.';
    }
    if (password !== passwordConfirm) return '비밀번호가 서로 일치하지 않습니다.';
    if (!agreed) return '필수 약관에 동의해 주세요.';
    return '';
  }, [agreed, email, name, password, passwordConfirm, submitted]);

  const submit = (): void => {
    setSubmitted(true);
    const isValid =
      name.trim().length >= 2 &&
      email.includes('@') &&
      password.length >= 8 &&
      password === passwordConfirm &&
      agreed;
    if (!isValid) return;
    router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="px-6 pb-12 pt-4" keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityLabel="로그인으로 돌아가기"
          className="min-h-11 self-start flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#123F3B" size={22} />
          <Text className="font-semibold text-brand-900">로그인</Text>
        </Pressable>

        <Text className="mt-5 text-sm font-bold text-brand-700">CUSTOMER SIGN UP</Text>
        <View className="mt-3 self-start rounded-full bg-brand-100 px-3 py-1">
          <Text className="text-xs font-bold text-brand-900">
            화면 프로토타입 · 실제 가입 미발송
          </Text>
        </View>
        <Text className="mt-2 text-3xl font-bold leading-10 text-ink-900">
          내 욕실 상담 공간을{`\n`}만들어 보세요.
        </Text>
        <Text className="mt-3 text-base leading-6 text-ink-600">
          고객 계정은 이메일로 직접 가입할 수 있으며, 이메일 확인 후 이용을 시작합니다.
        </Text>

        <View className="mt-8 gap-5 rounded-3xl border border-stone-100 bg-white p-5">
          <SignupField label="이름" placeholder="홍길동" value={name} onChangeText={setName} />
          <SignupField
            label="이메일"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <SignupField
            label="비밀번호"
            autoCapitalize="none"
            helper="영문 대·소문자와 숫자를 포함해 8자 이상 입력합니다."
            placeholder="8자 이상 입력"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <SignupField
            label="비밀번호 확인"
            autoCapitalize="none"
            placeholder="비밀번호 다시 입력"
            secureTextEntry
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            className="min-h-12 flex-row items-start rounded-xl bg-sand-50 p-3"
            onPress={() => setAgreed((value) => !value)}
          >
            <Ionicons
              name={agreed ? 'checkbox' : 'square-outline'}
              color={agreed ? '#176D62' : '#84908D'}
              size={22}
            />
            <Text className="ml-3 flex-1 text-sm leading-5 text-ink-600">
              서비스 이용약관 및 개인정보 처리방침에 동의합니다. (필수)
            </Text>
          </Pressable>

          {error ? <Text className="text-sm font-medium text-red-600">{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            className="min-h-13 items-center justify-center rounded-xl bg-brand-900 active:opacity-80"
            onPress={submit}
          >
            <Text className="text-base font-bold text-white">이메일 확인 화면 미리보기</Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-center text-xs leading-5 text-ink-600">
          프로토타입 단계에서는 입력값이 서버로 전송되지 않습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ISignupFieldProps {
  label: string;
  value: string;
  placeholder: string;
  helper?: string;
  autoCapitalize?: 'none';
  keyboardType?: 'email-address';
  secureTextEntry?: boolean;
  onChangeText: (value: string) => void;
}

function SignupField({
  label,
  value,
  placeholder,
  helper,
  autoCapitalize,
  keyboardType,
  secureTextEntry,
  onChangeText,
}: ISignupFieldProps): React.JSX.Element {
  return (
    <View>
      <Text className="text-sm font-semibold text-ink-900">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        className="mt-2 min-h-12 rounded-xl bg-sand-50 px-4 text-base text-ink-900"
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#84908D"
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
      />
      {helper ? <Text className="mt-2 text-xs leading-4 text-ink-600">{helper}</Text> : null}
    </View>
  );
}
