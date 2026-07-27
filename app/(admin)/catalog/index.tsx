import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EQuoteOptionFormType, type IQuoteOption } from '@/entities/quote-option';
import { formatWon, useQuoteOptions } from '@/features/quote-option-management';

export default function AdminQuoteOptionListScreen(): React.JSX.Element {
  const optionsQuery = useQuoteOptions();
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
          <Ionicons name="chevron-back" color="#1D2725" size={24} />
        </Pressable>
        <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">견적 옵션 관리</Text>
      </View>

      <View className="px-5 pb-4 pt-3">
        <Text className="text-xs font-semibold text-ink-600">총 {options.length}개 옵션</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          고객 견적양식에 표시할 옵션과 기준 단가를 관리합니다.
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
          refreshControl={
            <RefreshControl
              refreshing={optionsQuery.isRefetching}
              tintColor="#176D62"
              onRefresh={() => void optionsQuery.refetch()}
            />
          }
          renderItem={({ item }) => <QuoteOptionListItem option={item} />}
          ListEmptyComponent={<QuoteOptionListEmpty />}
        />
      )}
    </SafeAreaView>
  );
}

function QuoteOptionListLoading(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator color="#176D62" size="large" />
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
          <Ionicons name="options-outline" color="#176D62" size={28} />
        </View>
        <Text className="mt-4 text-lg font-bold text-ink-900">등록된 견적 옵션이 없어요.</Text>
      </View>
    </View>
  );
}

function QuoteOptionListItem({ option }: { option: IQuoteOption }): React.JSX.Element {
  const typeLabel = option.formType === EQuoteOptionFormType.ADVANCED ? '고급형' : '단순형';

  return (
    <Pressable
      accessibilityHint="견적 옵션 상세 수정 화면으로 이동합니다."
      accessibilityRole="button"
      className="mb-3 rounded-2xl border border-stone-100 bg-white p-4 active:bg-brand-100"
      onPress={() =>
        router.push({
          pathname: '/(admin)/catalog/[optionId]',
          params: { optionId: option.id },
        })
      }
    >
      <View className="flex-row items-start">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
          <Ionicons name="options" color="#176D62" size={22} />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-base font-bold text-ink-900">{option.name}</Text>
            <View className="rounded-full bg-sand-50 px-2.5 py-1">
              <Text className="text-xs font-semibold text-ink-600">{typeLabel}</Text>
            </View>
          </View>
          <Text className="mt-1 text-xs font-semibold text-brand-700">{option.code}</Text>
        </View>
        <Ionicons className="ml-2" name="chevron-forward" color="#84908D" size={20} />
      </View>
      <View className="mt-4 flex-row border-t border-stone-100 pt-3">
        <View className="flex-1">
          <Text className="text-xs text-ink-600">표시 순서</Text>
          <Text className="mt-1 text-sm font-bold text-ink-900">{option.displayOrder}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-ink-600">제품 단가</Text>
          <Text className="mt-1 text-sm font-bold text-ink-900">{formatWon(option.basePrice)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
