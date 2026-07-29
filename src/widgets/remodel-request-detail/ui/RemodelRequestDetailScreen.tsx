import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EQuoteStatus, useQuoteStore } from '@/entities/quote';
import {
  ERemodelRequestStatus,
  getRemodelBudgetLabel,
  type IRemodelRequest,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import {
  useAdjustRemodelRequestQuote,
  useConfirmAdjustedRemodelRequestQuote,
} from '@/features/adjust-remodel-request-quote';
import { useAuthSession } from '@/features/auth';
import {
  EConsultationMessageType,
  usePostRequestConsultationMessage,
  useRequestConsultationMessages,
  useRequestConsultationStore,
} from '@/features/request-consultation';

type TRequestDetailRole = 'customer' | 'admin';

interface IRemodelRequestDetailScreenProps {
  role: TRequestDetailRole;
  request?: IRemodelRequest;
  customerName?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const MAX_ESTIMATE_AMOUNT = 1_000_000_000_000;

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
  isLoading,
  isError,
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
  const [message, setMessage] = useState('');
  const [adjustedAmountInput, setAdjustedAmountInput] = useState('');

  const quotes = useMemo(
    () => allQuotes.filter((item) => item.requestId === request?.id),
    [allQuotes, request?.id],
  );
  const messages = useMemo(() => {
    const messagesById = new Map(
      allMessages
        .filter((item) => item.requestId === request?.id)
        .map((item) => [item.id, item]),
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
    () =>
      request?.selections.reduce((sum, selection) => sum + (selection.basePriceSnapshot ?? 0), 0) ??
      0,
    [request?.selections],
  );

  useEffect(() => {
    setAdjustedAmountInput(
      request?.adjustedEstimateAmount !== undefined
        ? request.adjustedEstimateAmount.toLocaleString('ko-KR')
        : '',
    );
    resetAdjustMutation();
  }, [request?.adjustedEstimateAmount, request?.id, resetAdjustMutation]);

  if (isLoading && !request) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <ActivityIndicator color="#176D62" size="large" />
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
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">목록으로 돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentEstimateAmount = request.adjustedEstimateAmount ?? originalEstimateAmount;
  const parsedAdjustedAmount = parseAmountInput(adjustedAmountInput);
  const amountError =
    adjustedAmountInput.length === 0
      ? '수정 견적 금액을 입력해 주세요.'
      : parsedAdjustedAmount === null || parsedAdjustedAmount > MAX_ESTIMATE_AMOUNT
        ? '0원 이상 1조 원 이하의 금액을 입력해 주세요.'
        : null;
  const canAdjust =
    role === 'admin' &&
    (request.status === ERemodelRequestStatus.SUBMITTED ||
      request.status === ERemodelRequestStatus.QUOTE_ADJUSTMENT);

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

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-3">
        <Pressable
          accessibilityLabel="견적 목록으로 돌아가기"
          accessibilityRole="button"
          className="mb-4 min-h-10 flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#123F3B" size={22} />
          <Text className="font-semibold text-brand-900">목록</Text>
        </Pressable>

        {role === 'admin' ? (
          <Text className="mb-2 text-sm font-semibold text-brand-700">{customerName} 고객</Text>
        ) : null}
        <Text className="text-2xl font-bold text-ink-900">
          {request.region} · {request.bathroomType}
        </Text>
        <Text className="mt-2 text-sm text-ink-600">
          {request.scope === 'full' ? '전체 리모델링' : '부분 리모델링'} ·{' '}
          {getRemodelBudgetLabel(request.budgetRange)} · {request.desiredSchedule}
        </Text>

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
              <ActivityIndicator color="#176D62" />
              <Text className="mt-3 text-sm text-ink-600">
                상담 내용을 불러오고 있어요.
              </Text>
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

        {role === 'admin' ? (
          <View className="mt-8 rounded-3xl bg-brand-900 p-5">
            <Text className="text-sm font-semibold text-brand-100">현재 견적 금액</Text>
            <Text className="mt-2 text-3xl font-bold text-white">
              {currentEstimateAmount.toLocaleString('ko-KR')}원
            </Text>
            {request.adjustedEstimateAmount !== undefined ? (
              <Text className="mt-2 text-xs text-brand-100">
                최초 선택 합계 {originalEstimateAmount.toLocaleString('ko-KR')}원
              </Text>
            ) : null}

            {canAdjust ? (
              <View className="mt-6 border-t border-brand-700 pt-5">
                <Text className="text-sm font-bold text-white">수정 견적</Text>
                <View className="mt-2 flex-row items-center rounded-xl bg-white px-4">
                  <TextInput
                    accessibilityLabel="수정 견적 금액"
                    className="min-h-12 flex-1 text-right text-lg font-bold text-ink-900"
                    keyboardType="number-pad"
                    placeholder="금액 입력"
                    placeholderTextColor="#84908D"
                    value={adjustedAmountInput}
                    onChangeText={(value) => {
                      setAdjustedAmountInput(formatAmountInput(value));
                      adjustMutation.reset();
                    }}
                  />
                  <Text className="ml-2 font-bold text-ink-600">원</Text>
                </View>
                {amountError ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-2 text-xs font-semibold text-red-200"
                  >
                    {amountError}
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
                    disabled: Boolean(amountError) || adjustMutation.isPending,
                  }}
                  className={`mt-4 min-h-12 items-center justify-center rounded-xl ${
                    amountError || adjustMutation.isPending
                      ? 'bg-stone-100 opacity-60'
                      : 'bg-brand-700 active:opacity-80'
                  }`}
                  disabled={Boolean(amountError) || adjustMutation.isPending}
                  onPress={() => void handleAdjustQuote()}
                >
                  {adjustMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className={`font-bold ${amountError ? 'text-ink-600' : 'text-white'}`}>
                      견적 조정
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text className="mt-4 text-sm leading-5 text-brand-100">
                현재 단계에서는 견적 금액을 조정할 수 없습니다.
              </Text>
            )}
          </View>
        ) : null}

        {role === 'customer' &&
        request.status === ERemodelRequestStatus.QUOTE_ADJUSTMENT &&
        request.adjustedEstimateAmount !== undefined ? (
          <View className="mt-8 rounded-3xl border border-brand-100 bg-white p-5">
            <Text className="text-sm font-semibold text-brand-700">관리자 조정 견적</Text>
            <Text className="mt-2 text-3xl font-bold text-brand-900">
              {request.adjustedEstimateAmount.toLocaleString('ko-KR')}원
            </Text>
            {request.adjustmentConfirmedAt ? (
              <View className="mt-4 flex-row items-center rounded-xl bg-brand-100 px-4 py-3">
                <Ionicons name="checkmark-circle" color="#176D62" size={20} />
                <Text className="ml-2 font-bold text-brand-900">확정한 견적입니다.</Text>
              </View>
            ) : (
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
            )}
          </View>
        ) : null}

        {role === 'customer' ? (
          <View className="mt-5 rounded-2xl border border-stone-100 bg-white p-3">
            <TextInput
              className="min-h-20 px-2 text-base text-ink-900"
              editable={!postMessageMutation.isPending}
              multiline
              placeholder="변경하고 싶은 조건이나 질문을 남겨주세요."
              placeholderTextColor="#84908D"
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
                <ActivityIndicator color="#62706D" />
              ) : (
                <Text className="font-bold text-white">코멘트 보내기</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
