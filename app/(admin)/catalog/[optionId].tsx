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
import {
  EQuoteOptionFormType,
  QUOTE_OPTION_TILE_SIZES,
  type TQuoteOptionTileSize,
} from '@/entities/quote-option';
import {
  formatPriceInput,
  parsePriceInput,
  QuoteOptionManagementError,
  type IQuoteOptionEditableProduct,
  type TQuoteOptionEditableProductImage,
  useQuoteOption,
  useUpdateQuoteOption,
} from '@/features/quote-option-management';
import { compressImageAsset, ImageCompressionError } from '@/shared/image-processing';

const MAX_PRICE = 1_000_000_000_000;
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '옵션명을 입력해 주세요.')
    .max(50, '옵션명은 50자 이하로 입력해 주세요.'),
  displayOrder: z
    .string()
    .regex(/^[1-9]\d*$/, '표시 순서는 1 이상의 정수로 입력해 주세요.')
    .refine((value) => Number(value) <= 9999, '표시 순서는 9,999 이하로 입력해 주세요.'),
  formType: z.enum(EQuoteOptionFormType),
});
type TForm = z.infer<typeof schema>;
type TEditableProduct = IQuoteOptionEditableProduct & {
  displayOrderText: string;
  priceText: string;
};

export default function AdminQuoteOptionDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ optionId?: string | string[] }>();
  const optionId = Array.isArray(params.optionId) ? params.optionId[0] : (params.optionId ?? '');
  const optionQuery = useQuoteOption(optionId);
  const updateOption = useUpdateQuoteOption();
  const [products, setProducts] = useState<TEditableProduct[]>([]);
  const [productsDirty, setProductsDirty] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const {
    control,
    formState: { errors, isDirty, isValid },
    handleSubmit,
    reset,
  } = useForm<TForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', displayOrder: '1', formType: EQuoteOptionFormType.SIMPLE },
  });

  useEffect(() => {
    const option = optionQuery.data;
    if (!option) return;
    reset({
      name: option.name,
      displayOrder: String(option.displayOrder),
      formType: option.formType,
    });
    setProducts(
      option.products.map((product) => ({
        id: product.id,
        key: product.id,
        name: product.name,
        price: product.price,
        priceText: formatPriceInput(String(product.price)),
        displayOrder: product.displayOrder,
        displayOrderText: String(product.displayOrder),
        tileSize: product.tileSize,
        createdAt: product.createdAt,
        image: product.storagePath
          ? { key: product.id, kind: 'stored', storagePath: product.storagePath, uri: product.url }
          : null,
      })),
    );
    setProductsDirty(false);
  }, [optionQuery.data, reset]);

  const addProduct = (): void => {
    setSaveSuccess(false);
    setProductError(null);
    setProductsDirty(true);
    setProducts((current) => [
      ...current,
      {
        key: `new-${Date.now()}`,
        name: '',
        price: 0,
        priceText: '',
        displayOrder: 0,
        displayOrderText: '0',
        tileSize: undefined,
        createdAt: new Date().toISOString(),
        image: null,
      },
    ]);
  };
  const changeProduct = (key: string, patch: Partial<TEditableProduct>): void => {
    setSaveSuccess(false);
    setProductError(null);
    setProductsDirty(true);
    setProducts((current) =>
      current.map((product) => (product.key === key ? { ...product, ...patch } : product)),
    );
  };
  const removeProduct = (key: string): void => {
    setSaveSuccess(false);
    setProductsDirty(true);
    setProducts((current) => current.filter((product) => product.key !== key));
  };
  const selectImage = async (key: string): Promise<void> => {
    setProductError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProductError('제품 이미지를 등록하려면 사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;
    setIsProcessingImage(true);
    try {
      const asset = await compressImageAsset(result.assets[0], 'standard');
      const image: TQuoteOptionEditableProductImage = {
        key: `${asset.uri}-${Date.now()}`,
        kind: 'new',
        asset,
        uri: asset.uri,
      };
      changeProduct(key, { image });
    } catch (error) {
      setProductError(
        error instanceof ImageCompressionError
          ? error.message
          : '제품 이미지를 처리하지 못했어요. 다른 이미지를 선택해 주세요.',
      );
    } finally {
      setIsProcessingImage(false);
    }
  };
  const requiresTileSize = optionQuery.data?.formType === EQuoteOptionFormType.ADVANCED;
  const productsAreValid = products.every(
    (product) =>
      (!requiresTileSize || product.tileSize !== undefined) &&
      product.name.trim().length > 0 &&
      product.name.trim().length <= 100 &&
      product.priceText.replace(/\D/g, '').length > 0 &&
      product.price <= MAX_PRICE &&
      product.image !== null,
  );
  const submit = async (values: TForm): Promise<void> => {
    setSaveSuccess(false);
    setProductError(null);
    updateOption.reset();
    if (!productsAreValid) {
      setProductError(
        requiresTileSize
          ? '각 제품의 타일규격, 이름, 이미지, 단가를 모두 입력해 주세요.'
          : '각 제품의 이름, 이미지, 단가를 모두 입력해 주세요.',
      );
      return;
    }
    try {
      await updateOption.mutateAsync({
        optionId,
        name: values.name,
        displayOrder: Number(values.displayOrder),
        formType: values.formType,
        products: products.map(
          ({ displayOrderText: _displayOrderText, priceText: _priceText, ...product }) => product,
        ),
      });
      setSaveSuccess(true);
      setProductsDirty(false);
    } catch {
      /* The mutation error is rendered without discarding edits. */
    }
  };
  if (optionQuery.isLoading) return <CenteredState loading text="견적 옵션을 불러오고 있어요." />;
  if (optionQuery.isError || !optionQuery.data)
    return (
      <CenteredState
        text="견적 옵션을 찾을 수 없어요."
        onPress={() => void optionQuery.refetch()}
      />
    );
  const canSave =
    isValid &&
    productsAreValid &&
    (isDirty || productsDirty) &&
    !updateOption.isPending &&
    !isProcessingImage &&
    Boolean(optionId);
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
            className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
            disabled={updateOption.isPending || isProcessingImage}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" color="#0B1F3A" size={24} />
          </Pressable>
          <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">견적 옵션 수정</Text>
        </View>
        <ScrollView contentContainerClassName="px-5 pb-8 pt-3" keyboardShouldPersistTaps="handled">
          <View className="rounded-2xl border border-stone-100 bg-white p-4">
            <Text className="text-xs font-semibold text-ink-600">옵션 코드</Text>
            <Text className="mt-1 text-base font-bold text-brand-700">{optionQuery.data.code}</Text>
            <Text className="mt-2 text-xs leading-5 text-ink-600">
              옵션은 카테고리이며, 아래에 여러 제품을 등록할 수 있어요.
            </Text>
          </View>
          {saveSuccess ? <Notice text="변경사항을 저장했어요." /> : null}
          {mutationMessage ? <Notice error text={mutationMessage} /> : null}
          <View className="mt-6 gap-5">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Field
                  label="옵션명 *"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  error={errors.name?.message}
                  disabled={updateOption.isPending}
                />
              )}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="displayOrder"
                  render={({ field }) => (
                    <Field
                      label="옵션 순서 *"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
                      error={errors.displayOrder?.message}
                      disabled={updateOption.isPending}
                      keyboardType="number-pad"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-bold text-ink-900">옵션 타입 *</Text>
                <Controller
                  control={control}
                  name="formType"
                  render={({ field }) => (
                    <View className="flex-row rounded-xl bg-stone-100 p-1">
                      <TypeButton
                        label="단순형"
                        selected={field.value === EQuoteOptionFormType.SIMPLE}
                        onPress={() => field.onChange(EQuoteOptionFormType.SIMPLE)}
                        disabled
                      />
                      <TypeButton
                        label="고급형"
                        selected={field.value === EQuoteOptionFormType.ADVANCED}
                        onPress={() => field.onChange(EQuoteOptionFormType.ADVANCED)}
                        disabled
                      />
                    </View>
                  )}
                />
                <Text className="mt-1 text-xs leading-5 text-ink-600">
                  타일 옵션은 고급형, 나머지 옵션은 단순형으로 고정돼요.
                </Text>
              </View>
            </View>
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink-900">옵션 제품</Text>
                <Text className="text-xs text-ink-600">
                  {requiresTileSize
                    ? '규격 · 순서 · 이름 · 이미지 · 단가'
                    : '순서 · 이름 · 이미지 · 단가'}
                </Text>
              </View>
              {products.map((product, index) => (
                <ProductCard
                  key={product.key}
                  product={product}
                  index={index}
                  disabled={updateOption.isPending || isProcessingImage}
                  isProcessingImage={isProcessingImage}
                  showTileSize={requiresTileSize}
                  onChange={changeProduct}
                  onDelete={removeProduct}
                  onSelectImage={selectImage}
                />
              ))}
              {products.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-stone-100 bg-white p-5">
                  <Text className="text-sm font-semibold text-ink-600">
                    등록된 제품이 없어요. 제품을 추가해 고객이 선택할 수 있게 해주세요.
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                className="mt-3 min-h-11 flex-row items-center justify-center rounded-xl border border-brand-700 bg-white active:bg-brand-100"
                disabled={updateOption.isPending || isProcessingImage}
                onPress={addProduct}
              >
                <Ionicons name="add" color="#163A63" size={18} />
                <Text className="ml-1.5 font-bold text-brand-700">제품 추가</Text>
              </Pressable>
              {productError ? (
                <Text accessibilityRole="alert" className="mt-2 text-xs text-red-600">
                  {productError}
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
        <View className="border-t border-stone-100 bg-white px-5 py-3">
          <Pressable
            accessibilityRole="button"
            className={`min-h-12 items-center justify-center rounded-xl ${canSave ? 'bg-brand-900 active:opacity-80' : 'bg-stone-100'}`}
            disabled={!canSave}
            onPress={() => void handleSubmit(submit)()}
          >
            {updateOption.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className={`font-bold ${canSave ? 'text-white' : 'text-ink-600'}`}>
                변경사항 저장
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProductCard({
  product,
  index,
  disabled,
  isProcessingImage,
  showTileSize,
  onChange,
  onDelete,
  onSelectImage,
}: {
  product: TEditableProduct;
  index: number;
  disabled: boolean;
  isProcessingImage: boolean;
  showTileSize: boolean;
  onChange: (key: string, patch: Partial<TEditableProduct>) => void;
  onDelete: (key: string) => void;
  onSelectImage: (key: string) => Promise<void>;
}): React.JSX.Element {
  return (
    <View className="mb-3 rounded-2xl border border-stone-100 bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-bold text-ink-900">제품 {index + 1}</Text>
        <Pressable
          accessibilityLabel={`제품 ${index + 1} 삭제`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onDelete(product.key)}
        >
          <Text className="text-sm font-bold text-red-600">삭제</Text>
        </Pressable>
      </View>
      {showTileSize ? (
        <TileSizeField
          disabled={disabled}
          onChange={(tileSize) => onChange(product.key, { tileSize })}
          value={product.tileSize}
        />
      ) : null}
      <Field
        label="제품 이름 *"
        value={product.name}
        onChangeText={(name) => onChange(product.key, { name })}
        disabled={disabled}
      />
      <View className="flex-row gap-3">
        <View className="w-28">
          <Field
            label="제품 순서"
            value={product.displayOrderText}
            onChangeText={(text) => {
              const displayOrderText = text.replace(/\D/g, '');
              onChange(product.key, {
                displayOrder: Number(displayOrderText || '0'),
                displayOrderText,
              });
            }}
            disabled={disabled}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <Field
            label="제품 단가 *"
            value={product.priceText}
            onChangeText={(priceText) =>
              onChange(product.key, {
                priceText: formatPriceInput(priceText),
                price: parsePriceInput(priceText),
              })
            }
            disabled={disabled}
            keyboardType="number-pad"
            suffix="원"
          />
        </View>
      </View>
      <View className="mt-3">
        <Text className="mb-2 text-sm font-bold text-ink-900">제품 이미지 *</Text>
        {product.image ? (
          <Image
            accessibilityLabel={`제품 ${index + 1} 이미지`}
            contentFit="cover"
            source={{ uri: product.image.uri }}
            style={{ height: 150, width: '100%', borderRadius: 12 }}
          />
        ) : (
          <View className="items-center rounded-xl border border-dashed border-stone-100 py-5">
            <Text className="text-sm text-ink-600">이미지를 등록해 주세요.</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          className="mt-2 min-h-11 items-center justify-center rounded-xl border border-brand-700"
          disabled={disabled}
          onPress={() => void onSelectImage(product.key)}
        >
          <Text className="font-bold text-brand-700">
            {isProcessingImage
              ? '이미지 최적화 중...'
              : product.image
                ? '이미지 변경'
                : '이미지 추가'}
          </Text>
        </Pressable>
        <Text className="mt-2 text-xs text-ink-600">
          JPEG, PNG, HEIC, HEIF · 자동 최적화(최대 1.5MB)
        </Text>
      </View>
    </View>
  );
}
function TileSizeField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: TQuoteOptionTileSize) => void;
  value?: TQuoteOptionTileSize;
}): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-sm font-bold text-ink-900">타일규격 *</Text>
      <View className="flex-row flex-wrap gap-2">
        {QUOTE_OPTION_TILE_SIZES.map((size) => {
          const selected = value === size.value;
          return (
            <Pressable
              key={size.value}
              accessibilityLabel={`타일규격 ${size.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              className={`min-h-11 items-center justify-center rounded-full px-4 ${
                selected ? 'bg-brand-900' : 'border border-stone-100 bg-white'
              }`}
              disabled={disabled}
              onPress={() => onChange(size.value)}
            >
              <Text className={selected ? 'font-bold text-white' : 'font-semibold text-ink-600'}>
                {size.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!value ? (
        <Text accessibilityRole="alert" className="mt-2 text-xs text-red-600">
          제품의 타일규격을 선택해 주세요.
        </Text>
      ) : null}
    </View>
  );
}
function Field({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  disabled,
  keyboardType = 'default',
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled: boolean;
  keyboardType?: 'default' | 'number-pad';
  suffix?: string;
}): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-sm font-bold text-ink-900">{label}</Text>
      <View
        className={`min-h-12 flex-row items-center rounded-xl border bg-white px-4 ${error ? 'border-red-400' : 'border-stone-100'}`}
      >
        <TextInput
          className="min-h-12 flex-1 text-base text-ink-900"
          editable={!disabled}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          value={value}
        />
        {suffix ? <Text className="text-sm text-ink-600">{suffix}</Text> : null}
      </View>
      {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}
function TypeButton({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-11 flex-1 items-center justify-center rounded-lg ${selected ? 'bg-white' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className={selected ? 'font-bold text-brand-700' : 'font-semibold text-ink-600'}>
        {label}
      </Text>
    </Pressable>
  );
}
function Notice({ text, error = false }: { text: string; error?: boolean }): React.JSX.Element {
  return (
    <View
      accessibilityRole="alert"
      className={`mt-5 rounded-2xl p-4 ${error ? 'border border-red-200 bg-red-50' : 'border border-brand-100 bg-brand-100'}`}
    >
      <Text className={error ? 'text-red-700' : 'text-brand-900'}>{text}</Text>
    </View>
  );
}
function CenteredState({
  text,
  loading = false,
  onPress,
}: {
  text: string;
  loading?: boolean;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-5">
      {loading ? <ActivityIndicator color="#163A63" size="large" /> : null}
      <Text className="mt-4 text-center text-base font-bold text-ink-900">{text}</Text>
      {onPress ? (
        <Pressable className="mt-4 rounded-xl bg-brand-900 px-5 py-3" onPress={onPress}>
          <Text className="font-bold text-white">다시 시도</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
