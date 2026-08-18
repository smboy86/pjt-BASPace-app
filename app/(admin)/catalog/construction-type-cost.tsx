import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import {
  useDemolitionCostSetting,
  useUpdateDemolitionCostSetting,
} from '@/features/manage-construction-type-cost';

const MAX_AMOUNT_MANWON = 100_000_000;

export default function AdminConstructionTypeCostScreen(): React.JSX.Element {
  const settingQuery = useDemolitionCostSetting();
  const updateSetting = useUpdateDemolitionCostSetting();
  const [amountInput, setAmountInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!settingQuery.data) return;
    setAmountInput(String(settingQuery.data.amountManwon));
  }, [settingQuery.data]);

  if (settingQuery.isLoading) {
    return <CenteredState loading text="시공 타입 금액을 불러오고 있어요." />;
  }

  if (settingQuery.isError || !settingQuery.data) {
    return (
      <CenteredState
        text="시공 타입 금액을 불러오지 못했어요."
        onRetry={() => void settingQuery.refetch()}
      />
    );
  }

  const amountManwon = amountInput.length > 0 ? Number(amountInput) : null;
  const amountError =
    amountManwon === null
      ? '철거 추가 비용을 입력해 주세요.'
      : !Number.isInteger(amountManwon) || amountManwon < 0 || amountManwon > MAX_AMOUNT_MANWON
        ? '0 이상 100,000,000 이하의 만원 단위 정수를 입력해 주세요.'
        : null;
  const canSave =
    amountError === null &&
    amountManwon !== settingQuery.data.amountManwon &&
    !updateSetting.isPending;

  const handleSave = async (): Promise<void> => {
    if (!canSave || amountManwon === null) return;
    setSaveSuccess(false);

    try {
      await updateSetting.mutateAsync({ amountManwon });
      setSaveSuccess(true);
    } catch {
      // The mutation error is displayed while preserving the input value.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityLabel="견적 옵션 목록으로 돌아가기"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-100"
            disabled={updateSetting.isPending}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" color="#1D2725" size={24} />
          </Pressable>
          <Text className="ml-1 flex-1 text-xl font-bold text-ink-900">시공 타입 금액 설정</Text>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-8 pt-3" keyboardShouldPersistTaps="handled">
          <View className="rounded-3xl border border-brand-100 bg-white p-5">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-100">
              <Ionicons name="hammer-outline" color="#176D62" size={22} />
            </View>
            <Text className="mt-4 text-lg font-bold text-ink-900">철거 추가 비용</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              고객이 시공 타입으로 철거를 선택하면 요청 제출 시점의 금액을 견적에 스냅샷으로
              저장합니다. 이미 제출된 요청 금액은 변경되지 않습니다.
            </Text>
          </View>

          <View className="mt-5 rounded-3xl border border-stone-100 bg-white p-5">
            <Text className="text-sm font-bold text-ink-900">철거 추가 비용 *</Text>
            <View
              className={`mt-2 min-h-14 flex-row items-center rounded-xl border bg-white px-4 ${
                amountError ? 'border-red-400' : 'border-stone-100'
              }`}
            >
              <TextInput
                accessibilityLabel="철거 추가 비용 만원 단위"
                className="min-h-14 flex-1 text-right text-xl font-bold text-ink-900"
                editable={!updateSetting.isPending}
                keyboardType="number-pad"
                maxLength={9}
                value={amountInput}
                onChangeText={(value) => {
                  setAmountInput(value.replace(/\D/g, ''));
                  setSaveSuccess(false);
                  updateSetting.reset();
                }}
              />
              <Text className="ml-2 font-bold text-ink-600">만원</Text>
            </View>
            {amountError ? (
              <Text accessibilityRole="alert" className="mt-2 text-xs text-red-600">
                {amountError}
              </Text>
            ) : amountManwon !== null ? (
              <Text className="mt-2 text-xs text-ink-600">
                견적 표시 금액 {(amountManwon * 10_000).toLocaleString('ko-KR')}원
              </Text>
            ) : null}

            <View className="mt-5 rounded-2xl bg-stone-50 p-4">
              <Text className="text-xs font-semibold text-ink-600">설정 코드</Text>
              <Text className="mt-1 text-sm font-bold text-brand-700">DEMOLITION</Text>
              <Text className="mt-3 text-xs font-semibold text-ink-600">최종 변경</Text>
              <Text className="mt-1 text-sm text-ink-900">
                {dayjs(settingQuery.data.updatedAt).format('YYYY년 M월 D일 HH:mm')}
              </Text>
            </View>

            {saveSuccess ? (
              <Text
                accessibilityRole="alert"
                className="mt-4 text-sm font-semibold text-emerald-700"
              >
                철거 추가 비용을 저장했어요.
              </Text>
            ) : null}
            {updateSetting.isError ? (
              <Text accessibilityRole="alert" className="mt-4 text-sm font-semibold text-red-700">
                철거 추가 비용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View className="border-t border-stone-100 bg-white px-5 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: updateSetting.isPending, disabled: !canSave }}
            className={`min-h-12 items-center justify-center rounded-xl ${
              canSave ? 'bg-brand-900 active:opacity-80' : 'bg-stone-100'
            }`}
            disabled={!canSave}
            onPress={() => void handleSave()}
          >
            {updateSetting.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className={`font-bold ${canSave ? 'text-white' : 'text-ink-600'}`}>
                변경사항 저장
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CenteredState({
  loading = false,
  text,
  onRetry,
}: {
  loading?: boolean;
  text: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
      {loading ? <ActivityIndicator color="#176D62" size="large" /> : null}
      <Text className="mt-4 text-center text-sm font-semibold text-ink-600">{text}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5"
          onPress={onRetry}
        >
          <Text className="font-bold text-white">다시 시도</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
