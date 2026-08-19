import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { ConstructionDatePickerModal } from '@/shared/ui';
import { getMinimumConstructionDate, sanitizeBathroomDimension } from '../model';

interface IConstructionRequirementsSectionProps {
  bathroomHeight: string;
  bathroomLength: string;
  bathroomWidth: string;
  dateError?: string;
  dimensionError?: string;
  desiredConstructionDate: string | null;
  onBathroomHeightChange: (value: string) => void;
  onBathroomLengthChange: (value: string) => void;
  onBathroomWidthChange: (value: string) => void;
  onDateChange: (date: string) => void;
  onMeasurementUnavailable: () => void;
  onRequiresDemolitionChange: (requiresDemolition: boolean) => void;
  requiresDemolition: boolean | null;
  typeError?: string;
}

export function ConstructionRequirementsSection({
  bathroomHeight,
  bathroomLength,
  bathroomWidth,
  dateError,
  dimensionError,
  desiredConstructionDate,
  onBathroomHeightChange,
  onBathroomLengthChange,
  onBathroomWidthChange,
  onDateChange,
  onMeasurementUnavailable,
  onRequiresDemolitionChange,
  requiresDemolition,
  typeError,
}: IConstructionRequirementsSectionProps): React.JSX.Element {
  const minimumDate = getMinimumConstructionDate();
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const formattedDate = desiredConstructionDate
    ? dayjs(desiredConstructionDate).format('YYYY년 M월 D일')
    : '날짜를 선택해 주세요.';

  const openCalendar = (): void => {
    setIsCalendarVisible(true);
  };

  return (
    <View className="mt-7">
      <Text className="text-lg font-bold text-ink-900">공사 조건</Text>
      {(dimensionError || typeError || dateError) && (
        <Text accessibilityRole="alert" className="mt-1 text-sm font-semibold text-red-600">
          필수 공사 조건을 확인해 주세요.
        </Text>
      )}

      <View className="mt-3 gap-5 rounded-3xl border border-stone-100 bg-white p-4">
        <View>
          <Text className="text-sm font-semibold text-ink-900">욕실 크기</Text>
          <View className="mt-3 flex-row items-end gap-1.5">
            <BathroomDimensionInput
              error={Boolean(dimensionError)}
              label="가로"
              onChangeText={onBathroomWidthChange}
              value={bathroomWidth}
            />
            <Text className="mb-3 text-sm font-semibold text-ink-500">x</Text>
            <BathroomDimensionInput
              error={Boolean(dimensionError)}
              label="세로"
              onChangeText={onBathroomLengthChange}
              value={bathroomLength}
            />
            <Text className="mb-3 text-sm font-semibold text-ink-500">x</Text>
            <BathroomDimensionInput
              error={Boolean(dimensionError)}
              label="높이"
              onChangeText={onBathroomHeightChange}
              value={bathroomHeight}
            />
            <Pressable
              accessibilityLabel="욕실 크기 실측 불가"
              className="min-h-12 shrink-0 items-center justify-center rounded-xl border border-brand-700 bg-brand-100 px-2 active:opacity-80"
              onPress={onMeasurementUnavailable}
            >
              <Text className="text-xs font-bold text-brand-900">실측불가</Text>
            </Pressable>
          </View>
          {dimensionError && (
            <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-red-600">
              {dimensionError}
            </Text>
          )}
        </View>

        <View className="h-px bg-stone-100" />

        <View>
          <Text className="text-sm font-semibold text-ink-900">시공 타입</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-600">
            욕실 전체 공사 방식으로 한 가지를 선택해 주세요.
          </Text>
          <View className="mt-3 flex-row gap-3">
            <ConstructionTypeButton
              description="기존 마감재 철거 후 시공"
              error={Boolean(typeError)}
              isSelected={requiresDemolition === true}
              label="철거"
              onPress={() => onRequiresDemolitionChange(true)}
            />
            <ConstructionTypeButton
              description="기존 타일 위에 덧시공"
              error={Boolean(typeError)}
              isSelected={requiresDemolition === false}
              label="덧방"
              onPress={() => onRequiresDemolitionChange(false)}
            />
          </View>
          {typeError && (
            <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-red-600">
              {typeError}
            </Text>
          )}
        </View>

        <View className="h-px bg-stone-100" />

        <View>
          <Text className="text-sm font-semibold text-ink-900">공사 희망 날짜</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-600">
            내일부터 선택할 수 있으며 일정은 관리자와 협의 후 조정될 수 있어요.
          </Text>
          <Pressable
            accessibilityLabel={`공사 희망 날짜 ${formattedDate}`}
            className={`mt-3 min-h-12 flex-row items-center rounded-xl border px-4 active:opacity-80 ${
              dateError ? 'border-red-500 bg-red-50' : 'border-stone-100 bg-stone-50'
            }`}
            onPress={openCalendar}
          >
            <Ionicons color="#163A63" name="calendar-outline" size={21} />
            <Text
              className={`ml-3 flex-1 text-sm font-semibold ${
                desiredConstructionDate ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              {formattedDate}
            </Text>
            <Ionicons color="#667085" name="chevron-forward" size={19} />
          </Pressable>
          {dateError && (
            <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-red-600">
              {dateError}
            </Text>
          )}
        </View>
      </View>

      <ConstructionDatePickerModal
        minimumDate={minimumDate}
        onClose={() => setIsCalendarVisible(false)}
        onSelect={(date) => {
          onDateChange(date);
          setIsCalendarVisible(false);
        }}
        selectedDate={desiredConstructionDate}
        visible={isCalendarVisible}
      />
    </View>
  );
}

function BathroomDimensionInput({
  error,
  label,
  onChangeText,
  value,
}: {
  error: boolean;
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1 text-xs font-semibold text-ink-600">{label} (mm)</Text>
      <TextInput
        accessibilityLabel={`욕실 ${label} 밀리미터`}
        className={`min-h-12 rounded-xl border bg-stone-50 px-2 text-center text-sm font-semibold text-ink-900 ${
          error ? 'border-red-500' : 'border-stone-100'
        }`}
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(text) => onChangeText(sanitizeBathroomDimension(text))}
        placeholder="1200"
        placeholderTextColor="#667085"
        value={value}
      />
    </View>
  );
}

function ConstructionTypeButton({
  description,
  error,
  isSelected,
  label,
  onPress,
}: {
  description: string;
  error: boolean;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={`시공 타입 ${label}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      className={`min-h-24 flex-1 rounded-2xl border p-4 active:opacity-80 ${
        isSelected
          ? 'border-2 border-brand-700 bg-brand-100'
          : error
            ? 'border-red-500 bg-red-50'
            : 'border-stone-100 bg-stone-50'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <Text className={`font-bold ${isSelected ? 'text-brand-900' : 'text-ink-900'}`}>
          {label}
        </Text>
        <Ionicons
          color={isSelected ? '#163A63' : '#B8C4D4'}
          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
          size={22}
        />
      </View>
      <Text className="mt-2 text-xs leading-5 text-ink-600">{description}</Text>
    </Pressable>
  );
}
