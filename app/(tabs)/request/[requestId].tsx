import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/features/auth';
import { EQuoteStatus, useQuoteStore } from '@/entities/quote';
import {
  ERemodelRequestStatus,
  getRemodelBudgetLabel,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import {
  EConsultationMessageType,
  useRequestConsultationStore,
} from '@/features/request-consultation';
import { useCustomerRemodelRequests } from '@/features/view-remodel-requests';

export default function RequestDetailScreen(): React.JSX.Element {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { user } = useAuthSession();
  const requestsQuery = useCustomerRemodelRequests(user?.id ?? '');
  const localRequest = useRemodelRequestStore((state) =>
    state.requests.find((item) => item.id === requestId && item.customerId === user?.id),
  );
  const request = localRequest ?? requestsQuery.data?.find((item) => item.id === requestId);
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);
  const allQuotes = useQuoteStore((state) => state.quotes);
  const confirmQuote = useQuoteStore((state) => state.confirmQuote);
  const allMessages = useRequestConsultationStore((state) => state.messages);
  const addMessage = useRequestConsultationStore((state) => state.addMessage);
  const [message, setMessage] = useState('');
  const quotes = useMemo(
    () => allQuotes.filter((item) => item.requestId === requestId),
    [allQuotes, requestId],
  );
  const messages = useMemo(
    () => allMessages.filter((item) => item.requestId === requestId),
    [allMessages, requestId],
  );
  const latestQuote = useMemo(
    () => [...quotes].sort((first, second) => second.version - first.version)[0],
    [quotes],
  );

  if (requestsQuery.isPending && !request) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <ActivityIndicator color="#176D62" size="large" />
        <Text className="mt-4 text-sm font-semibold text-ink-600">
          견적 요청을 불러오고 있어요.
        </Text>
      </SafeAreaView>
    );
  }

  if (requestsQuery.isError && !request) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <Text accessibilityRole="alert" className="text-lg font-bold text-ink-900">
          견적 요청을 불러오지 못했어요.
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-ink-600">
          네트워크 연결을 확인한 뒤 다시 시도해 주세요.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5"
          onPress={() => void requestsQuery.refetch()}
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
        <Pressable className="mt-4 rounded-xl bg-brand-900 px-4 py-3" onPress={() => router.back()}>
          <Text className="font-bold text-white">목록으로 돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sendMessage = (): void => {
    const trimmed = message.trim();
    if (!trimmed) return;
    addMessage({
      requestId: request.id,
      authorId: user?.id ?? request.customerId,
      messageType: EConsultationMessageType.REVISION_REQUEST,
      body: trimmed,
    });
    updateRequest(request.id, { status: ERemodelRequestStatus.IN_CONSULTATION });
    setMessage('');
  };

  const handleConfirm = (): void => {
    if (!latestQuote) return;
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

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-3">
        <Pressable className="mb-4 min-h-10 flex-row items-center" onPress={() => router.back()}>
          <Ionicons name="chevron-back" color="#123F3B" size={22} />
          <Text className="font-semibold text-brand-900">목록</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-ink-900">
          {request.region} · {request.bathroomType}
        </Text>
        <Text className="mt-2 text-sm text-ink-600">
          {request.scope === 'full' ? '전체 리모델링' : '부분 리모델링'} ·{' '}
          {getRemodelBudgetLabel(request.budgetRange)} · {request.desiredSchedule}
        </Text>

        <View className="mt-6 rounded-3xl bg-white p-5">
          <Text className="text-sm font-semibold text-brand-700">선택 리포트</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">{request.notes}</Text>
          <View className="mt-4 gap-2">
            {request.selections.map((selection) => (
              <Text key={selection.id} className="text-sm text-ink-900">
                • {selection.category}: {selection.itemName ?? '선택 안 함'}
              </Text>
            ))}
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
                      {quote.total.toLocaleString()}원
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-ink-600">
                    {quote.lineItems.map((line) => line.name).join(' · ')}
                  </Text>
                  <Text className="mt-2 text-xs text-ink-600">
                    유효기간 {quote.validUntil} ·{' '}
                    {quote.taxIncluded ? '부가세 포함' : '부가세 별도'}
                  </Text>
                  {quote.status !== EQuoteStatus.CONFIRMED && (
                    <Pressable
                      className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900"
                      onPress={handleConfirm}
                    >
                      <Text className="font-bold text-white">이 견적 최종 컨펌</Text>
                    </Pressable>
                  )}
                </View>
              ))}
          </View>
        )}

        <Text className="mt-8 text-lg font-bold text-ink-900">상담 타임라인</Text>
        <View className="mt-3 gap-3">
          {messages.map((item) => (
            <View
              key={item.id}
              className={`rounded-2xl p-4 ${item.authorId === user?.id ? 'bg-brand-100' : 'bg-white'}`}
            >
              <Text className="text-xs font-semibold text-brand-700">
                {item.authorId === 'partner-1'
                  ? '그린바스 성동점'
                  : item.authorId === 'admin-1'
                    ? '바스페이스 운영팀'
                    : '고객'}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-ink-900">{item.body}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-2xl border border-stone-100 bg-white p-3">
          <TextInput
            className="min-h-20 px-2 text-base text-ink-900"
            multiline
            placeholder="변경하고 싶은 조건이나 질문을 남겨주세요."
            placeholderTextColor="#84908D"
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />
          <Pressable
            className="mt-2 min-h-11 items-center justify-center rounded-xl bg-brand-900"
            onPress={sendMessage}
          >
            <Text className="font-bold text-white">코멘트 보내기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
