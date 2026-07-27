import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { IPartner } from '@/entities/partner';
import { usePartners } from '@/features/partner-management';

export default function AdminPartnerListScreen(): React.JSX.Element {
  const partnersQuery = usePartners();
  const partners = partnersQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          accessibilityLabel="관리자 홈으로 돌아가기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#1D2725" size={24} />
        </Pressable>
        <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">업체 관리</Text>
      </View>

      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Text className="text-xs font-semibold text-ink-600">총 {partners.length}업체</Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-row items-center rounded-xl bg-brand-900 px-4 active:opacity-80"
          onPress={() => router.push('/(admin)/partners/new')}
        >
          <Ionicons name="add" color="#FFFFFF" size={18} />
          <Text className="ml-1.5 text-sm font-bold text-white">업체 추가</Text>
        </Pressable>
      </View>

      {partnersQuery.isLoading ? (
        <PartnerListLoading />
      ) : partnersQuery.isError ? (
        <PartnerListError onRetry={() => void partnersQuery.refetch()} />
      ) : (
        <FlatList
          contentContainerClassName={partners.length === 0 ? 'flex-grow px-5 pb-8' : 'px-5 pb-8'}
          data={partners}
          keyExtractor={(partner) => partner.id}
          refreshControl={
            <RefreshControl
              refreshing={partnersQuery.isRefetching}
              tintColor="#176D62"
              onRefresh={() => void partnersQuery.refetch()}
            />
          }
          renderItem={({ item }) => <PartnerListItem partner={item} />}
          ListEmptyComponent={<PartnerListEmpty />}
        />
      )}
    </SafeAreaView>
  );
}

function PartnerListLoading(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator color="#176D62" size="large" />
      <Text className="mt-4 text-sm font-semibold text-ink-600">업체 목록을 불러오고 있어요.</Text>
    </View>
  );
}

function PartnerListError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <View
        accessibilityRole="alert"
        className="w-full items-center rounded-3xl border border-stone-100 bg-white p-6"
      >
        <Ionicons name="cloud-offline-outline" color="#B7433D" size={34} />
        <Text className="mt-4 text-lg font-bold text-ink-900">업체 목록을 불러오지 못했어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
          네트워크 상태를 확인한 뒤 다시 시도해 주세요.
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

function PartnerListEmpty(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="w-full items-center rounded-3xl border border-stone-100 bg-white p-7">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
          <Ionicons name="business-outline" color="#176D62" size={28} />
        </View>
        <Text className="mt-4 text-lg font-bold text-ink-900">등록된 업체가 없어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
          오른쪽 위 업체 추가 버튼으로 첫 업체를 등록해 주세요.
        </Text>
      </View>
    </View>
  );
}

function PartnerListItem({ partner }: { partner: IPartner }): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint="업체 상세 화면으로 이동합니다."
      accessibilityRole="button"
      className="mb-3 rounded-2xl border border-stone-100 bg-white p-4 active:bg-brand-100"
      onPress={() =>
        router.push({
          pathname: '/(admin)/partners/[partnerId]',
          params: { partnerId: partner.id },
        })
      }
    >
      <View className="flex-row items-start">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
          <Ionicons name="business" color="#176D62" size={22} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-ink-900">{partner.companyName}</Text>
          <Text className="mt-1 text-xs text-ink-600">사업자등록번호 {partner.businessNumber}</Text>
        </View>
        <Ionicons name="chevron-forward" color="#84908D" size={20} />
      </View>
      <View className="mt-4 border-t border-stone-100 pt-3">
        <Text className="text-sm font-semibold text-ink-900">{partner.contactName}</Text>
        {partner.representativeEmail ? (
          <Text className="mt-1 text-sm text-ink-600">{partner.representativeEmail}</Text>
        ) : null}
        <Text className="mt-1 text-sm text-ink-600">{partner.contactPhone}</Text>
      </View>
    </Pressable>
  );
}
