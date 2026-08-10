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
  isFutureConstructionDate,
  useSubmitRemodelRequest,
} from '@/features/create-remodel-request';
import { useCustomerQuoteOptions } from '@/features/select-quote-options';
import {
  ERemodelBudgetCode,
  REMODEL_BUDGET_OPTIONS,
  type IRequestPhoto,
} from '@/entities/remodel-request';
import type { IQuoteOption, IQuoteOptionProduct } from '@/entities/quote-option';

interface IFormErrors {
  address?: string;
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
  const [desiredConstructionDate, setDesiredConstructionDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [checkedOptionIds, setCheckedOptionIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, string | undefined>>(
    {},
  );
  const [errors, setErrors] = useState<IFormErrors>({});
  const [isAddressSearchVisible, setIsAddressSearchVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

  const quoteOptions = quoteOptionsQuery.data ?? EMPTY_QUOTE_OPTIONS;
  const selectedProducts = useMemo(
    () =>
      quoteOptions.flatMap((option) => {
        if (!checkedOptionIds.includes(option.id)) return [];
        const product = option.products.find((item) => item.id === selectedProductIds[option.id]);
        return product ? [{ option, product }] : [];
      }),
    [checkedOptionIds, quoteOptions, selectedProductIds],
  );
  const selectedTotal = useMemo(
    () => selectedProducts.reduce((total, item) => total + item.product.price, 0),
    [selectedProducts],
  );

  const selectPhoto = async (): Promise<void> => {
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
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos((current) => [...current, ...result.assets].slice(0, 5));
    }
  };

  const toggleOption = (option: IQuoteOption): void => {
    if (option.products.length === 0) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isChecked = checkedOptionIds.includes(option.id);
    setCheckedOptionIds((current) =>
      isChecked ? current.filter((id) => id !== option.id) : [...current, option.id],
    );

    if (isChecked) {
      setSelectedProductIds((current) => ({ ...current, [option.id]: undefined }));
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
      if (!selectedProductIds[optionId]) {
        result[optionId] = '이 옵션에서 제품을 하나 선택해 주세요.';
      }
      return result;
    }, {});
    const nextErrors: IFormErrors = {
      address: region.trim() ? undefined : '주소를 검색해 기본 주소를 입력해 주세요.',
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
      !nextErrors.budget &&
      !nextErrors.constructionType &&
      !nextErrors.desiredConstructionDate &&
      !nextErrors.options
    );
  };

  const submitRequest = async (): Promise<void> => {
    if (!user) {
      Alert.alert('로그인이 필요해요', '다시 로그인한 뒤 요청을 등록해 주세요.');
      router.replace('/(auth)/login');
      return;
    }
    if (
      !validateForm() ||
      !budgetCode ||
      requiresDemolition === null ||
      !desiredConstructionDate
    )
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
        })),
        requiresDemolition,
      });
      setRegion('');
      setAddressDetail('');
      setBudgetCode(null);
      setRequiresDemolition(null);
      setDesiredConstructionDate(null);
      setNotes('');
      setPhotos([]);
      setCheckedOptionIds([]);
      setSelectedProductIds({});
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
                placeholderTextColor="#84908D"
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
              placeholderTextColor="#84908D"
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
                  className={`min-h-10 justify-center rounded-full px-4 ${
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
          dateError={errors.desiredConstructionDate}
          desiredConstructionDate={desiredConstructionDate}
          onDateChange={(date) => {
            setDesiredConstructionDate(date);
            setErrors((current) => ({ ...current, desiredConstructionDate: undefined }));
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
            onPress={selectPhoto}
          >
            <Ionicons color="#176D62" name="images-outline" size={26} />
            <Text className="mt-2 font-bold text-brand-900">사진 선택하기</Text>
            <Text className="mt-1 text-xs text-ink-600">{photos.length}/5장 선택됨</Text>
          </Pressable>
        </Section>

        <Section
          error={errors.options ? '체크한 항목마다 제품을 하나 선택해 주세요.' : undefined}
          title="중요 선택 옵션"
        >
          <Text className="text-sm leading-5 text-ink-600">
            필요한 항목만 체크하고, 펼쳐진 제품 중 하나를 선택해 주세요.
          </Text>
          {quoteOptionsQuery.isPending && (
            <View className="items-center rounded-2xl bg-white py-8">
              <ActivityIndicator color="#176D62" />
              <Text className="mt-3 text-sm text-ink-600">견적 옵션을 불러오는 중이에요.</Text>
            </View>
          )}
          {quoteOptionsQuery.isError && (
            <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <Text className="text-sm leading-5 text-red-700">견적 옵션을 불러오지 못했어요.</Text>
              <Pressable
                accessibilityLabel="견적 옵션 다시 불러오기"
                className="mt-3 min-h-10 items-center justify-center rounded-xl bg-white"
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
              onToggle={() => toggleOption(option)}
              option={option}
              selectedProductId={selectedProductIds[option.id]}
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
            placeholderTextColor="#84908D"
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
            선택한 제품 단가의 합계이며, 최종 공사 견적은 관리자 확인 후 안내됩니다.
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
            submitMutation.isPending || quoteOptionsQuery.isPending
              ? 'bg-stone-100'
              : 'bg-brand-900 active:opacity-80'
          }`}
          disabled={submitMutation.isPending || quoteOptionsQuery.isPending}
          onPress={() => void submitRequest()}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
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
  isChecked,
  selectedProductId,
  error,
  onToggle,
  onProductSelect,
}: {
  option: IQuoteOption;
  isChecked: boolean;
  selectedProductId?: string;
  error?: string;
  onToggle: () => void;
  onProductSelect: (productId: string) => void;
}): React.JSX.Element {
  const hasProducts = option.products.length > 0;

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
          color={isChecked ? '#176D62' : hasProducts ? '#84908D' : '#C9CECC'}
          name={isChecked ? 'checkbox' : 'square-outline'}
          size={24}
        />
        <View className="ml-3 flex-1">
          <Text className={`font-bold ${hasProducts ? 'text-ink-900' : 'text-ink-500'}`}>
            {option.name}
          </Text>
          {!hasProducts && <Text className="mt-1 text-xs text-ink-500">등록된 제품이 없어요.</Text>}
        </View>
        {isChecked && <Ionicons color="#84908D" name="chevron-up" size={20} />}
      </Pressable>

      {isChecked && (
        <View className="border-t border-stone-100 pb-4 pt-3">
          <ScrollView
            contentContainerClassName="gap-3 px-4"
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {option.products.map((product) => (
              <ProductCard
                key={product.id}
                isSelected={selectedProductId === product.id}
                onPress={() => onProductSelect(product.id)}
                product={product}
              />
            ))}
          </ScrollView>
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
  isSelected,
  onPress,
}: {
  product: IQuoteOptionProduct;
  isSelected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={`${product.name} ${formatPrice(product.price)} 선택`}
      className={`w-44 overflow-hidden rounded-2xl border ${
        isSelected ? 'border-2 border-brand-700 bg-brand-100' : 'border-stone-100 bg-white'
      }`}
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
          <Ionicons color="#84908D" name="image-outline" size={28} />
        </View>
      )}
      <View className="p-3">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-sm font-bold text-ink-900" numberOfLines={2}>
            {product.name}
          </Text>
          <Ionicons
            color={isSelected ? '#176D62' : '#C9CECC'}
            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
          />
        </View>
        <Text className="mt-2 text-sm font-semibold text-brand-900">
          + {formatPrice(product.price)}
        </Text>
      </View>
    </Pressable>
  );
}
