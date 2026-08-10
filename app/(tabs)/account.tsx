import { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from 'expo-router/react-navigation';
import { goBackOrCustomerQuotes } from '@shared/lib';
import { useAuthSession, useAuthStore } from '@/features/auth';
import {
  type ICustomerProfile,
  useCustomerProfile,
  useUpdateCustomerProfile,
} from '@/features/customer-profile';

const normalizePhone = (value: string): string => value.replace(/\D/g, '');

const formatDomesticPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const formatStoredPhone = (value: string): string => {
  const digits = normalizePhone(value);
  const isDomesticPhone = /^[\d\s-]+$/.test(value) && /^0\d{9,10}$/.test(digits);
  return isDomesticPhone ? formatDomesticPhone(digits) : value;
};

export default function AccountScreen(): React.JSX.Element {
  const { user } = useAuthSession();
  const customerId = user?.role === 'customer' ? user.id : '';
  const profileQuery = useCustomerProfile(customerId);
  const updateProfile = useUpdateCustomerProfile();
  const [initialProfile, setInitialProfile] = useState<ICustomerProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profileQuery.data) return;
    const isEditing =
      initialProfile !== null &&
      (name.trim() !== initialProfile.name ||
        phone !== formatStoredPhone(initialProfile.phone ?? ''));
    if (isEditing) return;

    setInitialProfile(profileQuery.data);
    setName(profileQuery.data.name);
    setPhone(formatStoredPhone(profileQuery.data.phone ?? ''));
  }, [initialProfile, name, phone, profileQuery.data]);

  const normalizedName = name.trim();
  const normalizedPhone = normalizePhone(phone);
  const nameChanged = initialProfile !== null && normalizedName !== initialProfile.name;
  const phoneChanged =
    initialProfile !== null && phone !== formatStoredPhone(initialProfile.phone ?? '');
  const nameError =
    submitted && (normalizedName.length < 2 || normalizedName.length > 80)
      ? '이름은 2자 이상 80자 이하로 입력해 주세요.'
      : '';
  const phoneError =
    submitted && phoneChanged && normalizedPhone.length > 0 && !/^\d{10,11}$/.test(normalizedPhone)
      ? '연락처는 숫자 10~11자리로 입력해 주세요.'
      : '';
  const hasChanges = useMemo(() => nameChanged || phoneChanged, [nameChanged, phoneChanged]);
  const isValid =
    normalizedName.length >= 2 &&
    normalizedName.length <= 80 &&
    (!phoneChanged || normalizedPhone.length === 0 || /^\d{10,11}$/.test(normalizedPhone));

  usePreventRemove(updateProfile.isPending, () => {
    // Keep the mutation mounted until Supabase returns so the final cache and
    // auth-memory synchronization cannot be skipped by a hardware back gesture.
  });

  const save = async (): Promise<void> => {
    setSubmitted(true);
    setSaved(false);
    updateProfile.reset();
    if (!isValid || !hasChanges || !customerId) return;

    try {
      const updatedProfile = await updateProfile.mutateAsync({
        customerId,
        name: normalizedName,
        ...(phoneChanged ? { phone: normalizedPhone || null } : {}),
      });
      setInitialProfile(updatedProfile);
      setName(updatedProfile.name);
      setPhone(formatStoredPhone(updatedProfile.phone ?? ''));
      useAuthStore.getState().setUserName(updatedProfile.name);
      setSubmitted(false);
      setSaved(true);
    } catch {
      // The mutation error is presented without discarding the user's input.
    }
  };

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50" edges={['top']}>
        <ActivityIndicator color="#123F3B" size="large" />
        <Text className="mt-4 text-sm font-semibold text-ink-600">
          로그인 정보를 불러오고 있어요.
        </Text>
      </SafeAreaView>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 px-5" edges={['top']}>
        <AccountHeader disabled={false} />
        <View className="mt-8 rounded-3xl border border-stone-100 bg-white p-6">
          <Ionicons name="cloud-offline-outline" color="#B7433D" size={30} />
          <Text accessibilityRole="alert" className="mt-4 text-xl font-bold text-ink-900">
            로그인 정보를 불러오지 못했어요.
          </Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            네트워크 연결을 확인한 뒤 다시 시도해 주세요.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-5 min-h-12 items-center justify-center rounded-xl bg-brand-900"
            onPress={() => void profileQuery.refetch()}
          >
            <Text className="font-bold text-white">다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-5 pb-12" keyboardShouldPersistTaps="handled">
          <AccountHeader disabled={updateProfile.isPending} />

          <Text className="mt-4 text-2xl font-bold text-ink-900">로그인 정보</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            상담과 견적 안내에 사용할 고객 정보를 관리하세요.
          </Text>

          <View className="mt-6 rounded-3xl border border-stone-100 bg-white p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Ionicons name="person-outline" color="#123F3B" size={24} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xs font-semibold text-ink-600">로그인 계정</Text>
                <Text className="mt-1 text-base font-bold text-ink-900">{user?.email ?? ''}</Text>
              </View>
            </View>
          </View>

          <View className="mt-4 gap-5 rounded-3xl border border-stone-100 bg-white p-5">
            <AccountField
              editable={!updateProfile.isPending}
              error={nameError}
              label="이름"
              maxLength={80}
              placeholder="이름을 입력해 주세요"
              value={name}
              onBlur={() => setSubmitted(true)}
              onChangeText={(value) => {
                setName(value);
                setSaved(false);
                updateProfile.reset();
              }}
            />
            <AccountField
              editable={!updateProfile.isPending}
              error={phoneError}
              helper="숫자 10~11자리로 입력해 주세요."
              keyboardType="phone-pad"
              label="연락처"
              maxLength={13}
              placeholder="010-1234-5678"
              textContentType="telephoneNumber"
              value={phone}
              onBlur={() => setSubmitted(true)}
              onChangeText={(value) => {
                setPhone(formatDomesticPhone(normalizePhone(value).slice(0, 11)));
                setSaved(false);
                updateProfile.reset();
              }}
            />

            {saved ? (
              <View
                accessibilityRole="alert"
                className="flex-row items-center rounded-xl bg-brand-100 px-4 py-3"
              >
                <Ionicons name="checkmark-circle" color="#176D62" size={20} />
                <Text className="ml-2 flex-1 text-sm font-semibold text-brand-900">
                  로그인 정보를 저장했어요.
                </Text>
              </View>
            ) : null}

            {updateProfile.isError ? (
              <Text accessibilityRole="alert" className="text-sm font-medium text-red-600">
                정보를 저장하지 못했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: updateProfile.isPending,
                disabled: !hasChanges || !isValid || updateProfile.isPending,
              }}
              className={`h-12 flex-row items-center justify-center rounded-xl bg-brand-900 ${
                !hasChanges || !isValid || updateProfile.isPending
                  ? 'opacity-50'
                  : 'active:opacity-80'
              }`}
              disabled={!hasChanges || !isValid || updateProfile.isPending}
              onPress={() => void save()}
            >
              {updateProfile.isPending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text className="ml-2 text-base font-bold text-white">저장 중</Text>
                </>
              ) : (
                <Text className="text-base font-bold text-white">변경사항 저장</Text>
              )}
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-start rounded-2xl bg-stone-100 px-4 py-3">
            <Ionicons name="lock-closed-outline" color="#62706D" size={18} />
            <Text className="ml-2 flex-1 text-xs leading-5 text-ink-600">
              이메일은 로그인 계정 식별 정보로 이 화면에서 변경할 수 없습니다.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface IAccountHeaderProps {
  disabled: boolean;
}

function AccountHeader({ disabled }: IAccountHeaderProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel="설정으로 돌아가기"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="min-h-11 self-start flex-row items-center pt-1"
      disabled={disabled}
      onPress={goBackOrCustomerQuotes}
    >
      <Ionicons name="chevron-back" color="#123F3B" size={22} />
      <Text className="font-semibold text-brand-900">설정</Text>
    </Pressable>
  );
}

interface IAccountFieldProps {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  helper?: string;
  editable: boolean;
  keyboardType?: 'phone-pad';
  maxLength?: number;
  textContentType?: 'telephoneNumber';
  onBlur?: () => void;
  onChangeText: (value: string) => void;
}

function AccountField({
  label,
  value,
  placeholder,
  error,
  helper,
  editable,
  keyboardType,
  maxLength,
  textContentType,
  onBlur,
  onChangeText,
}: IAccountFieldProps): React.JSX.Element {
  return (
    <View>
      <Text className="text-sm font-semibold text-ink-900">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        className={`mt-2 min-h-12 rounded-xl border px-4 text-base text-ink-900 ${
          error ? 'border-red-500 bg-white' : 'border-transparent bg-sand-50'
        }`}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor="#84908D"
        textContentType={textContentType}
        value={value}
        onBlur={onBlur}
        onChangeText={onChangeText}
      />
      {error ? (
        <Text accessibilityRole="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </Text>
      ) : helper ? (
        <Text className="mt-2 text-xs leading-4 text-ink-600">{helper}</Text>
      ) : null}
    </View>
  );
}
