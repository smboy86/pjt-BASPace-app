import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDemoSessionStore } from '@/features/demo-session';
import { usePartnerStore } from '@/entities/partner';
import { useRemodelRequestStore } from '@/entities/remodel-request';

type TAssignmentStep = 'request' | 'partner' | 'staff' | 'review' | 'complete';
type TAssignmentFlowStep = Exclude<TAssignmentStep, 'complete'>;

const STEP_ORDER: TAssignmentFlowStep[] = ['request', 'partner', 'staff', 'review'];
const STEP_LABELS: Record<TAssignmentFlowStep, string> = {
  request: '요청',
  partner: '업체',
  staff: '담당자',
  review: '검토',
};

export default function AssignmentScreen(): React.JSX.Element {
  const role = useDemoSessionStore((state) => state.user?.role);
  const requests = useRemodelRequestStore((state) => state.requests);
  const partners = usePartnerStore((state) => state.partners);
  const [step, setStep] = useState<TAssignmentStep>('request');
  const [requestId, setRequestId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [staffId, setStaffId] = useState('');

  const selectedRequest = requests.find((item) => item.id === requestId);
  const selectedPartner = partners.find((item) => item.id === partnerId);
  const staffOptions = useMemo(
    () =>
      selectedPartner
        ? [
            {
              id: `${selectedPartner.id}-staff-primary`,
              name: selectedPartner.contactName,
              position: '현장 견적 담당',
            },
          ]
        : [],
    [selectedPartner],
  );
  const selectedStaff = staffOptions.find((item) => item.id === staffId);

  if (role !== 'admin') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-stone-100">
          <Ionicons name="lock-closed-outline" color="#62706D" size={28} />
        </View>
        <Text className="mt-5 text-xl font-bold text-ink-900">관리자 전용 화면이에요.</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-ink-600">
          담당자 배정은 관리자 역할에서만 진행할 수 있습니다.
        </Text>
        <Pressable className="mt-6 rounded-xl bg-brand-900 px-5 py-3" onPress={() => router.back()}>
          <Text className="font-bold text-white">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentIndex = step === 'complete' ? STEP_ORDER.length : STEP_ORDER.indexOf(step);
  const canContinue =
    (step === 'request' && Boolean(requestId)) ||
    (step === 'partner' && Boolean(partnerId)) ||
    (step === 'staff' && Boolean(staffId));

  const next = (): void => {
    if (step === 'request') setStep('partner');
    if (step === 'partner') setStep('staff');
    if (step === 'staff') setStep('review');
    if (step === 'review') setStep('complete');
  };

  const back = (): void => {
    if (step === 'request' || step === 'complete') {
      router.back();
      return;
    }
    if (step === 'partner') setStep('request');
    if (step === 'staff') setStep('partner');
    if (step === 'review') setStep('staff');
  };

  if (step === 'complete') {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 px-6">
        <View className="flex-1 justify-center">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-100">
            <Ionicons name="checkmark-circle-outline" color="#176D62" size={42} />
          </View>
          <Text className="mt-7 text-3xl font-bold leading-10 text-ink-900">
            담당자 배정 플로우를{`\n`}완료했어요.
          </Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            {selectedPartner?.companyName}의 {selectedStaff?.name} 담당자가 선택되었습니다.
          </Text>
          <View className="mt-6 rounded-2xl bg-brand-100 p-4">
            <Text className="text-sm font-bold text-brand-900">프로토타입 안내</Text>
            <Text className="mt-1 text-sm leading-5 text-ink-600">
              실제 배정 데이터는 저장하지 않았습니다. Supabase 연결 시 이 완료 동작에 배정
              mutation과 알림 처리를 연결합니다.
            </Text>
          </View>
        </View>
        <Pressable
          className="mb-6 min-h-13 items-center justify-center rounded-xl bg-brand-900"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text className="text-base font-bold text-white">운영 현황으로</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          accessibilityLabel="이전 단계"
          className="h-11 w-11 items-center justify-center rounded-full bg-white"
          onPress={back}
        >
          <Ionicons name="chevron-back" color="#123F3B" size={22} />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-brand-700">관리자 운영</Text>
          <Text className="text-xl font-bold text-ink-900">업체 담당자 배정</Text>
        </View>
      </View>

      <View className="flex-row px-5 py-4">
        {STEP_ORDER.map((item, index) => {
          const active = index <= currentIndex;
          return (
            <View key={item} className="flex-1 items-center">
              <View
                className={`h-2 w-full rounded-full ${active ? 'bg-brand-700' : 'bg-stone-100'}`}
              />
              <Text
                className={`mt-2 text-xs font-semibold ${active ? 'text-brand-900' : 'text-ink-600'}`}
              >
                {STEP_LABELS[item]}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-32 pt-4">
        {step === 'request' && (
          <StepSection
            title="배정할 견적 요청을 선택하세요."
            description="접수된 고객 요청의 지역과 공사 범위를 먼저 확인합니다."
          >
            {requests.map((request) => (
              <ChoiceCard
                key={request.id}
                selected={request.id === requestId}
                title={`${request.region} · ${request.bathroomType}`}
                description={`${request.scope === 'full' ? '전체 리모델링' : '부분 리모델링'} · ${request.budgetRange}`}
                meta={`희망 일정 ${request.desiredSchedule}`}
                onPress={() => setRequestId(request.id)}
              />
            ))}
          </StepSection>
        )}

        {step === 'partner' && (
          <StepSection
            title="진행할 업체를 선택하세요."
            description="승인된 업체 중 서비스 지역과 공사 유형이 맞는 업체를 선택합니다."
          >
            {partners.map((partner) => (
              <ChoiceCard
                key={partner.id}
                selected={partner.id === partnerId}
                title={partner.companyName}
                description={partner.serviceRegions.join(' · ')}
                meta={partner.serviceTypes.join(' · ')}
                onPress={() => {
                  setPartnerId(partner.id);
                  setStaffId('');
                }}
              />
            ))}
          </StepSection>
        )}

        {step === 'staff' && (
          <StepSection
            title="담당자를 지정하세요."
            description="선택한 업체에 소속된 활성 담당자만 표시됩니다."
          >
            <View className="mb-4 rounded-2xl bg-brand-100 p-4">
              <Text className="text-xs font-semibold text-brand-700">선택 업체</Text>
              <Text className="mt-1 text-base font-bold text-brand-900">
                {selectedPartner?.companyName}
              </Text>
            </View>
            {staffOptions.map((staff) => (
              <ChoiceCard
                key={staff.id}
                selected={staff.id === staffId}
                title={staff.name}
                description={staff.position}
                meta="이 업체에만 소속된 담당자"
                onPress={() => setStaffId(staff.id)}
              />
            ))}
          </StepSection>
        )}

        {step === 'review' && (
          <StepSection
            title="배정 내용을 확인하세요."
            description="데이터 연결 후에는 이 단계에서 업체와 담당자에게 알림이 전송됩니다."
          >
            <View className="rounded-3xl border border-stone-100 bg-white p-5">
              <ReviewRow
                label="고객 요청"
                value={`${selectedRequest?.region} · ${selectedRequest?.bathroomType}`}
              />
              <ReviewRow label="배정 업체" value={selectedPartner?.companyName ?? '-'} />
              <ReviewRow
                label="담당자"
                value={`${selectedStaff?.name ?? '-'} · ${selectedStaff?.position ?? '-'}`}
              />
            </View>
            <View className="mt-4 rounded-2xl bg-brand-100 p-4">
              <Text className="text-sm leading-5 text-ink-600">
                한 담당자는 하나의 업체에만 소속되며, 이 요청은 선택한 업체와 담당자에게 함께
                연결되는 정책을 적용합니다.
              </Text>
            </View>
          </StepSection>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-stone-100 bg-white px-5 pb-7 pt-4">
        <Pressable
          accessibilityRole="button"
          className={`min-h-13 items-center justify-center rounded-xl ${
            step === 'review' || canContinue ? 'bg-brand-900' : 'bg-stone-100'
          }`}
          disabled={step !== 'review' && !canContinue}
          onPress={next}
        >
          <Text
            className={`text-base font-bold ${
              step === 'review' || canContinue ? 'text-white' : 'text-ink-600'
            }`}
          >
            {step === 'review' ? '배정 플로우 완료' : '다음'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View>
      <Text className="text-2xl font-bold leading-8 text-ink-900">{title}</Text>
      <Text className="mt-2 text-sm leading-5 text-ink-600">{description}</Text>
      <View className="mt-6 gap-3">{children}</View>
    </View>
  );
}

function ChoiceCard({
  selected,
  title,
  description,
  meta,
  onPress,
}: {
  selected: boolean;
  title: string;
  description: string;
  meta: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-2xl border p-5 ${
        selected ? 'border-brand-700 bg-brand-100' : 'border-stone-100 bg-white'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-ink-900">{title}</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-600">{description}</Text>
          <Text className="mt-3 text-xs font-semibold text-brand-700">{meta}</Text>
        </View>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          color={selected ? '#176D62' : '#C8CEC9'}
          size={24}
        />
      </View>
    </Pressable>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="border-b border-stone-100 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <Text className="text-xs font-semibold text-ink-600">{label}</Text>
      <Text className="mt-1 text-base font-bold text-ink-900">{value}</Text>
    </View>
  );
}
