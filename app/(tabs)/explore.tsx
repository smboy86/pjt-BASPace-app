import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/features/auth';
import { AddressSearchModal } from '@/features/address-search';
import {
  ConstructionRequirementsSection,
  areBathroomDimensionsValid,
  isFutureConstructionDate,
  useSubmitRemodelRequest,
} from '@/features/create-remodel-request';
import {
  getAvailableTileSizes,
  getProductsForTileSize,
  ProductImagePreviewModal,
  useCustomerQuoteOptions,
} from '@/features/select-quote-options';
import {
  ERemodelBudgetCode,
  REMODEL_BUDGET_OPTIONS,
  type IRequestPhoto,
} from '@/entities/remodel-request';
import {
  calculateQuoteOptionPrice,
  EQuoteOptionFormType,
  QUOTE_OPTION_TILE_SIZES,
  TILE_PRICE_UNAVAILABLE_LABEL,
  type IQuoteOption,
  type IQuoteOptionProduct,
  type TQuoteOptionTileSize,
} from '@/entities/quote-option';
import { compressImageAsset } from '@/shared/image-processing';

interface IFormErrors {
  address?: string;
  bathroomDimensions?: string;
  budget?: string;
  constructionType?: string;
  desiredConstructionDate?: string;
  options?: Record<string, string>;
  submission?: string;
}

const EMPTY_QUOTE_OPTIONS: IQuoteOption[] = [];
const formatPrice = (price: number): string => `${price.toLocaleString('ko-KR')}원`;

export default function ActionScreen(): React.JSX.Element {
  return <CustomerRequestScreen />;
}

function CustomerRequestScreen(): React.JSX.Element {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthSession();
  const quoteOptionsQuery = useCustomerQuoteOptions(isAuthenticated);
  const submitMutation = useSubmitRemodelRequest();
  const [region, setRegion] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [budgetCode, setBudgetCode] = useState<ERemodelBudgetCode | null>(null);
  const [requiresDemolition, setRequiresDemolition] = useState<boolean | null>(null);
  const [bathroomWidth, setBathroomWidth] = useState('');
  const [bathroomLength, setBathroomLength] = useState('');
  const [bathroomHeight, setBathroomHeight] = useState('');
  const [desiredConstructionDate, setDesiredConstructionDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [checkedOptionIds, setCheckedOptionIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedTileSizes, setSelectedTileSizes] = useState<
    Record<string, TQuoteOptionTileSize | undefined>
  >({});
  const [errors, setErrors] = useState<IFormErrors>({});
  const [isAddressSearchVisible, setIsAddressSearchVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<IQuoteOptionProduct | null>(null);

  const quoteOptions = quoteOptionsQuery.data ?? EMPTY_QUOTE_OPTIONS;
  const selectedProducts = useMemo(
    () =>
      quoteOptions.flatMap((option) => {
        if (!checkedOptionIds.includes(option.id)) return [];
        const product = option.products.find(
          (item) =>
            item.id === selectedProductIds[option.id] &&
            (option.formType !== EQuoteOptionFormType.ADVANCED ||
              item.tileSize === selectedTileSizes[option.id]),
        );
        return product ? [{ option, product }] : [];
      }),
    [checkedOptionIds, quoteOptions, selectedProductIds, selectedTileSizes],
  );
  const selectedTotal = useMemo(
    () =>
      selectedProducts.reduce(
        (total, item) =>
          total +
          calculateQuoteOptionPrice({
            bathroomHeightMm: Number(bathroomHeight),
            bathroomLengthMm: Number(bathroomLength),
            bathroomWidthMm: Number(bathroomWidth),
            optionCode: item.option.code,
            unitPrice: item.product.price,
          }).amount,
        0,
      ),
    [bathroomHeight, bathroomLength, bathroomWidth, selectedProducts],
  );

  const selectPhoto = async (): Promise<void> => {
    if (isProcessingPhotos) return;
    if (photos.length >= 5) {
      Alert.alert('사진은 최대 5장까지 등록할 수 있어요.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        '사진 접근 권한이 필요해요',
        '욕실 사진을 등록하면 더 정확하게 상담할 수 있어요.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 1,
    });

    if (!result.canceled) {
      setIsProcessingPhotos(true);
      const compressedPhotos: ImagePicker.ImagePickerAsset[] = [];
      let failedCount = 0;
      for (const asset of result.assets) {
        try {
          compressedPhotos.push(await compressImageAsset(asset, 'standard'));
        } catch {
          failedCount += 1;
        }
      }
      setPhotos((current) => [...current, ...compressedPhotos].slice(0, 5));
      setIsProcessingPhotos(false);
      if (failedCount > 0) {
        Alert.alert(
          '일부 사진을 처리하지 못했어요',
          `${failedCount}장의 사진을 제외했어요. 다른 사진을 선택해 주세요.`,
        );
      }
    }
  };

  const toggleOption = (option: IQuoteOption): void => {
    const hasSelectableProducts =
      option.formType === EQuoteOptionFormType.ADVANCED
        ? option.products.some((product) => product.tileSize !== undefined)
        : option.products.length > 0;
    if (!hasSelectableProducts) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isChecked = checkedOptionIds.includes(option.id);
    setCheckedOptionIds((current) =>
      isChecked ? current.filter((id) => id !== option.id) : [...current, option.id],
    );

    if (isChecked) {
      setSelectedProductIds((current) => ({ ...current, [option.id]: undefined }));
      setSelectedTileSizes((current) => ({ ...current, [option.id]: undefined }));
    }

    setErrors((current) => {
      if (!current.options?.[option.id]) return current;
      const nextOptionErrors = { ...current.options };
      delete nextOptionErrors[option.id];
      return {
        ...current,
        options: Object.keys(nextOptionErrors).length > 0 ? nextOptionErrors : undefined,
      };
    });
  };

  const selectTileSize = (optionId: string, tileSize: TQuoteOptionTileSize): void => {
    setSelectedTileSizes((current) => ({ ...current, [optionId]: tileSize }));
    setSelectedProductIds((current) => ({ ...current, [optionId]: undefined }));
    setErrors((current) => {
      if (!current.options?.[optionId]) return current;
      const nextOptionErrors = { ...current.options };
      delete nextOptionErrors[optionId];
      return {
        ...current,
        options: Object.keys(nextOptionErrors).length > 0 ? nextOptionErrors : undefined,
      };
    });
  };

  const selectProduct = (optionId: string, productId: string): void => {
    setSelectedProductIds((current) => ({ ...current, [optionId]: productId }));
    setErrors((current) => {
      if (!current.options?.[optionId]) return current;
      const nextOptionErrors = { ...current.options };
      delete nextOptionErrors[optionId];
      return {
        ...current,
        options: Object.keys(nextOptionErrors).length > 0 ? nextOptionErrors : undefined,
      };
    });
  };

  const validateForm = (): boolean => {
    const optionErrors = checkedOptionIds.reduce<Record<string, string>>((result, optionId) => {
      const option = quoteOptions.find((item) => item.id === optionId);
      if (option?.formType === EQuoteOptionFormType.ADVANCED && !selectedTileSizes[optionId]) {
        result[optionId] = '타일규격을 먼저 선택해 주세요.';
        return result;
      }
      if (!selectedProductIds[optionId]) {
        result[optionId] = '이 옵션에서 제품을 하나 선택해 주세요.';
      }
      return result;
    }, {});
    const nextErrors: IFormErrors = {
      address: region.trim() ? undefined : '주소를 검색해 기본 주소를 입력해 주세요.',
      bathroomDimensions: areBathroomDimensionsValid({
        bathroomHeight,
        bathroomLength,
        bathroomWidth,
      })
        ? undefined
        : '가로, 세로, 높이를 모두 입력하거나 실측 불가를 선택해 주세요.',
      budget: budgetCode ? undefined : '희망 예산을 선택해 주세요.',
      constructionType:
        requiresDemolition === null ? '철거 또는 덧방 중 하나를 선택해 주세요.' : undefined,
      desiredConstructionDate:
        desiredConstructionDate && isFutureConstructionDate(desiredConstructionDate)
          ? undefined
          : '내일 이후의 공사 희망 날짜를 선택해 주세요.',
      options: Object.keys(optionErrors).length > 0 ? optionErrors : undefined,
    };

    setErrors(nextErrors);
    return (
      !nextErrors.address &&
      !nextErrors.bathroomDimensions &&
      !nextErrors.budget &&
      !nextErrors.constructionType &&
      !nextErrors.desiredConstructionDate &&
      !nextErrors.options
    );
  };

  const submitRequest = async (): Promise<void> => {
    if (isProcessingPhotos) return;
    if (!user) {
      Alert.alert('로그인이 필요해요', '다시 로그인한 뒤 요청을 등록해 주세요.');
      router.replace('/(auth)/login');
      return;
    }
    if (!validateForm() || !budgetCode || requiresDemolition === null || !desiredConstructionDate)
      return;
    if (quoteOptionsQuery.isPending || quoteOptionsQuery.isError) {
      setErrors((current) => ({
        ...current,
        submission: '견적 옵션을 불러온 뒤 다시 시도해 주세요.',
      }));
      return;
    }

    const requestPhotos: IRequestPhoto[] = photos.map((photo, index) => ({
      id: `local-photo-${index}`,
      localUri: photo.uri,
      category: '욕실 사진',
      sortOrder: index,
      createdAt: new Date().toISOString(),
    }));

    try {
      await submitMutation.mutateAsync({
        customerId: user.id,
        bathroomHeight: Number(bathroomHeight),
        bathroomLength: Number(bathroomLength),
        bathroomWidth: Number(bathroomWidth),
        region: region.trim(),
        addressDetail: addressDetail.trim(),
        budgetCode,
        desiredConstructionDate,
        notes: notes.trim(),
        photos: requestPhotos,
        selections: selectedProducts.map(({ option, product }) => ({
          optionCode: option.code,
          optionId: option.id,
          optionName: option.name,
          productId: product.id,
          productName: product.name,
          price: product.price,
          tileSize: product.tileSize,
        })),
        requiresDemolition,
      });
      setRegion('');
      setAddressDetail('');
      setBudgetCode(null);
      setBathroomWidth('');
      setBathroomLength('');
      setBathroomHeight('');
      setRequiresDemolition(null);
      setDesiredConstructionDate(null);
      setNotes('');
      setPhotos([]);
      setCheckedOptionIds([]);
      setSelectedProductIds({});
      setSelectedTileSizes({});
      setErrors({});
      setIsConfirmationVisible(true);
    } catch {
      setErrors((current) => ({
        ...current,
        submission:
          '견적 요청을 저장하지 못했어요. 네트워크와 선택한 제품을 확인한 뒤 다시 시도해 주세요.',
      }));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-ink-900">새 욕실 견적 요청</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          조건과 제품을 선택하면 예상 선택 금액을 바로 확인할 수 있어요.
        </Text>

        <Section
          error={errors.address || errors.budget ? '필수 기본 조건을 확인해 주세요.' : undefined}
          title="기본 조건"
        >
          <View>
            <Text className="mb-2 text-sm font-semibold text-ink-900">공사 지역</Text>
            <View className="flex-row gap-2">
              <TextInput
                accessibilityLabel="기본 주소"
                className={`min-h-12 flex-1 rounded-xl border bg-stone-50 px-4 text-sm text-ink-900 ${
                  errors.address ? 'border-red-500' : 'border-stone-100'
                }`}
                editable={false}
                placeholder="주소 입력 버튼으로 검색"
                placeholderTextColor="#667085"
                value={region}
              />
              <Pressable
                accessibilityLabel="주소 입력"
                className="min-h-12 min-w-24 items-center justify-center rounded-xl bg-brand-900 px-4 active:opacity-80"
                onPress={() => setIsAddressSearchVisible(true)}
              >
                <Text className="font-bold text-white">주소 입력</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="상세 주소"
              className="mt-2 min-h-12 rounded-xl border border-stone-100 bg-white px-4 text-base text-ink-900"
              maxLength={200}
              onChangeText={setAddressDetail}
              placeholder="상세 주소를 입력해 주세요. (선택)"
              placeholderTextColor="#667085"
              value={addressDetail}
            />
            {errors.address && (
              <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-red-600">
                {errors.address}
              </Text>
            )}
          </View>

          <View>
            <Text className="text-sm font-semibold text-ink-900">희망 예산</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {REMODEL_BUDGET_OPTIONS.map((option) => (
                <Pressable
                  key={option.code}
                  accessibilityLabel={`희망 예산 ${option.label}`}
                  className={`min-h-11 justify-center rounded-full px-4 ${
                    budgetCode === option.code
                      ? 'bg-brand-900'
                      : `border bg-white ${errors.budget ? 'border-red-500' : 'border-stone-100'}`
                  }`}
                  onPress={() => {
                    setBudgetCode(option.code);
                    setErrors((current) => ({ ...current, budget: undefined }));
                  }}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      budgetCode === option.code ? 'text-white' : 'text-ink-600'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.budget && (
              <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-red-600">
                {errors.budget}
              </Text>
            )}
          </View>
        </Section>

        <ConstructionRequirementsSection
          bathroomHeight={bathroomHeight}
          bathroomLength={bathroomLength}
          bathroomWidth={bathroomWidth}
          dateError={errors.desiredConstructionDate}
          dimensionError={errors.bathroomDimensions}
          desiredConstructionDate={desiredConstructionDate}
          onBathroomHeightChange={(value) => {
            setBathroomHeight(value);
            setErrors((current) => ({ ...current, bathroomDimensions: undefined }));
          }}
          onBathroomLengthChange={(value) => {
            setBathroomLength(value);
            setErrors((current) => ({ ...current, bathroomDimensions: undefined }));
          }}
          onBathroomWidthChange={(value) => {
            setBathroomWidth(value);
            setErrors((current) => ({ ...current, bathroomDimensions: undefined }));
          }}
          onDateChange={(date) => {
            setDesiredConstructionDate(date);
            setErrors((current) => ({ ...current, desiredConstructionDate: undefined }));
          }}
          onMeasurementUnavailable={() => {
            setBathroomWidth('0');
            setBathroomLength('0');
            setBathroomHeight('0');
            setErrors((current) => ({ ...current, bathroomDimensions: undefined }));
          }}
          onRequiresDemolitionChange={(nextRequiresDemolition) => {
            setRequiresDemolition(nextRequiresDemolition);
            setErrors((current) => ({ ...current, constructionType: undefined }));
          }}
          requiresDemolition={requiresDemolition}
          typeError={errors.constructionType}
        />

        <Section title="욕실 사진 · 선택">
          <Text className="text-sm leading-5 text-ink-600">
            욕실 전경과 교체가 필요한 부위를 최대 5장까지 올려주세요.
          </Text>
          {photos.length > 0 && (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {photos.map((photo, index) => (
                <View
                  key={`${photo.uri}-${index}`}
                  className="relative h-24 w-24 overflow-hidden rounded-xl"
                >
                  <Image
                    accessibilityLabel={`선택한 욕실 사진 ${index + 1}`}
                    className="h-full w-full"
                    resizeMode="cover"
                    source={{ uri: photo.uri }}
                  />
                  <Pressable
                    accessibilityLabel={`선택한 욕실 사진 ${index + 1} 삭제`}
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-ink-900/80 active:opacity-70"
                    onPress={() =>
                      setPhotos((current) =>
                        current.filter((_, photoIndex) => photoIndex !== index),
                      )
                    }
                  >
                    <Ionicons color="#FFFFFF" name="close" size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable
            accessibilityLabel="욕실 사진 추가"
            className="mt-4 min-h-28 items-center justify-center rounded-2xl border border-dashed border-brand-700 bg-brand-100 active:opacity-80"
            disabled={isProcessingPhotos}
            onPress={selectPhoto}
          >
            <Ionicons color="#163A63" name="images-outline" size={26} />
            <Text className="mt-2 font-bold text-brand-900">
              {isProcessingPhotos ? '사진 최적화 중...' : '사진 선택하기'}
            </Text>
            <Text className="mt-1 text-xs text-ink-600">
              {photos.length}/5장 선택됨 · 장당 최대 1.5MB
            </Text>
          </Pressable>
        </Section>

        <Section
          error={errors.options ? '체크한 항목의 규격과 제품 선택을 확인해 주세요.' : undefined}
          title="중요 선택 옵션"
        >
          <Text className="text-sm leading-5 text-ink-600">
            필요한 항목만 체크해 주세요. 타일은 규격을 먼저 고른 뒤 제품을 선택할 수 있어요.
          </Text>
          {quoteOptionsQuery.isPending && (
            <View className="items-center rounded-2xl bg-white py-8">
              <ActivityIndicator color="#163A63" />
              <Text className="mt-3 text-sm text-ink-600">견적 옵션을 불러오는 중이에요.</Text>
            </View>
          )}
          {quoteOptionsQuery.isError && (
            <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <Text className="text-sm leading-5 text-red-700">견적 옵션을 불러오지 못했어요.</Text>
              <Pressable
                accessibilityLabel="견적 옵션 다시 불러오기"
                className="mt-3 min-h-11 items-center justify-center rounded-xl bg-white"
                onPress={() => void quoteOptionsQuery.refetch()}
              >
                <Text className="font-bold text-red-700">다시 시도</Text>
              </Pressable>
            </View>
          )}
          {quoteOptions.map((option) => (
            <QuoteOptionField
              key={option.id}
              error={errors.options?.[option.id]}
              isChecked={checkedOptionIds.includes(option.id)}
              onProductSelect={(productId) => selectProduct(option.id, productId)}
              onProductImagePreview={setPreviewProduct}
              onTileSizeSelect={(tileSize) => selectTileSize(option.id, tileSize)}
              onToggle={() => toggleOption(option)}
              option={option}
              bathroomHeightMm={Number(bathroomHeight)}
              bathroomLengthMm={Number(bathroomLength)}
              bathroomWidthMm={Number(bathroomWidth)}
              selectedProductId={selectedProductIds[option.id]}
              selectedTileSize={selectedTileSizes[option.id]}
            />
          ))}
        </Section>

        <Section title="추가 요청">
          <TextInput
            accessibilityLabel="추가 요청 사항"
            className="min-h-28 rounded-2xl border border-stone-100 bg-white p-4 text-base text-ink-900"
            maxLength={2000}
            multiline
            onChangeText={setNotes}
            placeholder="꼭 반영할 조건, 걱정되는 부분, 원하는 분위기를 적어주세요."
            placeholderTextColor="#667085"
            textAlignVertical="top"
            value={notes}
          />
        </Section>

        <View className="mt-7 rounded-3xl bg-brand-100 p-5">
          <Text className="text-sm font-semibold text-brand-900">선택 옵션 예상 금액</Text>
          <Text className="mt-2 text-3xl font-bold text-brand-900">
            {formatPrice(selectedTotal)}
          </Text>
          <Text className="mt-2 text-xs leading-5 text-ink-600">
            바닥·측면 타일은 욕실 면적과 평당 단가로 계산하며, 나머지는 선택한 제품 단가를
            합산합니다. 최종 공사 견적은 관리자 확인 후 안내됩니다.
          </Text>
        </View>

        {errors.submission && (
          <Text accessibilityRole="alert" className="mt-4 text-sm font-semibold text-red-600">
            {errors.submission}
          </Text>
        )}
        <Pressable
          accessibilityLabel="견적 요청 제출"
          className={`mt-5 min-h-14 items-center justify-center rounded-2xl ${
            submitMutation.isPending || quoteOptionsQuery.isPending || isProcessingPhotos
              ? 'bg-stone-100'
              : 'bg-brand-900 active:opacity-80'
          }`}
          disabled={submitMutation.isPending || quoteOptionsQuery.isPending || isProcessingPhotos}
          onPress={() => void submitRequest()}
        >
          {submitMutation.isPending || isProcessingPhotos ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#667085" />
              <Text className="font-bold text-ink-600">
                {isProcessingPhotos ? '사진 최적화 중...' : '견적 요청 중...'}
              </Text>
            </View>
          ) : (
            <Text
              className={`text-base font-bold ${
                quoteOptionsQuery.isPending ? 'text-ink-500' : 'text-white'
              }`}
            >
              견적 요청 보내기
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <AddressSearchModal
        onClose={() => setIsAddressSearchVisible(false)}
        onConfirm={(address) => {
          setRegion(address);
          setErrors((current) => ({ ...current, address: undefined }));
          setIsAddressSearchVisible(false);
        }}
        visible={isAddressSearchVisible}
      />

      <ProductImagePreviewModal onClose={() => setPreviewProduct(null)} product={previewProduct} />

      <Modal
        animationType="fade"
        onRequestClose={() => undefined}
        transparent
        visible={isConfirmationVisible}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View accessibilityRole="alert" className="w-full max-w-md rounded-3xl bg-white p-6">
            <Text className="text-xl font-bold text-ink-900">견적 요청이 완료되었습니다.</Text>
            <Text className="mt-3 text-sm leading-6 text-ink-600">
              요청 상태가 접수 완료로 변경되었습니다. 관리자의 확인과 담당자 배정을 기다려 주세요.
            </Text>
            <Pressable
              accessibilityLabel="견적 접수 확인"
              className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-brand-900 active:opacity-80"
              onPress={() => {
                setIsConfirmationVisible(false);
                router.replace('/(tabs)/home');
              }}
            >
              <Text className="font-bold text-white">확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="mt-7">
      <Text className="text-lg font-bold text-ink-900">{title}</Text>
      {error && (
        <Text accessibilityRole="alert" className="mt-1 text-sm font-semibold text-red-600">
          {error}
        </Text>
      )}
      <View className="mt-3 gap-4">{children}</View>
    </View>
  );
}

function QuoteOptionField({
  option,
  bathroomHeightMm,
  bathroomLengthMm,
  bathroomWidthMm,
  isChecked,
  selectedProductId,
  selectedTileSize,
  error,
  onToggle,
  onProductSelect,
  onProductImagePreview,
  onTileSizeSelect,
}: {
  option: IQuoteOption;
  bathroomHeightMm: number;
  bathroomLengthMm: number;
  bathroomWidthMm: number;
  isChecked: boolean;
  selectedProductId?: string;
  selectedTileSize?: TQuoteOptionTileSize;
  error?: string;
  onToggle: () => void;
  onProductSelect: (productId: string) => void;
  onProductImagePreview: (product: IQuoteOptionProduct) => void;
  onTileSizeSelect: (tileSize: TQuoteOptionTileSize) => void;
}): React.JSX.Element {
  const isAdvanced = option.formType === EQuoteOptionFormType.ADVANCED;
  const availableTileSizes = getAvailableTileSizes(option.products);
  const hasProducts = isAdvanced ? availableTileSizes.length > 0 : option.products.length > 0;
  const visibleProducts = isAdvanced
    ? getProductsForTileSize(option.products, selectedTileSize)
    : option.products;

  return (
    <View
      className={`overflow-hidden rounded-2xl border bg-white ${
        error ? 'border-red-500' : 'border-stone-100'
      }`}
    >
      <Pressable
        accessibilityLabel={`${option.name} 옵션 ${isChecked ? '선택 해제' : '선택'}`}
        className="min-h-14 flex-row items-center px-4 active:bg-stone-50"
        disabled={!hasProducts}
        onPress={onToggle}
      >
        <Ionicons
          color={isChecked ? '#163A63' : hasProducts ? '#667085' : '#B8C4D4'}
          name={isChecked ? 'checkbox' : 'square-outline'}
          size={24}
        />
        <View className="ml-3 flex-1">
          <Text className={`font-bold ${hasProducts ? 'text-ink-900' : 'text-ink-500'}`}>
            {option.name}
          </Text>
          {!hasProducts && <Text className="mt-1 text-xs text-ink-500">등록된 제품이 없어요.</Text>}
        </View>
        {isChecked && <Ionicons color="#667085" name="chevron-up" size={20} />}
      </Pressable>

      {isChecked && (
        <View className="border-t border-stone-100 pb-4 pt-3">
          {isAdvanced ? (
            <View className="px-4">
              <Text className="text-sm font-bold text-ink-900">타일규격(mm) *</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {QUOTE_OPTION_TILE_SIZES.map((size) => {
                  const available = availableTileSizes.includes(size.value);
                  const selected = selectedTileSize === size.value;
                  return (
                    <Pressable
                      key={size.value}
                      accessibilityLabel={`타일규격 ${size.label}${available ? '' : ' 제품 없음'}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: !available }}
                      className={`min-h-11 items-center justify-center rounded-full px-4 ${
                        selected
                          ? 'bg-brand-900'
                          : available
                            ? 'border border-stone-100 bg-white'
                            : 'bg-stone-100 opacity-60'
                      }`}
                      disabled={!available}
                      onPress={() => onTileSizeSelect(size.value)}
                    >
                      <Text
                        className={selected ? 'font-bold text-white' : 'font-semibold text-ink-600'}
                      >
                        {size.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {visibleProducts.length > 0 ? (
            <ScrollView
              contentContainerClassName="gap-3 px-4"
              className={isAdvanced ? 'mt-4' : undefined}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  bathroomHeightMm={bathroomHeightMm}
                  bathroomLengthMm={bathroomLengthMm}
                  bathroomWidthMm={bathroomWidthMm}
                  optionCode={option.code}
                  isSelected={selectedProductId === product.id}
                  onImagePreview={() => onProductImagePreview(product)}
                  onPress={() => onProductSelect(product.id)}
                  product={product}
                />
              ))}
            </ScrollView>
          ) : isAdvanced ? (
            <Text className="mt-3 px-4 text-xs text-ink-600">
              타일규격을 선택하면 등록된 제품이 표시돼요.
            </Text>
          ) : null}
          {error && (
            <Text
              accessibilityRole="alert"
              className="mt-3 px-4 text-xs font-semibold text-red-600"
            >
              {error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function ProductCard({
  product,
  bathroomHeightMm,
  bathroomLengthMm,
  bathroomWidthMm,
  optionCode,
  isSelected,
  onPress,
  onImagePreview,
}: {
  product: IQuoteOptionProduct;
  bathroomHeightMm: number;
  bathroomLengthMm: number;
  bathroomWidthMm: number;
  optionCode: string;
  isSelected: boolean;
  onPress: () => void;
  onImagePreview: () => void;
}): React.JSX.Element {
  const quoteOptionPrice = calculateQuoteOptionPrice({
    bathroomHeightMm,
    bathroomLengthMm,
    bathroomWidthMm,
    optionCode,
    unitPrice: product.price,
  });
  const priceAccessibilityLabel = quoteOptionPrice.isCalculatedPrice
    ? quoteOptionPrice.isCalculable
      ? `평당 ${formatPrice(product.price)}, 계산된 가격 ${formatPrice(quoteOptionPrice.amount)}`
      : `평당 ${formatPrice(product.price)}, ${TILE_PRICE_UNAVAILABLE_LABEL}`
    : formatPrice(product.price);

  return (
    <View
      className={`w-44 overflow-hidden rounded-2xl border ${
        isSelected ? 'border-2 border-brand-700 bg-brand-100' : 'border-stone-100 bg-white'
      }`}
    >
      <Pressable
        accessibilityLabel={`${product.name} ${priceAccessibilityLabel} 선택`}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        className="active:opacity-80"
        onPress={onPress}
      >
        {product.url ? (
          <Image
            accessibilityLabel={`${product.name} 제품 이미지`}
            className="h-28 w-full"
            resizeMode="cover"
            source={{ uri: product.url }}
          />
        ) : (
          <View className="h-28 w-full items-center justify-center bg-stone-50">
            <Ionicons color="#667085" name="image-outline" size={28} />
          </View>
        )}
        <View className="p-3">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-sm font-bold text-ink-900" numberOfLines={2}>
              {product.name}
            </Text>
            <Ionicons
              color={isSelected ? '#163A63' : '#B8C4D4'}
              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
            />
          </View>
          {quoteOptionPrice.isCalculatedPrice ? (
            <View className="mt-2 gap-1">
              {quoteOptionPrice.isCalculable ? (
                <Text className="text-sm font-bold text-brand-900">
                  계산된 가격 {formatPrice(quoteOptionPrice.amount)}
                </Text>
              ) : (
                <Text className="text-xs font-semibold leading-4 text-red-600">
                  {TILE_PRICE_UNAVAILABLE_LABEL}
                </Text>
              )}
            </View>
          ) : (
            <Text className="mt-2 text-sm font-semibold text-brand-900">
              + {formatPrice(product.price)}
            </Text>
          )}
        </View>
      </Pressable>

      {product.url && (
        <Pressable
          accessibilityLabel={`${product.name} 이미지 크게 보기`}
          accessibilityRole="button"
          className="absolute right-2 top-16 h-11 w-11 items-center justify-center rounded-full bg-ink-900/80 active:opacity-80"
          onPress={onImagePreview}
        >
          <Ionicons color="#FFFFFF" name="expand-outline" size={23} />
        </Pressable>
      )}
    </View>
  );
}
