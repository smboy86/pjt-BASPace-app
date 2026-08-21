import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import {
  PartnerManagementError,
  useCreatePartner,
  type ICreatePartnerForm,
} from '@/features/partner-management';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const createPartnerSchema = z.object({
  companyName: z.string().trim().min(1, '업체명을 입력해 주세요.'),
  businessNumber: z.string().trim().min(1, '사업자등록번호를 입력해 주세요.'),
  representativeEmail: z.string().trim().toLowerCase().email('올바른 이메일 주소를 입력해 주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(/[a-z]/, '영문 소문자를 하나 이상 포함해 주세요.')
    .regex(/[^A-Za-z0-9\s]/, '특수문자를 하나 이상 포함해 주세요.'),
  contactName: z.string().trim().min(1, '담당자 이름을 입력해 주세요.'),
  contactPhone: z.string().trim().min(1, '담당자 연락처를 입력해 주세요.'),
  note: z.string().max(1000, '비고는 1,000자 이하로 입력해 주세요.'),
});

export default function AdminPartnerCreateScreen(): React.JSX.Element {
  const createPartner = useCreatePartner();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setError,
    clearErrors,
  } = useForm<ICreatePartnerForm>({
    resolver: zodResolver(createPartnerSchema),
    mode: 'onChange',
    defaultValues: {
      companyName: '',
      businessNumber: '',
      representativeEmail: '',
      password: '',
      contactName: '',
      contactPhone: '',
      note: '',
    },
  });

  const selectImage = async (): Promise<void> => {
    setImageError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError('사업자등록증을 첨부하려면 사진 접근 권한이 필요해요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled) return;

    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize > MAX_IMAGE_BYTES) {
      setImageError('사업자등록증 이미지는 10MB 이하만 첨부할 수 있어요.');
      return;
    }
    setImage(selected);
  };

  const submitForm = async (values: ICreatePartnerForm): Promise<void> => {
    createPartner.reset();
    clearErrors();

    try {
      await createPartner.mutateAsync({
        ...values,
        businessRegistrationImage: image,
      });
      createPartner.reset();
      router.replace('/(admin)/partners');
    } catch (error) {
      if (error instanceof PartnerManagementError && error.code === 'duplicate_business_number') {
        setError('businessNumber', { message: error.message });
      } else if (
        error instanceof PartnerManagementError &&
        (error.code === 'email_already_registered' || error.code === 'invalid_email')
      ) {
        setError('representativeEmail', { message: error.message });
      } else if (error instanceof PartnerManagementError && error.code === 'weak_password') {
        setError('password', { message: error.message });
      } else {
        setError('root.server', {
          message:
            error instanceof PartnerManagementError
              ? error.message
              : '입력 내용을 유지했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.',
        });
      }
      createPartner.reset();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityLabel="업체 목록으로 돌아가기"
            accessibilityRole="button"
            accessibilityState={{ disabled: createPartner.isPending }}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
            disabled={createPartner.isPending}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" color="#0B1F3A" size={24} />
          </Pressable>
          <Text className="ml-1 text-xl font-bold text-ink-900">업체 추가</Text>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-8 pt-3" keyboardShouldPersistTaps="handled">
          <Text className="text-sm leading-6 text-ink-600">
            업체와 대표 담당자 정보를 입력해 주세요. 별표(*) 항목은 필수입니다.
          </Text>

          {errors.root?.server?.message ? (
            <View
              accessibilityRole="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <Text className="font-bold text-red-700">업체를 등록하지 못했어요.</Text>
              <Text className="mt-1 text-sm leading-5 text-red-600">
                {errors.root.server.message}
              </Text>
            </View>
          ) : null}

          <View className="mt-6 gap-5">
            <FormField
              control={control}
              disabled={createPartner.isPending}
              error={errors.companyName?.message}
              label="업체명 *"
              name="companyName"
              placeholder="예: 노크 리모델링"
            />
            <FormField
              control={control}
              disabled={createPartner.isPending}
              error={errors.businessNumber?.message}
              keyboardType="number-pad"
              label="사업자등록번호 *"
              name="businessNumber"
              placeholder="사업자등록번호 입력"
            />

            <View>
              <Text className="mb-2 text-sm font-bold text-ink-900">업체 사업자등록증</Text>
              {image ? (
                <View className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
                  <Image
                    accessibilityLabel="선택한 사업자등록증 미리보기"
                    contentFit="contain"
                    source={{ uri: image.uri }}
                    style={{ height: 220, width: '100%' }}
                  />
                  <View className="flex-row gap-2 p-3">
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-100"
                      disabled={createPartner.isPending}
                      onPress={() => void selectImage()}
                    >
                      <Text className="font-bold text-brand-700">이미지 변경</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 flex-1 items-center justify-center rounded-xl bg-stone-100"
                      disabled={createPartner.isPending}
                      onPress={() => setImage(null)}
                    >
                      <Text className="font-bold text-ink-600">이미지 삭제</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  className="min-h-28 items-center justify-center rounded-2xl border border-dashed border-brand-700 bg-white px-4 active:bg-brand-100"
                  disabled={createPartner.isPending}
                  onPress={() => void selectImage()}
                >
                  <Ionicons name="image-outline" color="#163A63" size={28} />
                  <Text className="mt-2 font-bold text-brand-700">이미지 1장 첨부</Text>
                  <Text className="mt-1 text-xs text-ink-600">JPEG, PNG, HEIC · 최대 10MB</Text>
                </Pressable>
              )}
              {imageError ? (
                <Text accessibilityRole="alert" className="mt-2 text-xs text-red-600">
                  {imageError}
                </Text>
              ) : null}
            </View>

            <FormField
              autoCapitalize="none"
              autoComplete="email"
              control={control}
              disabled={createPartner.isPending}
              error={errors.representativeEmail?.message}
              keyboardType="email-address"
              label="업체 대표 이메일 (로그인용) *"
              name="representativeEmail"
              placeholder="대표 담당자 이메일 입력"
              textContentType="emailAddress"
            />
            <FormField
              autoCapitalize="none"
              autoComplete="new-password"
              control={control}
              disabled={createPartner.isPending}
              error={errors.password?.message}
              helperText="영문 소문자와 특수문자를 포함해 8자 이상"
              label="패스워드 *"
              name="password"
              placeholder="로그인 패스워드 입력"
              secureTextEntry
              textContentType="newPassword"
            />
            <FormField
              control={control}
              disabled={createPartner.isPending}
              error={errors.contactName?.message}
              label="담당자 이름 *"
              name="contactName"
              placeholder="담당자 이름 입력"
            />
            <FormField
              control={control}
              disabled={createPartner.isPending}
              error={errors.contactPhone?.message}
              keyboardType="phone-pad"
              label="담당자 연락처 *"
              name="contactPhone"
              placeholder="담당자 연락처 입력"
            />
            <FormField
              control={control}
              disabled={createPartner.isPending}
              error={errors.note?.message}
              label="비고"
              multiline
              name="note"
              placeholder="추가로 기록할 내용을 입력해 주세요."
            />
          </View>
        </ScrollView>

        <View className="border-t border-stone-100 bg-white px-5 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy: createPartner.isPending,
              disabled: !isValid || createPartner.isPending,
            }}
            className={`min-h-12 flex-row items-center justify-center rounded-xl ${
              isValid && !createPartner.isPending
                ? 'bg-brand-900 active:opacity-80'
                : 'bg-stone-100'
            }`}
            disabled={!isValid || createPartner.isPending}
            onPress={() => void handleSubmit(submitForm)()}
          >
            {createPartner.isPending ? <ActivityIndicator color="#FFFFFF" /> : null}
            <Text
              className={`font-bold ${
                createPartner.isPending
                  ? 'ml-2 text-white'
                  : isValid
                    ? 'text-white'
                    : 'text-ink-600'
              }`}
            >
              {createPartner.isPending ? '업체 등록 중...' : '업체 등록'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface IFormFieldProps {
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  control: ReturnType<typeof useForm<ICreatePartnerForm>>['control'];
  disabled: boolean;
  error?: string;
  helperText?: string;
  keyboardType?: TextInputProps['keyboardType'];
  label: string;
  multiline?: boolean;
  name: keyof ICreatePartnerForm;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: TextInputProps['textContentType'];
}

function FormField({
  autoCapitalize,
  autoComplete,
  control,
  disabled,
  error,
  helperText,
  keyboardType = 'default',
  label,
  multiline = false,
  name,
  placeholder,
  secureTextEntry = false,
  textContentType,
}: IFormFieldProps): React.JSX.Element {
  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-ink-900">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            accessibilityLabel={label}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            className={`rounded-2xl border bg-white px-4 text-base text-ink-900 ${
              multiline ? 'min-h-28 py-4' : 'min-h-12 py-3'
            } ${error ? 'border-red-400' : 'border-stone-100'}`}
            editable={!disabled}
            keyboardType={keyboardType}
            multiline={multiline}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#667085"
            secureTextEntry={secureTextEntry}
            textAlignVertical={multiline ? 'top' : 'center'}
            textContentType={textContentType}
            value={value}
          />
        )}
      />
      {error ? (
        <Text accessibilityRole="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="mt-1.5 text-xs text-ink-600">{helperText}</Text>
      ) : null}
    </View>
  );
}
