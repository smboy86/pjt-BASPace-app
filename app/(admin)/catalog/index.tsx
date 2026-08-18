import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EQuoteOptionFormType, type IQuoteOption } from '@/entities/quote-option';
import { useDemolitionCostSetting } from '@/features/manage-construction-type-cost';
import { useQuoteOptions } from '@/features/quote-option-management';

export default function AdminQuoteOptionListScreen(): React.JSX.Element {
  const optionsQuery = useQuoteOptions();
  const demolitionCostQuery = useDemolitionCostSetting();
  const options = optionsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          accessibilityLabel="관리자 홈으로 돌아가기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#0B1F3A" size={24} />
        </Pressable>
        <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">견적 옵션 관리</Text>
      </View>

      <View className="px-5 pb-4 pt-3">
        <Text className="text-xs font-semibold text-ink-600">
          총 {options.length + 1}개 관리 항목
        </Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          고객 견적양식에 표시할 카테고리와 그 안의 제품을 관리합니다.
        </Text>
      </View>

      {optionsQuery.isLoading ? (
        <QuoteOptionListLoading />
      ) : optionsQuery.isError ? (
        <QuoteOptionListError onRetry={() => void optionsQuery.refetch()} />
      ) : (
        <FlashList
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20 }}
          data={options}
          keyExtractor={(option) => option.id}
          ListHeaderComponent={
            <ConstructionTypeCostListItem
              amountManwon={demolitionCostQuery.data?.amountManwon}
              isError={demolitionCostQuery.isError}
              isLoading={demolitionCostQuery.isLoading}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={optionsQuery.isRefetching || demolitionCostQuery.isRefetching}
              tintColor="#163A63"
              onRefresh={() =>
                void Promise.all([optionsQuery.refetch(), demolitionCostQuery.refetch()])
              }
            />
          }
          renderItem={({ item }) => <QuoteOptionListItem option={item} />}
          ListEmptyComponent={<QuoteOptionListEmpty />}
        />
      )}
    </SafeAreaView>
  );
}

function ConstructionTypeCostListItem({
  amountManwon,
  isError,
  isLoading,
}: {
  amountManwon?: number;
  isError: boolean;
  isLoading: boolean;
}): React.JSX.Element {
  const statusText = isLoading
    ? '설정 불러오는 중'
    : isError || amountManwon === undefined
      ? '설정 조회 실패'
      : `철거 ${amountManwon.toLocaleString('ko-KR')}만원`;

  return (
    <Pressable
      accessibilityLabel={`시공 타입 금액 설정, ${statusText}`}
      accessibilityHint="철거 추가 비용 설정 화면으로 이동합니다."
      accessibilityRole="button"
      className="mb-4 min-h-20 justify-center rounded-2xl border border-brand-100 bg-white px-4 py-4 active:bg-brand-100"
      onPress={() => router.push('/(admin)/catalog/construction-type-cost')}
    >
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
          <Ionicons name="hammer-outline" color="#163A63" size={22} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-ink-900">시공 타입 금액 설정</Text>
          <Text className="mt-1 text-xs text-ink-600">철거 선택 시 추가되는 견적 금액</Text>
        </View>
        <Text className={`ml-2 text-xs font-bold ${isError ? 'text-red-600' : 'text-brand-700'}`}>
          {statusText}
        </Text>
        <Ionicons className="ml-1.5" name="chevron-forward" color="#667085" size={18} />
      </View>
    </Pressable>
  );
}

function QuoteOptionListLoading(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator color="#163A63" size="large" />
      <Text className="mt-4 text-sm font-semibold text-ink-600">견적 옵션을 불러오고 있어요.</Text>
    </View>
  );
}

function QuoteOptionListError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <View
        accessibilityRole="alert"
        className="w-full items-center rounded-3xl border border-stone-100 bg-white p-6"
      >
        <Ionicons name="cloud-offline-outline" color="#B7433D" size={34} />
        <Text className="mt-4 text-lg font-bold text-ink-900">견적 옵션을 불러오지 못했어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
          네트워크 상태를 확인한 뒤 다시 시도해 주세요.
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
  );
}

function QuoteOptionListEmpty(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="w-full items-center rounded-3xl border border-stone-100 bg-white p-7">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
          <Ionicons name="grid-outline" color="#163A63" size={28} />
        </View>
        <Text className="mt-4 text-lg font-bold text-ink-900">등록된 견적 옵션이 없어요.</Text>
      </View>
    </View>
  );
}

function QuoteOptionListItem({ option }: { option: IQuoteOption }): React.JSX.Element {
  const isAdvanced = option.formType === EQuoteOptionFormType.ADVANCED;
  const typeLabel = isAdvanced ? '고급형' : '단순형';

  return (
    <Pressable
      accessibilityLabel={`${option.name}, ${option.code}, ${typeLabel}, 등록 제품 ${option.products.length}개`}
      accessibilityHint="견적 옵션 상세 수정 화면으로 이동합니다."
      accessibilityRole="button"
      className="mb-3 min-h-16 justify-center rounded-2xl border border-stone-100 bg-white px-4 py-3 active:bg-brand-100"
      onPress={() =>
        router.push({
          pathname: '/(admin)/catalog/[optionId]',
          params: { optionId: option.id },
        })
      }
    >
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
          <Ionicons name="grid-outline" color="#163A63" size={20} />
        </View>
        <Text className="ml-3 flex-1 text-sm font-bold text-ink-900" numberOfLines={1}>
          {option.name}
          <Text className="text-xs font-semibold text-brand-700"> · {option.code}</Text>
        </Text>
        <View
          className={`ml-2 rounded-full px-2.5 py-1 ${
            isAdvanced ? 'bg-brand-100' : 'bg-stone-100'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${isAdvanced ? 'text-brand-700' : 'text-ink-600'}`}
          >
            {typeLabel}
          </Text>
        </View>
        <Text className="ml-2 text-xs font-semibold text-ink-600">
          제품 {option.products.length}개
        </Text>
        <Ionicons className="ml-1.5" name="chevron-forward" color="#667085" size={18} />
      </View>
    </Pressable>
  );
}
