import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePartner, usePartnerDocumentUrl } from '@/features/partner-management';

export default function AdminPartnerDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ partnerId?: string | string[] }>();
  const partnerId = Array.isArray(params.partnerId)
    ? params.partnerId[0]
    : (params.partnerId ?? '');
  const partnerQuery = usePartner(partnerId);
  const documentQuery = usePartnerDocumentUrl(
    partnerQuery.data?.businessRegistrationImagePath ?? null,
  );

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          accessibilityLabel="업체 목록으로 돌아가기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#1D2725" size={24} />
        </Pressable>
        <Text className="ml-1 text-xl font-bold text-ink-900">업체 상세</Text>
      </View>

      {partnerQuery.isLoading ? (
        <DetailLoading />
      ) : partnerQuery.isError || !partnerQuery.data ? (
        <DetailError
          onBack={() => router.replace('/(admin)/partners')}
          onRetry={() => void partnerQuery.refetch()}
        />
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10 pt-3">
          <View className="rounded-3xl bg-brand-900 p-6">
            <View className="self-start rounded-full bg-brand-100 px-3 py-1">
              <Text className="text-xs font-bold text-brand-900">승인 완료</Text>
            </View>
            <Text className="mt-4 text-2xl font-bold text-white">
              {partnerQuery.data.companyName}
            </Text>
            <Text className="mt-2 text-sm text-brand-100">
              등록일 {dayjs(partnerQuery.data.createdAt).format('YYYY년 M월 D일')}
            </Text>
          </View>

          <DetailSection title="업체 정보">
            <DetailRow label="업체명" value={partnerQuery.data.companyName} />
            <DetailRow label="사업자등록번호" value={partnerQuery.data.businessNumber} />
          </DetailSection>

          <DetailSection title="담당자 정보">
            <DetailRow
              label="업체 대표 이메일 (로그인용)"
              value={partnerQuery.data.representativeEmail ?? '연결된 로그인 계정이 없어요.'}
            />
            <DetailRow label="담당자 이름" value={partnerQuery.data.contactName} />
            <DetailRow label="담당자 연락처" value={partnerQuery.data.contactPhone} />
          </DetailSection>

          <DetailSection title="업체 사업자등록증">
            {!partnerQuery.data.businessRegistrationImagePath ? (
              <EmptyDetailValue icon="image-outline" text="첨부된 사업자등록증이 없어요." />
            ) : documentQuery.isLoading ? (
              <View className="min-h-48 items-center justify-center">
                <ActivityIndicator color="#176D62" />
                <Text className="mt-3 text-sm text-ink-600">이미지를 불러오고 있어요.</Text>
              </View>
            ) : documentQuery.data ? (
              <Image
                accessibilityLabel={`${partnerQuery.data.companyName} 사업자등록증`}
                className="w-full rounded-2xl bg-sand-50"
                contentFit="contain"
                source={{ uri: documentQuery.data }}
                style={{ height: 280 }}
              />
            ) : (
              <EmptyDetailValue
                icon="alert-circle-outline"
                text="사업자등록증 이미지를 불러오지 못했어요."
              />
            )}
          </DetailSection>

          <DetailSection title="비고">
            <Text className="text-sm leading-6 text-ink-900">
              {partnerQuery.data.note || '입력된 비고가 없어요.'}
            </Text>
          </DetailSection>

          <View className="mt-5 rounded-2xl bg-stone-100 p-4">
            <Text className="text-center text-xs leading-5 text-ink-600">
              업체 정보 수정 기능은 아직 준비 중입니다.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DetailLoading(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color="#176D62" size="large" />
      <Text className="mt-4 text-sm font-semibold text-ink-600">업체 정보를 불러오고 있어요.</Text>
    </View>
  );
}

function DetailError({
  onBack,
  onRetry,
}: {
  onBack: () => void;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <View
        accessibilityRole="alert"
        className="w-full items-center rounded-3xl border border-stone-100 bg-white p-6"
      >
        <Ionicons name="business-outline" color="#62706D" size={36} />
        <Text className="mt-4 text-lg font-bold text-ink-900">업체 정보를 찾을 수 없어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
          업체가 삭제되었거나 네트워크 연결이 원활하지 않을 수 있어요.
        </Text>
        <View className="mt-5 w-full flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            className="min-h-11 flex-1 items-center justify-center rounded-xl bg-stone-100"
            onPress={onBack}
          >
            <Text className="font-bold text-ink-600">목록으로</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-900"
            onPress={onRetry}
          >
            <Text className="font-bold text-white">다시 시도</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <View className="mt-5 rounded-2xl border border-stone-100 bg-white p-5">
      <Text className="mb-4 text-base font-bold text-ink-900">{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="mb-4 last:mb-0">
      <Text className="text-xs font-semibold text-ink-600">{label}</Text>
      <Text className="mt-1.5 text-base text-ink-900">{value}</Text>
    </View>
  );
}

function EmptyDetailValue({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}): React.JSX.Element {
  return (
    <View className="min-h-32 items-center justify-center rounded-2xl bg-sand-50 px-4">
      <Ionicons name={icon} color="#62706D" size={28} />
      <Text className="mt-2 text-center text-sm text-ink-600">{text}</Text>
    </View>
  );
}
