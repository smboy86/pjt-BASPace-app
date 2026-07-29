import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/features/auth';
import {
  ERemodelRequestStatus,
  getRemodelBudgetLabel,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import { useQuoteStore } from '@/entities/quote';
import { useCustomerRemodelRequests } from '@/features/view-remodel-requests';

const STATUS_LABELS: Record<ERemodelRequestStatus, string> = {
  [ERemodelRequestStatus.DRAFT]: '작성 중',
  [ERemodelRequestStatus.SUBMITTED]: '관리자 확인 대기',
  [ERemodelRequestStatus.QUOTE_ADJUSTMENT]: '견적 조율',
  [ERemodelRequestStatus.MATCHED]: '업체 매칭 완료',
  [ERemodelRequestStatus.IN_CONSULTATION]: '견적 협의 중',
  [ERemodelRequestStatus.FINAL_QUOTE_SENT]: '최종 견적 도착',
  [ERemodelRequestStatus.CONFIRMED]: '최종 컨펌',
  [ERemodelRequestStatus.CLOSED]: '상담 종료',
  [ERemodelRequestStatus.CANCELLED]: '취소',
};

export default function HomeScreen(): React.JSX.Element {
  const { user } = useAuthSession();
  const requests = useRemodelRequestStore((state) => state.requests);
  const quotes = useQuoteStore((state) => state.quotes);
  const requestsQuery = useCustomerRemodelRequests(user?.id ?? '');
  const refetchRequests = requestsQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void refetchRequests();
    }, [refetchRequests, user?.id]),
  );

  const requestSource = requestsQuery.data ?? requests;
  const visibleRequests = user
    ? requestSource.filter((request) => request.customerId === user.id)
    : [];

  const openAction = (): void => {
    router.navigate('/(tabs)/explore');
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={requestsQuery.isRefetching}
            tintColor="#176D62"
            onRefresh={() => void refetchRequests()}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-brand-700">나의 욕실 프로젝트</Text>
            <Text className="mt-1 text-sm text-ink-600">{user?.name ?? '고객'}님, 반가워요.</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-900">
            <Ionicons name="water-outline" color="#FFFFFF" size={22} />
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-3xl bg-brand-900 p-6">
          <View className="absolute -right-8 -top-9 h-36 w-36 rounded-full bg-brand-700 opacity-60" />
          <Text className="text-2xl font-bold leading-8 text-white">
            좋은 선택은{`\n`}정확한 조건에서 시작돼요.
          </Text>
          <Pressable
            accessibilityLabel="새 견적 요청"
            className="mt-6 min-h-12 self-start justify-center rounded-xl bg-white px-4 active:opacity-80"
            onPress={openAction}
          >
            <Text className="font-bold text-brand-900">새 견적 요청</Text>
          </Pressable>
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-ink-900">내 견적 요청</Text>
            <Text className="mt-1 text-sm text-ink-600">최근 진행 상황을 확인하세요.</Text>
          </View>
          <Text className="text-sm font-semibold text-brand-700">{visibleRequests.length}건</Text>
        </View>

        <View className="mt-4 gap-3">
          {requestsQuery.isPending ? (
            <View className="items-center rounded-2xl border border-stone-100 bg-white p-6">
              <ActivityIndicator color="#176D62" />
              <Text className="mt-3 text-sm font-semibold text-ink-600">
                저장된 견적 요청을 불러오고 있어요.
              </Text>
            </View>
          ) : requestsQuery.isError && !requestsQuery.data ? (
            <View className="rounded-2xl border border-red-200 bg-white p-6">
              <Text accessibilityRole="alert" className="text-base font-bold text-ink-900">
                견적 요청을 불러오지 못했어요.
              </Text>
              <Text className="mt-1 text-sm leading-5 text-ink-600">
                네트워크 연결을 확인한 뒤 다시 시도해 주세요.
              </Text>
              <Pressable
                accessibilityRole="button"
                className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900"
                onPress={() => void requestsQuery.refetch()}
              >
                <Text className="font-bold text-white">다시 시도</Text>
              </Pressable>
            </View>
          ) : visibleRequests.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-stone-100 bg-white p-6">
              <Text className="text-base font-bold text-ink-900">아직 요청이 없어요.</Text>
              <Text className="mt-1 text-sm leading-5 text-ink-600">
                아래 탭에서 첫 요청을 시작해보세요.
              </Text>
            </View>
          ) : (
            visibleRequests.map((request) => {
              const latestQuote = quotes
                .filter((quote) => quote.requestId === request.id)
                .sort((first, second) => second.version - first.version)[0];
              return (
                <Pressable
                  key={request.id}
                  accessibilityLabel={`${request.region} ${request.bathroomType} 요청 상세`}
                  className="rounded-2xl border border-stone-100 bg-white p-5 active:bg-brand-100"
                  onPress={() => router.push(`/request/${request.id}`)}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-ink-900">
                        {request.region} · {request.bathroomType}
                      </Text>
                      <Text className="mt-1 text-sm text-ink-600">
                        {request.scope === 'full' ? '전체 리모델링' : '부분 리모델링'} ·{' '}
                        {getRemodelBudgetLabel(request.budgetRange)}
                      </Text>
                    </View>
                    <StatusBadge label={STATUS_LABELS[request.status]} status={request.status} />
                  </View>
                  <View className="mt-4 flex-row items-center justify-between border-t border-stone-100 pt-4">
                    <Text className="text-xs text-ink-600">
                      {latestQuote
                        ? `견적 v${latestQuote.version} 준비됨`
                        : '업체 회신을 기다리는 중'}
                    </Text>
                    <Ionicons name="chevron-forward" color="#62706D" size={18} />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: ERemodelRequestStatus;
}): React.JSX.Element {
  const className =
    status === ERemodelRequestStatus.CONFIRMED
      ? 'bg-emerald-100 text-emerald-800'
      : status === ERemodelRequestStatus.FINAL_QUOTE_SENT
        ? 'bg-amber-100 text-amber-800'
        : 'bg-brand-100 text-brand-900';

  return <Text className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</Text>;
}
