import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDemoSessionStore } from '@/features/demo-session';
import { useCatalogItemStore } from '@/entities/catalog-item';
import { usePartnerStore } from '@/entities/partner';
import { useQuoteStore } from '@/entities/quote';
import {
  ERemodelRequestStatus,
  ERemodelScope,
  ESelectionDecision,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import {
  EConsultationMessageType,
  useRequestConsultationStore,
} from '@/features/request-consultation';

export default function ActionScreen(): React.JSX.Element {
  const role = useDemoSessionStore((state) => state.user?.role ?? 'customer');

  if (role === 'partner') return <PartnerQuoteScreen />;
  if (role === 'admin') return <AdminCatalogScreen />;
  return <CustomerRequestScreen />;
}

function CustomerRequestScreen(): React.JSX.Element {
  const createRequest = useRemodelRequestStore((state) => state.createRequest);
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);
  const [region, setRegion] = useState('서울 성동구');
  const [budgetRange, setBudgetRange] = useState('300~500만원');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [toiletDecision, setToiletDecision] = useState<ESelectionDecision>(
    ESelectionDecision.CONSULTATION_REQUIRED,
  );
  const [tileDecision, setTileDecision] = useState<ESelectionDecision>(ESelectionDecision.SELECTED);

  const selectPhoto = async (): Promise<void> => {
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
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotos((current) => [...current, ...result.assets].slice(0, 5));
    }
  };

  const submitRequest = (): void => {
    if (photos.length === 0) {
      Alert.alert(
        '욕실 사진을 등록해주세요',
        '전경 또는 주요 부위를 최소 한 장 등록해야 요청을 보낼 수 있어요.',
      );
      return;
    }

    const request = createRequest({
      customerId: 'customer-1',
      region,
      housingType: '아파트',
      bathroomType: '공용 욕실',
      estimatedSize: '약 3㎡',
      hasBathtub: false,
      requiresDemolition: true,
      budgetRange,
      desiredSchedule: '2개월 이내',
      scope: ERemodelScope.FULL,
      priorities: ['디자인', '청소 편의'],
      notes: notes || '상담 후 세부 조건을 결정하고 싶습니다.',
      photos: photos.map((photo, index) => ({
        id: `local-photo-${index}`,
        localUri: photo.uri,
        category: '욕실 사진',
        sortOrder: index,
        createdAt: new Date().toISOString(),
      })),
      selections: [
        {
          id: 'new-toilet',
          category: '변기',
          itemName:
            toiletDecision === ESelectionDecision.SELECTED
              ? '스마트 일체형 양변기'
              : '상담 후 결정',
          selectedOptionIds: [],
          selectedOptionNames: [],
          decisionStatus: toiletDecision,
        },
        {
          id: 'new-tile',
          category: '벽·바닥',
          itemName: tileDecision === ESelectionDecision.SELECTED ? '웜 스톤 패널' : '상담 후 결정',
          selectedOptionIds: [],
          selectedOptionNames: [],
          basePriceSnapshot: tileDecision === ESelectionDecision.SELECTED ? 420000 : undefined,
          decisionStatus: tileDecision,
        },
      ],
    });
    updateRequest(request.id, {
      status: ERemodelRequestStatus.SUBMITTED,
      submittedAt: new Date().toISOString(),
    });
    Alert.alert(
      '견적 요청을 보냈어요',
      '관리자가 참여 업체를 매칭한 뒤 앱에서 회신을 알려드릴게요.',
    );
    setNotes('');
    setPhotos([]);
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">새 욕실 견적 요청</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          필수 조건과 사진을 남기면, 상담에 필요한 내용을 한 번에 전달할 수 있어요.
        </Text>

        <Section title="기본 조건">
          <Field label="공사 지역" value={region} onChangeText={setRegion} />
          <ChoiceGroup
            label="희망 예산"
            value={budgetRange}
            options={['200~300만원', '300~500만원', '500만원 이상']}
            onChange={setBudgetRange}
          />
        </Section>

        <Section title="욕실 사진 · 필수">
          <Text className="text-sm leading-5 text-ink-600">
            욕실 전경과 교체가 필요한 부위를 최대 5장까지 올려주세요.
          </Text>
          <Pressable
            accessibilityLabel="욕실 사진 추가"
            className="mt-4 min-h-28 items-center justify-center rounded-2xl border border-dashed border-brand-700 bg-brand-100 active:opacity-80"
            onPress={selectPhoto}
          >
            <Ionicons name="images-outline" color="#176D62" size={26} />
            <Text className="mt-2 font-bold text-brand-900">사진 선택하기</Text>
            <Text className="mt-1 text-xs text-ink-600">{photos.length}/5장 선택됨</Text>
          </Pressable>
        </Section>

        <Section title="중요 항목 선택">
          <DecisionGroup
            label="변기"
            value={toiletDecision}
            onChange={setToiletDecision}
            selectedLabel="스마트 일체형 양변기"
          />
          <DecisionGroup
            label="벽·바닥"
            value={tileDecision}
            onChange={setTileDecision}
            selectedLabel="웜 스톤 패널"
          />
        </Section>

        <Section title="추가 요청">
          <TextInput
            accessibilityLabel="추가 요청 사항"
            className="mt-2 min-h-28 rounded-2xl border border-stone-100 bg-white p-4 text-base text-ink-900"
            multiline
            placeholder="꼭 반영할 조건, 걱정되는 부분, 원하는 분위기를 적어주세요."
            placeholderTextColor="#84908D"
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </Section>

        <Pressable
          accessibilityLabel="견적 요청 제출"
          className="mt-2 min-h-14 items-center justify-center rounded-2xl bg-brand-900 active:opacity-80"
          onPress={submitRequest}
        >
          <Text className="text-base font-bold text-white">견적 요청 보내기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PartnerQuoteScreen(): React.JSX.Element {
  const requests = useRemodelRequestStore((state) => state.requests);
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);
  const assignments = usePartnerStore((state) => state.requestPartners);
  const createQuote = useQuoteStore((state) => state.createQuote);
  const sendQuote = useQuoteStore((state) => state.sendQuote);
  const addMessage = useRequestConsultationStore((state) => state.addMessage);
  const assignedRequest = requests.find((request) =>
    assignments.some(
      (assignment) => assignment.requestId === request.id && assignment.partnerId === 'partner-1',
    ),
  );

  const createSampleQuote = (): void => {
    if (!assignedRequest) return;
    const quote = createQuote({
      requestId: assignedRequest.id,
      partnerId: 'partner-1',
      lineItems: [
        {
          id: 'line-1',
          category: '기본 시공',
          name: '욕실 철거 및 방수',
          quantity: 1,
          unitPrice: 1800000,
          amount: 1800000,
        },
        {
          id: 'line-2',
          category: '벽·바닥',
          name: '웜 스톤 패널 시공',
          quantity: 1,
          unitPrice: 980000,
          amount: 980000,
        },
        {
          id: 'line-3',
          category: '도기',
          name: '스마트 일체형 양변기',
          quantity: 1,
          unitPrice: 680000,
          amount: 680000,
        },
      ],
      discount: 0,
      taxIncluded: false,
      validUntil: '2026-08-15',
      note: '현장 실측 후 자재 수량과 세부 공법이 조정될 수 있습니다.',
    });
    sendQuote(quote.id, false);
    updateRequest(assignedRequest.id, { status: ERemodelRequestStatus.IN_CONSULTATION });
    addMessage({
      requestId: assignedRequest.id,
      authorId: 'partner-1',
      messageType: EConsultationMessageType.QUOTE_SENT,
      quoteId: quote.id,
      body: `견적 v${quote.version}을 보내드렸습니다. 궁금한 점이나 변경 희망 사항을 남겨주세요.`,
    });
    Alert.alert('견적을 발송했어요', '고객이 앱에서 견적과 코멘트를 확인할 수 있습니다.');
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">견적 작성</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          고객의 선택 리포트를 기준으로 첫 견적을 작성해보세요.
        </Text>
        {!assignedRequest ? (
          <EmptyState text="현재 배정된 상담 요청이 없어요." />
        ) : (
          <View className="mt-6 rounded-3xl bg-white p-5">
            <Text className="text-sm font-semibold text-brand-700">매칭된 고객 요청</Text>
            <Text className="mt-2 text-xl font-bold text-ink-900">
              {assignedRequest.region} · {assignedRequest.bathroomType}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-ink-600">{assignedRequest.notes}</Text>
            <View className="mt-5 rounded-2xl bg-sand-50 p-4">
              <Text className="text-sm font-bold text-ink-900">견적 초안 예시</Text>
              <Text className="mt-2 text-sm text-ink-600">
                기본 시공 + 패널 + 양변기 · 공급가 346만원
              </Text>
              <Text className="mt-1 text-xs text-ink-600">부가세 별도, 현장 실측 후 조정 가능</Text>
            </View>
            <Pressable
              className="mt-5 min-h-14 items-center justify-center rounded-2xl bg-brand-900"
              onPress={createSampleQuote}
            >
              <Text className="font-bold text-white">견적 v1 발송하기</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminCatalogScreen(): React.JSX.Element {
  const items = useCatalogItemStore((state) => state.items);
  const updateBasePrice = useCatalogItemStore((state) => state.updateBasePrice);
  const requests = useRemodelRequestStore((state) => state.requests);
  const assignments = usePartnerStore((state) => state.requestPartners);
  const partners = usePartnerStore((state) => state.partners);
  const assignPartner = usePartnerStore((state) => state.assignPartner);
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);

  const matchFirstWaitingRequest = (): void => {
    const request = requests.find((item) => item.status === ERemodelRequestStatus.SUBMITTED);
    const partner = partners[0];
    if (!request || !partner) {
      Alert.alert(
        '매칭할 요청이 없어요',
        '새 요청이 접수되면 여기서 참여 업체를 배정할 수 있습니다.',
      );
      return;
    }
    const isAlreadyAssigned = assignments.some(
      (assignment) => assignment.requestId === request.id && assignment.partnerId === partner.id,
    );
    if (!isAlreadyAssigned) assignPartner(request.id, partner.id);
    updateRequest(request.id, { status: ERemodelRequestStatus.MATCHED });
    Alert.alert('업체를 매칭했어요', `${partner.companyName}에 요청을 전달했습니다.`);
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">카탈로그 관리</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          제품과 기본 단가는 관리자가 언제든 조정할 수 있어요.
        </Text>
        <Pressable
          className="mt-5 min-h-12 items-center justify-center rounded-xl border border-brand-700 bg-brand-100"
          onPress={matchFirstWaitingRequest}
        >
          <Text className="font-bold text-brand-900">대기 요청에 업체 매칭하기</Text>
        </Pressable>
        <View className="mt-6 gap-3">
          {items.map((item) => (
            <View key={item.id} className="rounded-2xl bg-white p-5">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-brand-700">{item.brand}</Text>
                  <Text className="mt-1 text-base font-bold text-ink-900">{item.name}</Text>
                  <Text className="mt-1 text-sm text-ink-600">{item.description}</Text>
                </View>
                <Text className="text-sm font-bold text-ink-900">
                  {item.basePrice.toLocaleString()}원
                </Text>
              </View>
              <Pressable
                className="mt-4 min-h-11 items-center justify-center rounded-xl bg-sand-50"
                onPress={() => updateBasePrice(item.id, item.basePrice + 100000, 'admin-1')}
              >
                <Text className="text-sm font-bold text-brand-900">기본 단가 +10만원</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="mt-7">
      <Text className="text-lg font-bold text-ink-900">{title}</Text>
      <View className="mt-3 gap-4">{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}): React.JSX.Element {
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-ink-900">{label}</Text>
      <TextInput
        className="min-h-12 rounded-xl border border-stone-100 bg-white px-4 text-base text-ink-900"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <View>
      <Text className="text-sm font-semibold text-ink-900">{label}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={option}
            className={`min-h-10 justify-center rounded-full px-4 ${value === option ? 'bg-brand-900' : 'bg-white border border-stone-100'}`}
            onPress={() => onChange(option)}
          >
            <Text
              className={`text-sm font-semibold ${value === option ? 'text-white' : 'text-ink-600'}`}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DecisionGroup({
  label,
  value,
  onChange,
  selectedLabel,
}: {
  label: string;
  value: ESelectionDecision;
  onChange: (value: ESelectionDecision) => void;
  selectedLabel: string;
}): React.JSX.Element {
  return (
    <View>
      <Text className="text-sm font-semibold text-ink-900">{label}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        <DecisionChip
          label={selectedLabel}
          selected={value === ESelectionDecision.SELECTED}
          onPress={() => onChange(ESelectionDecision.SELECTED)}
        />
        <DecisionChip
          label="상담 후 결정"
          selected={value === ESelectionDecision.CONSULTATION_REQUIRED}
          onPress={() => onChange(ESelectionDecision.CONSULTATION_REQUIRED)}
        />
      </View>
    </View>
  );
}

function DecisionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      className={`min-h-10 justify-center rounded-full px-4 ${selected ? 'bg-brand-900' : 'border border-stone-100 bg-white'}`}
      onPress={onPress}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }): React.JSX.Element {
  return (
    <View className="mt-8 rounded-2xl bg-white p-6">
      <Text className="text-center text-sm text-ink-600">{text}</Text>
    </View>
  );
}
