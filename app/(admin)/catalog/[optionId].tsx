import { useEffect, useState } from 'react';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { EQuoteOptionFormType } from '@/entities/quote-option';
import {
  formatPriceInput,
  parsePriceInput,
  QuoteOptionManagementError,
  type TQuoteOptionEditableImage,
  useQuoteOption,
  useUpdateQuoteOption,
} from '@/features/quote-option-management';

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BASE_PRICE = 1_000_000_000_000;
const MAX_DISPLAY_ORDER = 9_999;

const quoteOptionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '옵션명을 입력해 주세요.')
    .max(50, '옵션명은 50자 이하로 입력해 주세요.'),
  displayOrder: z
    .string()
    .regex(/^[1-9]\d*$/, '표시 순서는 1 이상의 정수로 입력해 주세요.')
    .refine(
      (value) => Number.isSafeInteger(Number(value)) && Number(value) <= MAX_DISPLAY_ORDER,
      '표시 순서는 9,999 이하로 입력해 주세요.',
    ),
  formType: z.enum(EQuoteOptionFormType),
  basePrice: z.string().refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length > 0 && Number(digits) <= MAX_BASE_PRICE;
  }, '제품 단가는 0원 이상 1조 원 이하로 입력해 주세요.'),
});

type TQuoteOptionForm = z.infer<typeof quoteOptionSchema>;

export default function AdminQuoteOptionDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ optionId?: string | string[] }>();
  const optionId = Array.isArray(params.optionId) ? params.optionId[0] : (params.optionId ?? '');
  const optionQuery = useQuoteOption(optionId);
  const updateOption = useUpdateQuoteOption();
  const [images, setImages] = useState<TQuoteOptionEditableImage[]>([]);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const {
    control,
    formState: { errors, isDirty, isValid },
    handleSubmit,
    reset,
  } = useForm<TQuoteOptionForm>({
    resolver: zodResolver(quoteOptionSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      displayOrder: '1',
      formType: EQuoteOptionFormType.SIMPLE,
      basePrice: '0',
    },
  });

  useEffect(() => {
    const option = optionQuery.data;
    if (!option) return;

    reset({
      name: option.name,
      displayOrder: String(option.displayOrder),
      formType: option.formType,
      basePrice: formatPriceInput(String(option.basePrice)),
    });
    setImages(
      option.images.map((image) => ({
        key: image.id,
        kind: 'stored' as const,
        storagePath: image.storagePath,
        uri: image.url,
      })),
    );
    setImagesDirty(false);
  }, [optionQuery.data, reset]);

  const selectImages = async (): Promise<void> => {
    setImageError(null);
    setSaveSuccess(false);
    const remaining = MAX_IMAGE_COUNT - images.length;
    if (remaining <= 0) {
      setImageError('옵션 이미지는 최대 5장까지 등록할 수 있어요.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError('옵션 이미지를 등록하려면 사진 접근 권한이 필요해요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    });
    if (result.canceled) return;

    const oversizedImage = result.assets.find(
      (asset) => asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES,
    );
    if (oversizedImage) {
      setImageError('옵션 이미지는 한 장당 10MB 이하만 등록할 수 있어요.');
      return;
    }

    const selectedImages: TQuoteOptionEditableImage[] = result.assets.map((asset, index) => ({
      key: `${asset.uri}-${Date.now()}-${index}`,
      kind: 'new',
      asset,
      uri: asset.uri,
    }));
    setImages((current) => [...current, ...selectedImages].slice(0, MAX_IMAGE_COUNT));
    setImagesDirty(true);
  };

  const removeImage = (key: string): void => {
    setSaveSuccess(false);
    setImages((current) => current.filter((image) => image.key !== key));
    setImagesDirty(true);
  };

  const submitForm = async (values: TQuoteOptionForm): Promise<void> => {
    updateOption.reset();
    setImageError(null);
    setSaveSuccess(false);

    try {
      await updateOption.mutateAsync({
        optionId,
        name: values.name,
        displayOrder: Number(values.displayOrder),
        formType: values.formType,
        basePrice: parsePriceInput(values.basePrice),
        images,
      });
      setSaveSuccess(true);
    } catch {
      // The mutation error is rendered without clearing the current form.
    }
  };

  if (optionQuery.isLoading) {
    return <DetailLoading />;
  }

  if (optionQuery.isError || !optionQuery.data) {
    return <DetailError onRetry={() => void optionQuery.refetch()} />;
  }

  const canSave =
    isValid && (isDirty || imagesDirty) && !updateOption.isPending && Boolean(optionId);
  const mutationMessage =
    updateOption.error instanceof QuoteOptionManagementError
      ? updateOption.error.message
      : updateOption.error
        ? '입력 내용을 유지했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.'
        : null;

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityLabel="견적 옵션 목록으로 돌아가기"
            accessibilityRole="button"
            accessibilityState={{ disabled: updateOption.isPending }}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
            disabled={updateOption.isPending}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" color="#1D2725" size={24} />
          </Pressable>
          <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">견적 옵션 수정</Text>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-8 pt-3" keyboardShouldPersistTaps="handled">
          <View className="rounded-2xl border border-stone-100 bg-white p-4">
            <Text className="text-xs font-semibold text-ink-600">옵션 코드</Text>
            <Text className="mt-1 text-base font-bold text-brand-700">{optionQuery.data.code}</Text>
            <Text className="mt-2 text-xs leading-5 text-ink-600">
              고객 견적 데이터의 기준 식별자이므로 코드는 변경할 수 없습니다.
            </Text>
          </View>

          {saveSuccess ? (
            <View
              accessibilityRole="alert"
              className="mt-5 rounded-2xl border border-brand-100 bg-brand-100 p-4"
            >
              <Text className="font-bold text-brand-900">변경사항을 저장했어요.</Text>
            </View>
          ) : null}

          {mutationMessage ? (
            <View
              accessibilityRole="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <Text className="font-bold text-red-700">견적 옵션을 저장하지 못했어요.</Text>
              <Text className="mt-1 text-sm leading-5 text-red-600">{mutationMessage}</Text>
            </View>
          ) : null}

          <View className="mt-6 gap-5">
            <Controller
              control={control}
              name="name"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  disabled={updateOption.isPending}
                  error={errors.name?.message}
                  label="옵션명 *"
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    setSaveSuccess(false);
                    onChange(text);
                  }}
                  placeholder="옵션명 입력"
                  value={value}
                />
              )}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="displayOrder"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <FormField
                      disabled={updateOption.isPending}
                      error={errors.displayOrder?.message}
                      keyboardType="number-pad"
                      label="옵션 순서 *"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        setSaveSuccess(false);
                        onChange(text.replace(/\D/g, ''));
                      }}
                      placeholder="1"
                      value={value}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-bold text-ink-900">옵션 타입 *</Text>
                <Controller
                  control={control}
                  name="formType"
                  render={({ field: { onChange, value } }) => (
                    <View className="flex-row rounded-xl bg-stone-100 p-1">
                      <TypeButton
                        disabled={updateOption.isPending}
                        isSelected={value === EQuoteOptionFormType.SIMPLE}
                        label="단순형"
                        onPress={() => {
                          setSaveSuccess(false);
                          onChange(EQuoteOptionFormType.SIMPLE);
                        }}
                      />
                      <TypeButton
                        disabled={updateOption.isPending}
                        isSelected={value === EQuoteOptionFormType.ADVANCED}
                        label="고급형"
                        onPress={() => {
                          setSaveSuccess(false);
                          onChange(EQuoteOptionFormType.ADVANCED);
                        }}
                      />
                    </View>
                  )}
                />
              </View>
            </View>

            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-ink-900">옵션 이미지</Text>
                <Text className="text-xs font-semibold text-ink-600">
                  {images.length}/{MAX_IMAGE_COUNT}
                </Text>
              </View>
              {images.length > 0 ? (
                <View className="flex-row flex-wrap gap-3">
                  {images.map((image, index) => (
                    <View
                      key={image.key}
                      className="w-[47%] overflow-hidden rounded-2xl border border-stone-100 bg-white"
                    >
                      <Image
                        accessibilityLabel={`${optionQuery.data.name} 옵션 이미지 ${index + 1}`}
                        contentFit="cover"
                        source={{ uri: image.uri }}
                        style={{ height: 130, width: '100%' }}
                      />
                      <Pressable
                        accessibilityLabel={`옵션 이미지 ${index + 1} 삭제`}
                        accessibilityRole="button"
                        className="min-h-11 flex-row items-center justify-center bg-white active:bg-stone-100"
                        disabled={updateOption.isPending}
                        onPress={() => removeImage(image.key)}
                      >
                        <Ionicons name="trash-outline" color="#B7433D" size={17} />
                        <Text className="ml-1.5 text-sm font-bold text-red-600">삭제</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center rounded-2xl border border-dashed border-stone-100 bg-white px-4 py-6">
                  <Ionicons name="images-outline" color="#84908D" size={28} />
                  <Text className="mt-2 text-sm font-semibold text-ink-600">
                    등록된 옵션 이미지가 없어요.
                  </Text>
                </View>
              )}
              {images.length < MAX_IMAGE_COUNT ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-3 min-h-11 flex-row items-center justify-center rounded-xl border border-brand-700 bg-white active:bg-brand-100"
                  disabled={updateOption.isPending}
                  onPress={() => void selectImages()}
                >
                  <Ionicons name="add" color="#176D62" size={18} />
                  <Text className="ml-1.5 font-bold text-brand-700">이미지 추가</Text>
                </Pressable>
              ) : null}
              <Text className="mt-2 text-xs leading-5 text-ink-600">
                JPEG, PNG, HEIC, HEIF · 이미지당 최대 10MB · 최대 5장
              </Text>
              {imageError ? (
                <Text accessibilityRole="alert" className="mt-2 text-xs text-red-600">
                  {imageError}
                </Text>
              ) : null}
            </View>

            <Controller
              control={control}
              name="basePrice"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  disabled={updateOption.isPending}
                  error={errors.basePrice?.message}
                  helperText="원 단위 숫자를 입력하면 1,000단위 콤마가 자동 표시됩니다."
                  keyboardType="number-pad"
                  label="제품 단가 *"
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    setSaveSuccess(false);
                    onChange(formatPriceInput(text));
                  }}
                  placeholder="0"
                  suffix="원"
                  value={value}
                />
              )}
            />
          </View>
        </ScrollView>

        <View className="border-t border-stone-100 bg-white px-5 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy: updateOption.isPending,
              disabled: !canSave,
            }}
            className={`min-h-12 flex-row items-center justify-center rounded-xl ${
              canSave ? 'bg-brand-900 active:opacity-80' : 'bg-stone-100'
            }`}
            disabled={!canSave}
            onPress={() => void handleSubmit(submitForm)()}
          >
            {updateOption.isPending ? <ActivityIndicator color="#FFFFFF" /> : null}
            <Text
              className={`font-bold ${
                updateOption.isPending ? 'ml-2 text-white' : canSave ? 'text-white' : 'text-ink-600'
              }`}
            >
              {updateOption.isPending ? '저장 중...' : '변경사항 저장'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface IFormFieldProps {
  disabled: boolean;
  error?: string;
  helperText?: string;
  keyboardType?: 'default' | 'number-pad';
  label: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  placeholder: string;
  suffix?: string;
  value: string;
}

function FormField({
  disabled,
  error,
  helperText,
  keyboardType = 'default',
  label,
  onBlur,
  onChangeText,
  placeholder,
  suffix,
  value,
}: IFormFieldProps): React.JSX.Element {
  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-ink-900">{label}</Text>
      <View
        className={`min-h-12 flex-row items-center rounded-xl border bg-white px-4 ${
          error ? 'border-red-400' : 'border-stone-100'
        }`}
      >
        <TextInput
          className="min-h-12 flex-1 text-base text-ink-900"
          editable={!disabled}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#84908D"
          value={value}
        />
        {suffix ? <Text className="ml-2 text-sm font-semibold text-ink-600">{suffix}</Text> : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="mt-1.5 text-xs leading-5 text-ink-600">{helperText}</Text>
      ) : null}
    </View>
  );
}

function TypeButton({
  disabled,
  isSelected,
  label,
  onPress,
}: {
  disabled: boolean;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled }}
      className={`min-h-10 flex-1 items-center justify-center rounded-lg ${
        isSelected ? 'bg-white' : ''
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className={`text-sm font-bold ${isSelected ? 'text-brand-700' : 'text-ink-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailLoading(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
      <ActivityIndicator color="#176D62" size="large" />
      <Text className="mt-4 text-sm font-semibold text-ink-600">견적 옵션을 불러오고 있어요.</Text>
    </SafeAreaView>
  );
}

function DetailError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          accessibilityLabel="견적 옵션 목록으로 돌아가기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
          onPress={() => router.replace('/(admin)/catalog')}
        >
          <Ionicons name="chevron-back" color="#1D2725" size={24} />
        </Pressable>
        <Text className="ml-1 text-xl font-bold text-ink-900">견적 옵션 수정</Text>
      </View>
      <View className="flex-1 items-center justify-center px-5">
        <View
          accessibilityRole="alert"
          className="w-full items-center rounded-3xl border border-stone-100 bg-white p-6"
        >
          <Ionicons name="alert-circle-outline" color="#B7433D" size={34} />
          <Text className="mt-4 text-lg font-bold text-ink-900">견적 옵션을 찾을 수 없어요.</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
            접근 권한과 네트워크 상태를 확인해 주세요.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-5 min-h-11 items-center justify-center rounded-xl bg-brand-900 px-6 active:opacity-80"
            onPress={onRetry}
          >
            <Text className="font-bold text-white">다시 시도</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
