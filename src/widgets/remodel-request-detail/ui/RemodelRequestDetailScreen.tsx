import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ERequestPartnerStatus } from '@/entities/partner';
import { EQuoteStatus, useQuoteStore } from '@/entities/quote';
import {
  ERemodelRequestStatus,
  formatRemodelSchedule,
  getDemolitionCostAmount,
  getRemodelBudgetLabel,
  getRemodelRequestBaseEstimate,
  type IRemodelRequest,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import {
  useAdjustRemodelRequestQuote,
  useConfirmAdjustedRemodelRequestQuote,
} from '@/features/adjust-remodel-request-quote';
import {
  type IAssignablePartner,
  useAssignablePartners,
  useAssignRemodelRequestPartner,
} from '@/features/assign-remodel-request-partner';
import { useAuthSession } from '@/features/auth';
import { useCompleteRemodelRequest } from '@/features/complete-remodel-request';
import { useRespondToPartnerRequest } from '@/features/partner-request-management';
import {
  EConsultationMessageType,
  usePostRequestConsultationMessage,
  useRequestConsultationMessages,
  useRequestConsultationStore,
} from '@/features/request-consultation';
import { useUpdateRemodelRequestSchedule } from '@/features/update-remodel-request-schedule';
import { ConstructionDatePickerModal } from '@/shared/ui';

type TRequestDetailRole = 'customer' | 'admin' | 'partner';

interface IRemodelRequestDetailScreenProps {
  role: TRequestDetailRole;
  request?: IRemodelRequest;
  customerName?: string;
  assignmentStatus?: ERequestPartnerStatus;
  isLoading: boolean;
  isError: boolean;
  onBack?: () => void;
  onRetry: () => void;
}

const MAX_ESTIMATE_AMOUNT = 1_000_000_000_000;
const MAX_ADJUSTMENT_REASON_LENGTH = 500;

const formatAmountInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
};

const parseAmountInput = (value: string): number | null => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
};

export function RemodelRequestDetailScreen({
  role,
  request,
  customerName,
  assignmentStatus,
  isLoading,
  isError,
  onBack = router.back,
  onRetry,
}: IRemodelRequestDetailScreenProps): React.JSX.Element {
  const { user } = useAuthSession();
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);
  const allQuotes = useQuoteStore((state) => state.quotes);
  const confirmQuote = useQuoteStore((state) => state.confirmQuote);
  const allMessages = useRequestConsultationStore((state) => state.messages);
  const addMessage = useRequestConsultationStore((state) => state.addMessage);
  const consultationMessagesQuery = useRequestConsultationMessages(request?.id ?? '');
  const postMessageMutation = usePostRequestConsultationMessage();
  const adjustMutation = useAdjustRemodelRequestQuote();
  const resetAdjustMutation = adjustMutation.reset;
  const confirmAdjustmentMutation = useConfirmAdjustedRemodelRequestQuote();
  const partnerResponseMutation = useRespondToPartnerRequest();
  const resetPartnerResponseMutation = partnerResponseMutation.reset;
  const completeRequestMutation = useCompleteRemodelRequest();
  const updateScheduleMutation = useUpdateRemodelRequestSchedule();
  const resetUpdateScheduleMutation = updateScheduleMutation.reset;
  const resetCompleteRequestMutation = completeRequestMutation.reset;
  const [message, setMessage] = useState('');
  const [adjustedAmountInput, setAdjustedAmountInput] = useState('');
  const [adjustedReasonInput, setAdjustedReasonInput] = useState('');
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<IAssignablePartner | null>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const assignablePartnersQuery = useAssignablePartners(role === 'admin' && assignmentModalVisible);
  const assignPartnerMutation = useAssignRemodelRequestPartner();

  const quotes = useMemo(
    () => allQuotes.filter((item) => item.requestId === request?.id),
    [allQuotes, request?.id],
  );
  const messages = useMemo(() => {
    const messagesById = new Map(
      allMessages.filter((item) => item.requestId === request?.id).map((item) => [item.id, item]),
    );

    consultationMessagesQuery.data?.forEach((item) => messagesById.set(item.id, item));
    return [...messagesById.values()].sort((first, second) =>
      first.createdAt.localeCompare(second.createdAt),
    );
  }, [allMessages, consultationMessagesQuery.data, request?.id]);
  const latestQuote = useMemo(
    () => [...quotes].sort((first, second) => second.version - first.version)[0],
    [quotes],
  );
  const originalEstimateAmount = useMemo(
    () => (request ? getRemodelRequestBaseEstimate(request) : 0),
    [request],
  );

  useEffect(() => {
    setAdjustedAmountInput(
      request?.adjustedEstimateAmount !== undefined
        ? request.adjustedEstimateAmount.toLocaleString('ko-KR')
        : '',
    );
    setAdjustedReasonInput(request?.adjustedEstimateReason ?? '');
    resetAdjustMutation();
  }, [
    request?.adjustedEstimateAmount,
    request?.adjustedEstimateReason,
    request?.id,
    resetAdjustMutation,
  ]);

  useEffect(() => {
    resetPartnerResponseMutation();
    resetCompleteRequestMutation();
  }, [request?.id, resetCompleteRequestMutation, resetPartnerResponseMutation]);

  useEffect(() => {
    setSelectedSchedule(request?.desiredSchedule ?? null);
    resetUpdateScheduleMutation();
  }, [request?.desiredSchedule, request?.id, resetUpdateScheduleMutation]);

  if (isLoading && !request) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <ActivityIndicator color="#163A63" size="large" />
        <Text className="mt-4 text-sm font-semibold text-ink-600">
          견적 요청을 불러오고 있어요.
        </Text>
      </SafeAreaView>
    );
  }

  if (isError && !request) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <Text accessibilityRole="alert" className="text-lg font-bold text-ink-900">
          견적 요청을 불러오지 못했어요.
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-ink-600">
          네트워크 연결과 접근 권한을 확인한 뒤 다시 시도해 주세요.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5"
          onPress={onRetry}
        >
          <Text className="font-bold text-white">다시 시도</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <Text className="text-lg font-bold text-ink-900">요청을 찾을 수 없어요.</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900 px-4"
          onPress={onBack}
        >
          <Text className="font-bold text-white">목록으로 돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const adjustedEstimateAmount = request.adjustedEstimateAmount;
  const currentEstimateAmount = adjustedEstimateAmount ?? originalEstimateAmount;
  const adjustedEstimateDifference =
    adjustedEstimateAmount === undefined
      ? undefined
      : adjustedEstimateAmount - originalEstimateAmount;
  const parsedAdjustedAmount = parseAmountInput(adjustedAmountInput);
  const amountError =
    adjustedAmountInput.length === 0
      ? '수정 견적 금액을 입력해 주세요.'
      : parsedAdjustedAmount === null || parsedAdjustedAmount > MAX_ESTIMATE_AMOUNT
        ? '0원 이상 1조 원 이하의 금액을 입력해 주세요.'
        : null;
  const trimmedAdjustedReason = adjustedReasonInput.trim();
  const reasonError =
    trimmedAdjustedReason.length === 0
      ? '수정 견적 사유를 입력해 주세요.'
      : trimmedAdjustedReason.length > MAX_ADJUSTMENT_REASON_LENGTH
        ? '수정 견적 사유는 500자 이하로 입력해 주세요.'
        : null;
  const canAdjust = role === 'admin' && request.status === ERemodelRequestStatus.SUBMITTED;
  const adjustmentLockedMessage = request.adjustmentConfirmedAt
    ? '고객이 확인한 견적은 수정할 수 없습니다.'
    : request.status === ERemodelRequestStatus.QUOTE_ADJUSTMENT
      ? '고객에게 전달된 견적은 수정할 수 없습니다.'
      : '신규 견적 상태에서만 견적 금액을 조정할 수 있습니다.';
  const canRespondToPartnerRequest =
    role === 'partner' &&
    assignmentStatus === ERequestPartnerStatus.ASSIGNED &&
    (request.status === ERemodelRequestStatus.MATCHED ||
      request.status === ERemodelRequestStatus.IN_CONSULTATION);
  const isConstructionInProgress =
    request.status === ERemodelRequestStatus.IN_CONSULTATION ||
    request.status === ERemodelRequestStatus.FINAL_QUOTE_SENT;
  const canCompleteConstruction =
    isConstructionInProgress &&
    (role === 'admin' ||
      (role === 'partner' && assignmentStatus === ERequestPartnerStatus.ACCEPTED));
  const showCompletionSection =
    canCompleteConstruction ||
    ((role === 'admin' || role === 'partner') &&
      completeRequestMutation.variables === request.id &&
      (completeRequestMutation.isError || completeRequestMutation.isSuccess));
  const canAssignPartner =
    role === 'admin' &&
    (request.status === ERemodelRequestStatus.SUBMITTED ||
      request.status === ERemodelRequestStatus.QUOTE_ADJUSTMENT);
  const canUpdateSchedule =
    role === 'admin' &&
    !request.adjustmentConfirmedAt &&
    (request.status === ERemodelRequestStatus.SUBMITTED ||
      request.status === ERemodelRequestStatus.QUOTE_ADJUSTMENT);
  const minimumScheduleDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const displayedSchedule = selectedSchedule ?? request.desiredSchedule;
  const displayedAvailableSchedule =
    role === 'admin' && displayedSchedule !== request.desiredSchedule
      ? displayedSchedule
      : request.latestScheduleChange?.newSchedule;
  const canSaveSchedule =
    canUpdateSchedule &&
    displayedSchedule !== request.desiredSchedule &&
    displayedSchedule >= minimumScheduleDate &&
    !updateScheduleMutation.isPending;

  const sendMessage = async (): Promise<void> => {
    const trimmed = message.trim();
    if (!trimmed || !user?.id) return;

    try {
      await postMessageMutation.mutateAsync({
        requestId: request.id,
        authorId: user.id,
        body: trimmed,
      });
      setMessage('');
    } catch {
      // The mutation error is displayed below the input.
    }
  };

  const handleConfirmFinalQuote = (): void => {
    if (!latestQuote || role !== 'customer') return;
    confirmQuote(latestQuote.id);
    updateRequest(request.id, { status: ERemodelRequestStatus.CONFIRMED });
    addMessage({
      requestId: request.id,
      authorId: user?.id ?? request.customerId,
      messageType: EConsultationMessageType.FINAL_CONFIRMED,
      quoteId: latestQuote.id,
      body: '최종 견적을 확인했습니다. 다음 상담 절차를 안내해주세요.',
    });
    Alert.alert('최종 컨펌을 완료했어요', '이후 계약과 시공 일정은 업체와 상담하여 진행합니다.');
  };

  const handleAdjustQuote = async (): Promise<void> => {
    if (!canAdjust || parsedAdjustedAmount === null || amountError) return;

    try {
      await adjustMutation.mutateAsync({
        requestId: request.id,
        amount: parsedAdjustedAmount,
        reason: trimmedAdjustedReason,
      });
      Alert.alert('견적 조정을 완료했어요', '고객이 조정 견적을 확인할 수 있습니다.');
    } catch {
      // The mutation error is displayed inline.
    }
  };

  const handleConfirmAdjustment = async (): Promise<void> => {
    try {
      await confirmAdjustmentMutation.mutateAsync(request.id);
      Alert.alert('조정 견적을 확정했어요', '관리자가 다음 절차를 진행할 예정입니다.');
    } catch {
      // The mutation error is displayed inline.
    }
  };

  const openAssignmentModal = (): void => {
    if (!canAssignPartner) return;
    setSelectedPartner(null);
    assignPartnerMutation.reset();
    setAssignmentModalVisible(true);
  };

  const closeAssignmentModal = (): void => {
    if (assignPartnerMutation.isPending) return;
    setAssignmentModalVisible(false);
    setSelectedPartner(null);
    assignPartnerMutation.reset();
  };

  const handleAssignPartner = async (): Promise<void> => {
    if (!selectedPartner || !canAssignPartner) return;

    try {
      await assignPartnerMutation.mutateAsync({
        requestId: request.id,
        partnerId: selectedPartner.id,
      });
      setAssignmentModalVisible(false);
      setSelectedPartner(null);
      router.replace('/(admin)/requests');
    } catch {
      // The mutation error remains visible in the confirmation modal.
    }
  };

  const respondToPartnerRequest = async (action: 'proceed' | 'decline'): Promise<void> => {
    if (!canRespondToPartnerRequest || partnerResponseMutation.isPending) {
      return;
    }

    try {
      await partnerResponseMutation.mutateAsync({ requestId: request.id, action });
    } catch {
      // The mutation error is displayed inline while the assigned actions stay available.
    }
  };

  const handleDeclinePartnerRequest = (): void => {
    Alert.alert('견적을 진행하지 않으시겠습니까?', undefined, [
      { text: '돌아가기', style: 'cancel' },
      {
        text: '진행 불가',
        style: 'destructive',
        onPress: () => void respondToPartnerRequest('decline'),
      },
    ]);
  };

  const handleCompleteConstruction = async (): Promise<void> => {
    if (!canCompleteConstruction || completeRequestMutation.isPending) return;

    try {
      await completeRequestMutation.mutateAsync(request.id);
    } catch {
      // The mutation error is displayed inline while the completion action remains available.
    }
  };

  const handleUpdateSchedule = async (): Promise<void> => {
    if (!canSaveSchedule) return;

    try {
      await updateScheduleMutation.mutateAsync({
        requestId: request.id,
        desiredSchedule: displayedSchedule,
      });
    } catch {
      // The mutation error is displayed inline and the selected date remains available to retry.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-3">
        <Pressable
          accessibilityLabel="견적 목록으로 돌아가기"
          accessibilityRole="button"
          className="mb-4 min-h-11 flex-row items-center"
          onPress={onBack}
        >
          <Ionicons name="chevron-back" color="#0B1F3A" size={22} />
          <Text className="font-semibold text-brand-900">목록</Text>
        </Pressable>

        {role === 'admin' || role === 'partner' ? (
          <Text className="mb-2 text-sm font-semibold text-brand-700">{customerName} 고객</Text>
        ) : null}
        <Text className="text-2xl font-bold text-ink-900">
          {request.region} · {request.bathroomType}
        </Text>
        {role === 'customer' || role === 'admin' ? (
          <View className="mt-6 flex-row items-stretch gap-3">
            <View className="flex-1 rounded-3xl border border-stone-100 bg-white p-4">
              <Text className="text-sm font-semibold text-brand-700">공사 희망 날짜</Text>
              <Text className="mt-2 text-xl font-bold text-ink-900">
                {formatRemodelSchedule(request.customerDesiredSchedule)}
              </Text>
            </View>

            <View className="flex-1 rounded-3xl border border-stone-100 bg-white p-4">
              <Text className="text-sm font-semibold text-brand-700">공사 가능 날짜</Text>
              {displayedAvailableSchedule ? (
                <Text className="mt-2 text-xl font-bold text-ink-900">
                  {formatRemodelSchedule(displayedAvailableSchedule)}
                </Text>
              ) : (
                <Text className="mt-2 text-sm leading-5 text-ink-600">
                  관리자가 공사 가능날짜를 입력하기 전입니다
                </Text>
              )}

              {canUpdateSchedule ? (
                <>
                  <Pressable
                    accessibilityLabel={`공사 가능 날짜 ${request.latestScheduleChange ? '변경' : '입력'}`}
                    accessibilityRole="button"
                    className="mt-4 min-h-11 items-center justify-center rounded-xl border border-brand-700 px-3 active:bg-brand-100"
                    disabled={updateScheduleMutation.isPending}
                    onPress={() => setScheduleModalVisible(true)}
                  >
                    <Text className="text-sm font-bold text-brand-900">
                      {request.latestScheduleChange ? '날짜 변경' : '날짜 입력'}
                    </Text>
                  </Pressable>

                  {displayedSchedule !== request.desiredSchedule ? (
                    <View className="mt-4">
                      <Text className="text-xs leading-5 text-ink-600">
                        저장하면 고객 화면의 공사 가능 날짜에 표시됩니다.
                      </Text>
                      {updateScheduleMutation.isError ? (
                        <Text
                          accessibilityRole="alert"
                          className="mt-2 text-xs font-semibold text-red-700"
                        >
                          공사 가능 날짜를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
                        </Text>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          busy: updateScheduleMutation.isPending,
                          disabled: !canSaveSchedule,
                        }}
                        className={`mt-3 min-h-12 items-center justify-center rounded-xl ${
                          canSaveSchedule
                            ? 'bg-brand-900 active:opacity-80'
                            : 'bg-stone-100 opacity-60'
                        }`}
                        disabled={!canSaveSchedule}
                        onPress={() => void handleUpdateSchedule()}
                      >
                        {updateScheduleMutation.isPending ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text
                            className={`font-bold ${canSaveSchedule ? 'text-white' : 'text-ink-600'}`}
                          >
                            변경 저장
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ) : updateScheduleMutation.isSuccess ? (
                    <Text
                      accessibilityRole="alert"
                      className="mt-3 text-xs font-semibold text-emerald-700"
                    >
                      공사 가능 날짜를 저장했어요.
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        ) : (
          <View className="mt-6 rounded-3xl border border-stone-100 bg-white p-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-brand-700">공사 희망 날짜</Text>
                <Text className="mt-2 text-xl font-bold text-ink-900">
                  {formatRemodelSchedule(request.desiredSchedule)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="mt-6 rounded-3xl border border-stone-100 bg-white p-5">
          <Text className="text-sm font-semibold text-brand-700">시공 타입</Text>
          <View className="mt-3">
            <Text className="text-xs font-semibold text-ink-600">욕실 크기 (mm)</Text>
            <View className="mt-2 flex-row items-end gap-2">
              <BathroomDimensionValue label="가로" value={request.bathroomWidth} />
              <Text className="mb-3 text-sm font-semibold text-ink-500">x</Text>
              <BathroomDimensionValue label="세로" value={request.bathroomLength} />
              <Text className="mb-3 text-sm font-semibold text-ink-500">x</Text>
              <BathroomDimensionValue label="높이" value={request.bathroomHeight} />
            </View>
          </View>
          <View className="my-4 h-px bg-stone-100" />
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-xl font-bold text-ink-900">
              {request.requiresDemolition === true
                ? '철거'
                : request.requiresDemolition === false
                  ? '덧방'
                  : '미설정'}
            </Text>
            {request.requiresDemolition && request.demolitionCostSnapshotManwon !== undefined ? (
              <View className="items-end">
                <Text className="text-xs font-semibold text-ink-600">추가 비용</Text>
                <Text className="mt-1 text-lg font-bold text-brand-900">
                  +{getDemolitionCostAmount(request).toLocaleString('ko-KR')}원
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5">
          <Text className="text-sm font-semibold text-brand-700">선택 리포트</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            {request.notes || '추가 요청이 없습니다.'}
          </Text>
          <View className="mt-4 gap-2">
            {request.selections.length === 0 ? (
              <Text className="text-sm text-ink-600">선택한 제품이 없습니다.</Text>
            ) : (
              request.selections.map((selection) => (
                <View key={selection.id} className="flex-row justify-between gap-3">
                  <Text className="flex-1 text-sm text-ink-900">
                    {selection.category}: {selection.itemName ?? '선택 안 함'}
                  </Text>
                  {selection.basePriceSnapshot !== undefined ? (
                    <Text className="text-sm font-semibold text-ink-900">
                      {selection.basePriceSnapshot.toLocaleString('ko-KR')}원
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
          <Text className="mt-4 text-xs text-ink-600">첨부 사진 {request.photos.length}장</Text>
        </View>

        <Text className="mt-8 text-lg font-bold text-ink-900">견적 버전</Text>
        {quotes.length === 0 ? (
          <View className="mt-3 rounded-2xl bg-white p-5">
            <Text className="text-sm text-ink-600">업체가 선택 리포트를 검토 중이에요.</Text>
          </View>
        ) : (
          <View className="mt-3 gap-3">
            {[...quotes]
              .sort((first, second) => second.version - first.version)
              .map((quote) => (
                <View key={quote.id} className="rounded-2xl bg-white p-5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-ink-900">견적 v{quote.version}</Text>
                    <Text className="text-sm font-bold text-brand-900">
                      {quote.total.toLocaleString('ko-KR')}원
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-ink-600">
                    {quote.lineItems.map((line) => line.name).join(' · ')}
                  </Text>
                  <Text className="mt-2 text-xs text-ink-600">
                    유효기간 {quote.validUntil} ·{' '}
                    {quote.taxIncluded ? '부가세 포함' : '부가세 별도'}
                  </Text>
                  {role === 'customer' && quote.status !== EQuoteStatus.CONFIRMED ? (
                    <Pressable
                      accessibilityRole="button"
                      className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900"
                      onPress={handleConfirmFinalQuote}
                    >
                      <Text className="font-bold text-white">이 견적 최종 컨펌</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
          </View>
        )}

        <Text className="mt-8 text-lg font-bold text-ink-900">상담 타임라인</Text>
        <View className="mt-3 gap-3">
          {consultationMessagesQuery.isPending && messages.length === 0 ? (
            <View className="items-center rounded-2xl bg-white p-5">
              <ActivityIndicator color="#163A63" />
              <Text className="mt-3 text-sm text-ink-600">상담 내용을 불러오고 있어요.</Text>
            </View>
          ) : consultationMessagesQuery.isError && messages.length === 0 ? (
            <View className="rounded-2xl border border-red-200 bg-white p-5">
              <Text accessibilityRole="alert" className="text-sm font-semibold text-red-700">
                상담 내용을 불러오지 못했어요.
              </Text>
              <Pressable
                accessibilityRole="button"
                className="mt-3 min-h-11 items-center justify-center rounded-xl bg-brand-900"
                onPress={() => void consultationMessagesQuery.refetch()}
              >
                <Text className="font-bold text-white">다시 시도</Text>
              </Pressable>
            </View>
          ) : messages.length === 0 ? (
            <View className="rounded-2xl bg-white p-5">
              <Text className="text-sm text-ink-600">아직 등록된 상담 내용이 없어요.</Text>
            </View>
          ) : (
            messages.map((item) => (
              <View
                key={item.id}
                className={`rounded-2xl p-4 ${
                  item.authorId === user?.id ? 'bg-brand-100' : 'bg-white'
                }`}
              >
                <Text className="text-xs font-semibold text-brand-700">
                  {item.authorId === request.customerId
                    ? role === 'admin'
                      ? (customerName ?? '고객')
                      : '고객'
                    : item.assignmentId
                      ? '업체 담당자'
                      : '바스페이스 운영팀'}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-ink-900">{item.body}</Text>
              </View>
            ))
          )}
        </View>

        {role === 'admin' || role === 'partner' ? (
          <View className="mt-8 rounded-3xl bg-brand-900 p-5">
            <Text className="text-sm font-semibold text-brand-100">현재 견적 금액</Text>
            <Text className="mt-2 text-3xl font-bold text-white">
              {currentEstimateAmount.toLocaleString('ko-KR')}원
            </Text>
            {role === 'partner' && request.adjustedEstimateReason ? (
              <View className="mt-4 rounded-xl bg-brand-800 px-4 py-3">
                <Text className="text-xs font-semibold text-brand-100">수정 견적 사유</Text>
                <Text className="mt-1 text-sm leading-5 text-white">
                  {request.adjustedEstimateReason}
                </Text>
              </View>
            ) : null}
            {request.adjustedEstimateAmount !== undefined ? (
              <Text className="mt-2 text-xs text-brand-100">
                최초 선택 합계 {originalEstimateAmount.toLocaleString('ko-KR')}원
              </Text>
            ) : null}

            {role === 'admin' ? (
              <View className="mt-6 border-t border-brand-700 pt-5">
                <Text className="text-sm font-bold text-white">수정 견적</Text>
                <View
                  className={`mt-2 flex-row items-center rounded-xl bg-white px-4 ${
                    canAdjust ? '' : 'opacity-60'
                  }`}
                >
                  <TextInput
                    accessibilityLabel="수정 견적 금액"
                    className="min-h-12 flex-1 text-right text-lg font-bold text-ink-900"
                    editable={canAdjust && !adjustMutation.isPending}
                    keyboardType="number-pad"
                    placeholder="금액 입력"
                    placeholderTextColor="#667085"
                    value={adjustedAmountInput}
                    onChangeText={(value) => {
                      setAdjustedAmountInput(formatAmountInput(value));
                      adjustMutation.reset();
                    }}
                  />
                  <Text className="ml-2 font-bold text-ink-600">원</Text>
                </View>
                <Text className="mt-4 text-sm font-bold text-white">수정 견적 사유</Text>
                <TextInput
                  accessibilityLabel="수정 견적 사유"
                  className={`mt-2 min-h-24 rounded-xl bg-white px-4 py-3 text-base leading-6 text-ink-900 ${
                    canAdjust ? '' : 'opacity-60'
                  }`}
                  editable={canAdjust && !adjustMutation.isPending}
                  maxLength={MAX_ADJUSTMENT_REASON_LENGTH}
                  multiline
                  placeholder="수정 견적 사유를 입력해 주세요."
                  placeholderTextColor="#667085"
                  textAlignVertical="top"
                  value={adjustedReasonInput}
                  onChangeText={(value) => {
                    setAdjustedReasonInput(value);
                    adjustMutation.reset();
                  }}
                />
                {!canAdjust ? (
                  <Text className="mt-2 text-xs font-semibold text-brand-100">
                    {adjustmentLockedMessage}
                  </Text>
                ) : amountError || reasonError ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-2 text-xs font-semibold text-red-200"
                  >
                    {amountError ?? reasonError}
                  </Text>
                ) : null}
                {adjustMutation.isError ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-2 text-xs font-semibold text-red-200"
                  >
                    견적을 조정하지 못했어요. 잠시 후 다시 시도해 주세요.
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: adjustMutation.isPending,
                    disabled:
                      !canAdjust ||
                      Boolean(amountError) ||
                      Boolean(reasonError) ||
                      adjustMutation.isPending,
                  }}
                  className={`mt-4 min-h-12 items-center justify-center rounded-xl ${
                    !canAdjust || amountError || reasonError || adjustMutation.isPending
                      ? 'bg-stone-100 opacity-60'
                      : 'bg-brand-700 active:opacity-80'
                  }`}
                  disabled={
                    !canAdjust ||
                    Boolean(amountError) ||
                    Boolean(reasonError) ||
                    adjustMutation.isPending
                  }
                  onPress={() => void handleAdjustQuote()}
                >
                  {adjustMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      className={`font-bold ${
                        !canAdjust || amountError || reasonError ? 'text-ink-600' : 'text-white'
                      }`}
                    >
                      견적 조정
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {role === 'admin' ? (
          <View className="mt-5 rounded-3xl border border-stone-100 bg-white p-5">
            <Text className="text-sm font-semibold text-brand-700">업체 배정</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              등록된 업체와 대표 담당자를 확인한 뒤 이 견적을 배정합니다.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canAssignPartner }}
              className={`mt-4 min-h-12 items-center justify-center rounded-xl ${
                canAssignPartner ? 'bg-brand-900 active:opacity-80' : 'bg-stone-100'
              }`}
              disabled={!canAssignPartner}
              onPress={openAssignmentModal}
            >
              <Text className={`font-bold ${canAssignPartner ? 'text-white' : 'text-ink-600'}`}>
                {canAssignPartner ? '업체 배정' : '업체 배정 완료'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {role === 'partner' ? (
          <View className="mt-5 rounded-3xl border border-stone-100 bg-white p-5">
            <Text className="text-sm font-semibold text-brand-700">배정 응답</Text>
            {partnerResponseMutation.isSuccess ? (
              <View
                accessibilityRole="alert"
                className="mt-3 flex-row items-center rounded-xl bg-green-50 px-4 py-3"
              >
                <Ionicons name="checkmark-circle" color="#277A57" size={20} />
                <Text className="ml-2 flex-1 text-sm font-bold text-green-700">
                  {partnerResponseMutation.variables.action === 'proceed'
                    ? '견적 진행 의사를 저장했어요.'
                    : '진행 불가 응답을 저장했어요.'}
                </Text>
              </View>
            ) : partnerResponseMutation.isError ? (
              <Text accessibilityRole="alert" className="mt-3 text-sm font-semibold text-red-700">
                응답을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
              </Text>
            ) : null}

            {canRespondToPartnerRequest ? (
              <View className="mt-4 gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: partnerResponseMutation.isPending,
                    disabled: partnerResponseMutation.isPending,
                  }}
                  className={`min-h-12 items-center justify-center rounded-xl bg-brand-900 ${
                    partnerResponseMutation.isPending ? 'opacity-60' : 'active:opacity-80'
                  }`}
                  disabled={partnerResponseMutation.isPending}
                  onPress={() => void respondToPartnerRequest('proceed')}
                >
                  {partnerResponseMutation.isPending &&
                  partnerResponseMutation.variables?.action === 'proceed' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-bold text-white">견적 확인 및 진행</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: partnerResponseMutation.isPending,
                    disabled: partnerResponseMutation.isPending,
                  }}
                  className={`min-h-12 items-center justify-center rounded-xl border border-red-200 bg-white ${
                    partnerResponseMutation.isPending ? 'opacity-60' : 'active:bg-red-50'
                  }`}
                  disabled={partnerResponseMutation.isPending}
                  onPress={handleDeclinePartnerRequest}
                >
                  {partnerResponseMutation.isPending &&
                  partnerResponseMutation.variables?.action === 'decline' ? (
                    <ActivityIndicator color="#B7433D" />
                  ) : (
                    <Text className="font-bold text-red-700">진행 불가</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text className="mt-3 text-sm leading-6 text-ink-600">
                {assignmentStatus === ERequestPartnerStatus.ACCEPTED
                  ? '견적 진행 의사를 전달했습니다.'
                  : assignmentStatus === ERequestPartnerStatus.DECLINED
                    ? '진행 불가로 응답한 견적입니다.'
                    : assignmentStatus === ERequestPartnerStatus.ASSIGNED
                      ? '종료된 견적에는 더 이상 응답할 수 없습니다.'
                      : '현재 배정 상태를 확인할 수 없습니다.'}
              </Text>
            )}
          </View>
        ) : null}

        {showCompletionSection ? (
          <View className="mt-5 rounded-3xl border border-stone-100 bg-white p-5">
            <Text className="text-sm font-semibold text-brand-700">시공 상태</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              시공이 모두 끝났다면 견적을 완료 상태로 변경해 주세요.
            </Text>

            {completeRequestMutation.isSuccess ? (
              <View
                accessibilityRole="alert"
                className="mt-4 flex-row items-center rounded-xl bg-green-50 px-4 py-3"
              >
                <Ionicons name="checkmark-circle" color="#277A57" size={20} />
                <Text className="ml-2 flex-1 text-sm font-bold text-green-700">
                  시공 완료 처리를 저장했어요.
                </Text>
              </View>
            ) : (
              <>
                {completeRequestMutation.isError ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-3 text-sm font-semibold text-red-700"
                  >
                    시공 완료 처리를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: completeRequestMutation.isPending,
                    disabled: completeRequestMutation.isPending,
                  }}
                  className={`mt-4 min-h-12 items-center justify-center rounded-xl bg-brand-900 ${
                    completeRequestMutation.isPending ? 'opacity-60' : 'active:opacity-80'
                  }`}
                  disabled={completeRequestMutation.isPending}
                  onPress={() => void handleCompleteConstruction()}
                >
                  {completeRequestMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-bold text-white">시공 완료</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        {role === 'customer' ? (
          <View className="mt-8 rounded-3xl border border-brand-100 bg-white p-5">
            <View className="flex-row items-end justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink-600">기존 견적</Text>
                <Text
                  className={
                    adjustedEstimateAmount === undefined
                      ? 'mt-2 text-3xl font-bold text-brand-900'
                      : 'mt-1 text-base font-semibold text-ink-500 line-through'
                  }
                >
                  {originalEstimateAmount.toLocaleString('ko-KR')}원
                </Text>
              </View>

              {adjustedEstimateAmount !== undefined && adjustedEstimateDifference !== undefined ? (
                <View
                  accessibilityLabel={
                    adjustedEstimateDifference > 0
                      ? `기존 견적보다 ${adjustedEstimateDifference.toLocaleString('ko-KR')}원 올랐어요.`
                      : adjustedEstimateDifference < 0
                        ? `기존 견적보다 ${Math.abs(adjustedEstimateDifference).toLocaleString('ko-KR')}원 내렸어요.`
                        : '기존 견적과 금액이 같습니다.'
                  }
                  className={`flex-row items-center rounded-full px-3 py-2 ${
                    adjustedEstimateDifference > 0
                      ? 'bg-red-50'
                      : adjustedEstimateDifference < 0
                        ? 'bg-green-50'
                        : 'bg-stone-50'
                  }`}
                >
                  <Ionicons
                    color={
                      adjustedEstimateDifference > 0
                        ? '#B42318'
                        : adjustedEstimateDifference < 0
                          ? '#15803D'
                          : '#667085'
                    }
                    name={
                      adjustedEstimateDifference > 0
                        ? 'arrow-up-circle'
                        : adjustedEstimateDifference < 0
                          ? 'arrow-down-circle'
                          : 'remove-circle'
                    }
                    size={20}
                  />
                  <Text
                    className={`ml-2 text-base font-semibold ${
                      adjustedEstimateDifference > 0
                        ? 'text-red-700'
                        : adjustedEstimateDifference < 0
                          ? 'text-green-700'
                          : 'text-ink-600'
                    }`}
                  >
                    {adjustedEstimateDifference > 0
                      ? '+'
                      : adjustedEstimateDifference < 0
                        ? '−'
                        : ''}
                    {Math.abs(adjustedEstimateDifference).toLocaleString('ko-KR')}원
                  </Text>
                </View>
              ) : null}
            </View>

            {adjustedEstimateAmount !== undefined && adjustedEstimateDifference !== undefined ? (
              <>
                <View className="mt-5 border-t border-stone-100 pt-4">
                  <Text className="text-sm font-semibold text-brand-700">관리자 조정 견적</Text>
                  <Text className="mt-2 text-3xl font-bold text-brand-900">
                    {adjustedEstimateAmount.toLocaleString('ko-KR')}원
                  </Text>
                </View>

                {request.adjustedEstimateReason ? (
                  <View className="mt-4 rounded-xl bg-sand-50 px-4 py-3">
                    <Text className="text-xs font-semibold text-brand-700">수정 견적 사유</Text>
                    <Text className="mt-1 text-sm leading-5 text-ink-900">
                      {request.adjustedEstimateReason}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {adjustedEstimateAmount !== undefined && request.adjustmentConfirmedAt ? (
              <View className="mt-4 flex-row items-center rounded-xl bg-brand-100 px-4 py-3">
                <Ionicons name="checkmark-circle" color="#163A63" size={20} />
                <Text className="ml-2 font-bold text-brand-900">확정한 견적입니다.</Text>
              </View>
            ) : adjustedEstimateAmount !== undefined &&
              request.status === ERemodelRequestStatus.QUOTE_ADJUSTMENT ? (
              <>
                {confirmAdjustmentMutation.isError ? (
                  <Text accessibilityRole="alert" className="mt-3 text-sm text-red-700">
                    조정 견적을 확정하지 못했어요. 다시 시도해 주세요.
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: confirmAdjustmentMutation.isPending,
                    disabled: confirmAdjustmentMutation.isPending,
                  }}
                  className="mt-4 min-h-12 items-center justify-center rounded-xl bg-brand-900 active:opacity-80"
                  disabled={confirmAdjustmentMutation.isPending}
                  onPress={() => void handleConfirmAdjustment()}
                >
                  {confirmAdjustmentMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-bold text-white">조정 견적 최종 확정</Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

        {role === 'customer' ? (
          <View className="mt-5 rounded-2xl border border-stone-100 bg-white p-3">
            <TextInput
              className="min-h-20 px-2 text-base text-ink-900"
              editable={!postMessageMutation.isPending}
              multiline
              placeholder="변경하고 싶은 조건이나 질문을 남겨주세요."
              placeholderTextColor="#667085"
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            {postMessageMutation.isError ? (
              <Text accessibilityRole="alert" className="mt-2 px-2 text-sm text-red-700">
                코멘트를 저장하지 못했어요. 입력 내용을 유지했으니 다시 시도해 주세요.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: postMessageMutation.isPending,
                disabled: message.trim().length === 0 || postMessageMutation.isPending,
              }}
              className={`mt-2 min-h-11 items-center justify-center rounded-xl ${
                message.trim().length === 0 || postMessageMutation.isPending
                  ? 'bg-stone-100'
                  : 'bg-brand-900'
              }`}
              disabled={message.trim().length === 0 || postMessageMutation.isPending}
              onPress={() => void sendMessage()}
            >
              {postMessageMutation.isPending ? (
                <ActivityIndicator color="#667085" />
              ) : (
                <Text className="font-bold text-white">코멘트 보내기</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <ConstructionDatePickerModal
        minimumDate={minimumScheduleDate}
        onClose={() => setScheduleModalVisible(false)}
        onSelect={(date) => {
          setSelectedSchedule(date);
          resetUpdateScheduleMutation();
          setScheduleModalVisible(false);
        }}
        selectedDate={displayedSchedule}
        title="공사 가능 날짜"
        visible={scheduleModalVisible && canUpdateSchedule}
      />

      <PartnerAssignmentModal
        assignError={assignPartnerMutation.isError}
        assigning={assignPartnerMutation.isPending}
        isError={assignablePartnersQuery.isError}
        isLoading={assignablePartnersQuery.isPending}
        partners={assignablePartnersQuery.data ?? []}
        selectedPartner={selectedPartner}
        visible={assignmentModalVisible}
        onAssign={() => void handleAssignPartner()}
        onClose={closeAssignmentModal}
        onRetry={() => void assignablePartnersQuery.refetch()}
        onSelect={setSelectedPartner}
      />
    </SafeAreaView>
  );
}

function BathroomDimensionValue({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1 text-xs font-semibold text-ink-600">{label}</Text>
      <View className="min-h-12 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 px-2">
        <Text className="text-sm font-bold text-ink-900">{value}</Text>
      </View>
    </View>
  );
}

function PartnerAssignmentModal({
  visible,
  partners,
  selectedPartner,
  isLoading,
  isError,
  assigning,
  assignError,
  onSelect,
  onRetry,
  onClose,
  onAssign,
}: {
  visible: boolean;
  partners: IAssignablePartner[];
  selectedPartner: IAssignablePartner | null;
  isLoading: boolean;
  isError: boolean;
  assigning: boolean;
  assignError: boolean;
  onSelect: (partner: IAssignablePartner) => void;
  onRetry: () => void;
  onClose: () => void;
  onAssign: () => void;
}): React.JSX.Element {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end bg-black/50">
        <SafeAreaView className="max-h-[82%] rounded-t-3xl bg-sand-50" edges={['bottom']}>
          <View className="flex-row items-center border-b border-stone-100 px-5 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Ionicons name="business-outline" color="#163A63" size={21} />
            </View>
            <Text className="ml-3 flex-1 text-xl font-bold text-ink-900">등록업체 리스트</Text>
            <Pressable
              accessibilityLabel="업체 배정 모달 닫기"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
              disabled={assigning}
              onPress={onClose}
            >
              <Ionicons name="close" color="#0B1F3A" size={24} />
            </Pressable>
          </View>

          {selectedPartner ? (
            <View className="px-5 pb-6 pt-6">
              <View className="rounded-3xl border border-stone-100 bg-white p-5">
                <Text className="text-lg font-bold leading-7 text-ink-900">
                  {`"${selectedPartner.companyName}" 업체에 견적을 배정하시겠습니까?`}
                </Text>
                <Text className="mt-3 text-sm leading-6 text-ink-600">
                  {selectedPartner.representativeName}({selectedPartner.representativeEmail})
                </Text>
              </View>

              {assignError ? (
                <Text accessibilityRole="alert" className="mt-3 text-sm font-semibold text-red-700">
                  업체 배정을 저장하지 못했어요. 견적 상태를 확인하고 다시 시도해 주세요.
                </Text>
              ) : null}

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  className={`min-h-12 flex-1 items-center justify-center rounded-xl border border-stone-100 bg-white ${
                    assigning ? 'opacity-50' : 'active:bg-stone-100'
                  }`}
                  disabled={assigning}
                  onPress={onClose}
                >
                  <Text className="font-bold text-ink-900">취소</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: assigning, disabled: assigning }}
                  className={`min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-900 ${
                    assigning ? 'opacity-60' : 'active:opacity-80'
                  }`}
                  disabled={assigning}
                  onPress={onAssign}
                >
                  {assigning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-bold text-white">확인</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : isLoading ? (
            <View className="items-center px-5 py-12">
              <ActivityIndicator color="#163A63" size="large" />
              <Text className="mt-4 text-sm font-semibold text-ink-600">
                등록 업체를 불러오고 있어요.
              </Text>
            </View>
          ) : isError ? (
            <View className="items-center px-5 py-10">
              <Text accessibilityRole="alert" className="text-base font-bold text-ink-900">
                등록 업체를 불러오지 못했어요.
              </Text>
              <Pressable
                accessibilityRole="button"
                className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900 px-6"
                onPress={onRetry}
              >
                <Text className="font-bold text-white">다시 시도</Text>
              </Pressable>
            </View>
          ) : partners.length === 0 ? (
            <View className="items-center px-5 py-10">
              <Ionicons name="business-outline" color="#667085" size={32} />
              <Text className="mt-3 text-base font-bold text-ink-900">
                배정 가능한 등록 업체가 없어요.
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
                승인된 업체와 활성 대표 담당자 계정을 먼저 등록해 주세요.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerClassName="gap-3 px-5 pb-7 pt-4">
              {partners.map((partner) => (
                <Pressable
                  key={partner.id}
                  accessibilityLabel={`${partner.companyName}, ${partner.representativeName}, ${partner.representativeEmail}`}
                  accessibilityHint="선택한 업체의 견적 배정 확인 화면을 엽니다."
                  accessibilityRole="button"
                  className="min-h-20 rounded-2xl border border-stone-100 bg-white px-5 py-4 active:bg-brand-100"
                  onPress={() => onSelect(partner)}
                >
                  <Text className="text-base font-bold text-ink-900">{partner.companyName}</Text>
                  <Text className="mt-1 text-sm text-ink-600">
                    {partner.representativeName}({partner.representativeEmail})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
