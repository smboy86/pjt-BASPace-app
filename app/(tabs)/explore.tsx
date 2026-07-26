import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/features/auth';
import {
  ERemodelRequestStatus,
  ERemodelScope,
  ESelectionDecision,
  useRemodelRequestStore,
} from '@/entities/remodel-request';

export default function ActionScreen(): React.JSX.Element {
  return <CustomerRequestScreen />;
}

function CustomerRequestScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuthSession();
  const createRequest = useRemodelRequestStore((state) => state.createRequest);
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);
  const [region, setRegion] = useState('서울 성동구');
  const [budgetRange, setBudgetRange] = useState('300~500만원');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [toiletDecision, setToiletDecision] = useState<ESelectionDecision>(
    ESelectionDecision.CONSULTATION_REQUIRED,
  );
  const [tileDecision, setTileDecision] = useState<ESelectionDecision>(ESelectionDecision.SELECTED);

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

  const submitRequest = (): void => {
    if (!user) {
      Alert.alert('로그인이 필요해요', '다시 로그인한 뒤 요청을 등록해 주세요.');
      router.replace('/(auth)/login');
      return;
    }

    const request = createRequest({
      customerId: user.id,
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
    setNotes('');
    setPhotos([]);
    setIsConfirmationVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">새 욕실 견적 요청</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          조건과 사진을 남기면, 상담에 필요한 내용을 한 번에 전달할 수 있어요.
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
                    <Ionicons name="close" color="#FFFFFF" size={18} />
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
      <Modal
        animationType="fade"
        onRequestClose={() => undefined}
        transparent
        visible={isConfirmationVisible}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View accessibilityRole="alert" className="w-full max-w-md rounded-3xl bg-white p-6">
            <Text className="text-xl font-bold text-ink-900">견적이 접수 되었습니다.</Text>
            <Text className="mt-3 text-sm leading-6 text-ink-600">
              담당자가 배정되면 앱에서 견적과 상담 진행 상황을 확인할 수 있습니다.
            </Text>
            <Pressable
              accessibilityLabel="견적 접수 확인"
              className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-brand-900 active:opacity-80"
              onPress={() => {
                setIsConfirmationVisible(false);
                router.replace('/(tabs)');
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
