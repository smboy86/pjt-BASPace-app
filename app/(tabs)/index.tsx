import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDemoSessionStore } from '@/features/demo-session';
import { usePartnerStore } from '@/entities/partner';
import { ERemodelRequestStatus, useRemodelRequestStore } from '@/entities/remodel-request';
import { useQuoteStore } from '@/entities/quote';

const STATUS_LABELS: Record<ERemodelRequestStatus, string> = {
  [ERemodelRequestStatus.DRAFT]: '작성 중',
  [ERemodelRequestStatus.SUBMITTED]: '매칭 대기',
  [ERemodelRequestStatus.MATCHED]: '업체 매칭 완료',
  [ERemodelRequestStatus.IN_CONSULTATION]: '견적 협의 중',
  [ERemodelRequestStatus.FINAL_QUOTE_SENT]: '최종 견적 도착',
  [ERemodelRequestStatus.CONFIRMED]: '최종 컨펌',
  [ERemodelRequestStatus.CLOSED]: '상담 종료',
};

const ROLE_COPY = {
  customer: {
    eyebrow: '나의 욕실 프로젝트',
    title: '좋은 선택은\n정확한 조건에서 시작돼요.',
    action: '새 견적 요청',
  },
  partner: {
    eyebrow: '업체 담당자',
    title: '고객의 선택을\n신뢰할 수 있는 견적으로.',
    action: '견적 작성하기',
  },
  admin: {
    eyebrow: '바스페이스 운영',
    title: '매칭과 상담 흐름을\n한눈에 관리하세요.',
    action: '카탈로그 관리',
  },
};

export default function HomeScreen(): React.JSX.Element {
  const user = useDemoSessionStore((state) => state.user);
  const requests = useRemodelRequestStore((state) => state.requests);
  const assignments = usePartnerStore((state) => state.requestPartners);
  const quotes = useQuoteStore((state) => state.quotes);

  const role = user?.role ?? 'customer';
  const copy = ROLE_COPY[role];
  const visibleRequests = requests.filter((request) => {
    if (role === 'customer') return request.customerId === 'customer-1';
    if (role === 'partner') {
      return assignments.some(
        (assignment) => assignment.requestId === request.id && assignment.partnerId === 'partner-1',
      );
    }
    return true;
  });
  const confirmedCount = requests.filter(
    (request) => request.status === ERemodelRequestStatus.CONFIRMED,
  ).length;

  const openAction = (): void => {
    router.navigate('/(tabs)/explore');
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-brand-700">{copy.eyebrow}</Text>
            <Text className="mt-1 text-sm text-ink-600">
              {user?.name ?? '데모 사용자'}님, 반가워요.
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-900">
            <Ionicons name="water-outline" color="#FFFFFF" size={22} />
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-3xl bg-brand-900 p-6">
          <View className="absolute -right-8 -top-9 h-36 w-36 rounded-full bg-brand-700 opacity-60" />
          <Text className="text-2xl font-bold leading-8 text-white">{copy.title}</Text>
          <Pressable
            accessibilityLabel={copy.action}
            className="mt-6 min-h-12 self-start justify-center rounded-xl bg-white px-4 active:opacity-80"
            onPress={openAction}
          >
            <Text className="font-bold text-brand-900">{copy.action}</Text>
          </Pressable>
        </View>

        {role === 'admin' && (
          <View className="mt-5 flex-row gap-3">
            <MetricCard label="전체 요청" value={String(requests.length)} />
            <MetricCard label="최종 컨펌" value={String(confirmedCount)} />
          </View>
        )}

        <View className="mt-8 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-ink-900">
              {role === 'customer'
                ? '내 견적 요청'
                : role === 'partner'
                  ? '배정된 상담'
                  : '전체 상담 요청'}
            </Text>
            <Text className="mt-1 text-sm text-ink-600">최근 진행 상황을 확인하세요.</Text>
          </View>
          <Text className="text-sm font-semibold text-brand-700">{visibleRequests.length}건</Text>
        </View>

        <View className="mt-4 gap-3">
          {visibleRequests.length === 0 ? (
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
                        {request.budgetRange}
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

function MetricCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-1 rounded-2xl bg-white p-4">
      <Text className="text-xs font-semibold text-ink-600">{label}</Text>
      <Text className="mt-2 text-2xl font-bold text-ink-900">{value}</Text>
    </View>
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
