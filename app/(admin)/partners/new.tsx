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
    clearErrors('businessNumber');

    try {
      await createPartner.mutateAsync({
        ...values,
        businessRegistrationImage: image,
      });
      router.replace('/(admin)/partners');
    } catch (error) {
      if (error instanceof PartnerManagementError && error.code === 'duplicate_business_number') {
        setError('businessNumber', { message: error.message });
      }
    }
  };

  const serverError =
    createPartner.error instanceof PartnerManagementError &&
    createPartner.error.code === 'duplicate_business_number'
      ? null
      : createPartner.error;

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
            <Ionicons name="chevron-back" color="#1D2725" size={24} />
          </Pressable>
          <Text className="ml-1 text-xl font-bold text-ink-900">업체 추가</Text>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-8 pt-3" keyboardShouldPersistTaps="handled">
          <Text className="text-sm leading-6 text-ink-600">
            업체와 대표 담당자 정보를 입력해 주세요. 별표(*) 항목은 필수입니다.
          </Text>

          {serverError ? (
            <View
              accessibilityRole="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <Text className="font-bold text-red-700">업체를 등록하지 못했어요.</Text>
              <Text className="mt-1 text-sm leading-5 text-red-600">
                {serverError instanceof PartnerManagementError
                  ? serverError.message
                  : '입력 내용을 유지했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.'}
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
              placeholder="예: 바스페이스 리모델링"
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
                  <Ionicons name="image-outline" color="#176D62" size={28} />
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
  control: ReturnType<typeof useForm<ICreatePartnerForm>>['control'];
  disabled: boolean;
  error?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  label: string;
  multiline?: boolean;
  name: keyof ICreatePartnerForm;
  placeholder: string;
}

function FormField({
  control,
  disabled,
  error,
  keyboardType = 'default',
  label,
  multiline = false,
  name,
  placeholder,
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
            className={`rounded-2xl border bg-white px-4 text-base text-ink-900 ${
              multiline ? 'min-h-28 py-4' : 'min-h-12 py-3'
            } ${error ? 'border-red-400' : 'border-stone-100'}`}
            editable={!disabled}
            keyboardType={keyboardType}
            multiline={multiline}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#84908D"
            textAlignVertical={multiline ? 'top' : 'center'}
            value={value}
          />
        )}
      />
      {error ? (
        <Text accessibilityRole="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
