import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ERequestPartnerStatus } from '@/entities/partner';
import { ERemodelRequestStatus, getRemodelBudgetLabel } from '@/entities/remodel-request';
import {
  type IPartnerRemodelRequestListItem,
  usePartnerRemodelRequests,
} from '@/features/partner-request-management';

type TPartnerRequestTabId = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface IPartnerRequestTab {
  id: TPartnerRequestTabId;
  label: string;
}

interface IStatusPresentation {
  label: string;
  backgroundColor: string;
  textColor: string;
}

const PARTNER_REQUEST_TABS: IPartnerRequestTab[] = [
  { id: 'assigned', label: '배정 견적' },
  { id: 'in_progress', label: '시공중 견적' },
  { id: 'completed', label: '완료 견적' },
  { id: 'cancelled', label: '취소 견적' },
];

const TAB_PRESENTATION: Record<TPartnerRequestTabId, IStatusPresentation> = {
  assigned: {
    label: '응답 대기',
    backgroundColor: '#F7E7D3',
    textColor: '#8A4A12',
  },
  in_progress: {
    label: '진행 중',
    backgroundColor: '#E8EEF6',
    textColor: '#163A63',
  },
  completed: {
    label: '완료',
    backgroundColor: '#E1F0E8',
    textColor: '#277A57',
  },
  cancelled: {
    label: '취소',
    backgroundColor: '#FCE8E6',
    textColor: '#B7433D',
  },
};

const getPartnerRequestTabId = (
  request: IPartnerRemodelRequestListItem,
): TPartnerRequestTabId | null => {
  if (
    request.assignmentStatus === ERequestPartnerStatus.DECLINED ||
    request.status === ERemodelRequestStatus.CANCELLED
  ) {
    return 'cancelled';
  }
  if (request.assignmentStatus === ERequestPartnerStatus.ASSIGNED) {
    return 'assigned';
  }
  if (
    request.assignmentStatus === ERequestPartnerStatus.ACCEPTED &&
    (request.status === ERemodelRequestStatus.IN_CONSULTATION ||
      request.status === ERemodelRequestStatus.FINAL_QUOTE_SENT)
  ) {
    return 'in_progress';
  }
  if (
    request.assignmentStatus === ERequestPartnerStatus.ACCEPTED &&
    (request.status === ERemodelRequestStatus.CONFIRMED ||
      request.status === ERemodelRequestStatus.CLOSED)
  ) {
    return 'completed';
  }
  return null;
};

export default function PartnerRequestListScreen(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TPartnerRequestTabId>('assigned');
  const requestsQuery = usePartnerRemodelRequests();
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const visibleRequests = useMemo(
    () => requests.filter((request) => getPartnerRequestTabId(request) === activeTab),
    [activeTab, requests],
  );
  const activeTabLabel =
    PARTNER_REQUEST_TABS.find((tab) => tab.id === activeTab)?.label ?? '배정 견적';

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          accessibilityLabel="업체 담당자 홈으로 돌아가기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#0B1F3A" size={24} />
        </Pressable>
        <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">배정 견적서 확인</Text>
      </View>

      <View className="px-5 pb-4 pt-3">
        <Text className="text-sm leading-6 text-ink-600">
          우리 업체에 배정된 고객 견적을 확인하고 진행 가능 여부를 알려주세요.
        </Text>
      </View>

      <PartnerRequestTabs activeTab={activeTab} requests={requests} onSelect={setActiveTab} />

      {requestsQuery.isLoading ? (
        <PartnerRequestListLoading />
      ) : requestsQuery.isError && !requestsQuery.data ? (
        <PartnerRequestListError onRetry={() => void requestsQuery.refetch()} />
      ) : (
        <>
          {requestsQuery.isError ? (
            <View
              accessibilityRole="alert"
              className="mx-5 mb-3 flex-row items-center rounded-xl bg-red-50 px-4 py-3"
            >
              <Ionicons name="alert-circle-outline" color="#B7433D" size={18} />
              <Text className="ml-2 flex-1 text-xs font-semibold text-red-700">
                최신 정보를 불러오지 못해 이전 목록을 표시하고 있어요.
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
            <Text className="text-lg font-bold text-ink-900">{activeTabLabel}</Text>
            <Text className="text-sm font-bold text-ink-600">{visibleRequests.length}건</Text>
          </View>
          <FlashList
            contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20 }}
            data={visibleRequests}
            keyExtractor={(request) => request.id}
            refreshControl={
              <RefreshControl
                refreshing={requestsQuery.isRefetching}
                tintColor="#163A63"
                onRefresh={() => void requestsQuery.refetch()}
              />
            }
            renderItem={({ item }) => <PartnerRequestCard request={item} />}
            ListEmptyComponent={<PartnerRequestListEmpty tabLabel={activeTabLabel} />}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function PartnerRequestTabs({
  activeTab,
  requests,
  onSelect,
}: {
  activeTab: TPartnerRequestTabId;
  requests: IPartnerRemodelRequestListItem[];
  onSelect: (tab: TPartnerRequestTabId) => void;
}): React.JSX.Element {
  return (
    <View className="w-full flex-row border-y border-stone-100 bg-white">
      {PARTNER_REQUEST_TABS.map((tab, index) => {
        const isSelected = activeTab === tab.id;
        const count = requests.filter(
          (request) => getPartnerRequestTabId(request) === tab.id,
        ).length;

        return (
          <Pressable
            key={tab.id}
            accessibilityLabel={`${tab.label}, ${count}건`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            className={`min-h-16 flex-1 items-center justify-center border-b-2 px-1 ${
              isSelected
                ? 'border-b-brand-700 bg-brand-100'
                : 'border-b-transparent bg-white active:bg-sand-50'
            } ${index > 0 ? 'border-l border-l-stone-100' : ''}`}
            onPress={() => onSelect(tab.id)}
          >
            <Text
              className={`text-xs font-bold ${isSelected ? 'text-brand-900' : 'text-ink-600'}`}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            <Text
              className={`mt-1 text-xs font-semibold ${
                isSelected ? 'text-brand-700' : 'text-ink-600'
              }`}
            >
              {count}건
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PartnerRequestListLoading(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator color="#163A63" size="large" />
      <Text className="mt-4 text-sm font-semibold text-ink-600">배정 견적을 불러오고 있어요.</Text>
    </View>
  );
}

function PartnerRequestListError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <View
        accessibilityRole="alert"
        className="w-full items-center rounded-3xl border border-stone-100 bg-white p-6"
      >
        <Ionicons name="cloud-offline-outline" color="#B7433D" size={34} />
        <Text className="mt-4 text-lg font-bold text-ink-900">배정 견적을 불러오지 못했어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
          업체 연결과 네트워크 상태를 확인한 뒤 다시 시도해 주세요.
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

function PartnerRequestListEmpty({ tabLabel }: { tabLabel: string }): React.JSX.Element {
  return (
    <View className="mt-16 items-center rounded-3xl border border-stone-100 bg-white p-7">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
        <Ionicons name="document-text-outline" color="#163A63" size={28} />
      </View>
      <Text className="mt-4 text-lg font-bold text-ink-900">{tabLabel}이 없어요.</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
        다른 상태 탭을 확인하거나 목록을 아래로 당겨 새로고침해 주세요.
      </Text>
    </View>
  );
}

function PartnerRequestCard({
  request,
}: {
  request: IPartnerRemodelRequestListItem;
}): React.JSX.Element {
  const tabId = getPartnerRequestTabId(request) ?? 'assigned';
  const status = TAB_PRESENTATION[tabId];
  const submittedAt = request.submittedAt ?? request.createdAt;

  return (
    <Pressable
      accessibilityHint="견적 상세 화면으로 이동합니다."
      accessibilityLabel={`${request.customerName}, ${status.label}, ${request.region}, ${getRemodelBudgetLabel(request.budgetRange)}`}
      accessibilityRole="button"
      className="mb-3 rounded-2xl border border-stone-100 bg-white p-4 active:bg-brand-100"
      onPress={() =>
        router.push({
          pathname: '/(partner)/requests/[requestId]',
          params: { requestId: request.id },
        })
      }
    >
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-ink-900" numberOfLines={1}>
            {request.customerName}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-brand-700">
            접수 {dayjs(submittedAt).format('YYYY.MM.DD')}
          </Text>
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: status.backgroundColor }}
        >
          <Text className="text-xs font-bold" style={{ color: status.textColor }}>
            {status.label}
          </Text>
        </View>
      </View>

      <View className="mt-4 border-t border-stone-100 pt-3">
        <RequestInfoRow
          icon="location-outline"
          label={`${request.region} ${request.addressDetail}`.trim()}
        />
        <RequestInfoRow icon="wallet-outline" label={getRemodelBudgetLabel(request.budgetRange)} />
        <RequestInfoRow icon="calendar-outline" label={`희망 일정 ${request.desiredSchedule}`} />
      </View>
    </Pressable>
  );
}

function RequestInfoRow({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}): React.JSX.Element {
  return (
    <View className="mb-2 flex-row items-center">
      <Ionicons name={icon} color="#667085" size={16} />
      <Text className="ml-2 flex-1 text-sm text-ink-600" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
