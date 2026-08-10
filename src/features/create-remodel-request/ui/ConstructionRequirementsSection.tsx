import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { type Dayjs } from 'dayjs';
import { CONSTRUCTION_DATE_FORMAT, getMinimumConstructionDate } from '../model';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

interface ICalendarDay {
  date: string;
  day: number;
}

interface IConstructionRequirementsSectionProps {
  dateError?: string;
  desiredConstructionDate: string | null;
  onDateChange: (date: string) => void;
  onRequiresDemolitionChange: (requiresDemolition: boolean) => void;
  requiresDemolition: boolean | null;
  typeError?: string;
}

const getCalendarDays = (month: Dayjs): (ICalendarDay | null)[] => {
  const leadingEmptyDays: null[] = Array.from(
    { length: month.startOf('month').day() },
    () => null,
  );
  const days = Array.from({ length: month.daysInMonth() }, (_, index) => {
    const date = month.date(index + 1);
    return {
      date: date.format(CONSTRUCTION_DATE_FORMAT),
      day: index + 1,
    };
  });
  const cells: (ICalendarDay | null)[] = [...leadingEmptyDays, ...days];

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export function ConstructionRequirementsSection({
  dateError,
  desiredConstructionDate,
  onDateChange,
  onRequiresDemolitionChange,
  requiresDemolition,
  typeError,
}: IConstructionRequirementsSectionProps): React.JSX.Element {
  const minimumDate = getMinimumConstructionDate();
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    dayjs(desiredConstructionDate ?? minimumDate).startOf('month'),
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const canMoveToPreviousMonth = !visibleMonth
    .subtract(1, 'month')
    .endOf('month')
    .isBefore(dayjs(minimumDate), 'day');
  const formattedDate = desiredConstructionDate
    ? dayjs(desiredConstructionDate).format('YYYY년 M월 D일')
    : '날짜를 선택해 주세요.';

  const openCalendar = (): void => {
    setVisibleMonth(dayjs(desiredConstructionDate ?? minimumDate).startOf('month'));
    setIsCalendarVisible(true);
  };

  return (
    <View className="mt-7">
      <Text className="text-lg font-bold text-ink-900">공사 조건</Text>
      {(typeError || dateError) && (
        <Text accessibilityRole="alert" className="mt-1 text-sm font-semibold text-red-600">
          필수 공사 조건을 확인해 주세요.
        </Text>
      )}

      <View className="mt-3 gap-5 rounded-3xl border border-stone-100 bg-white p-4">
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
            <Ionicons color="#176D62" name="calendar-outline" size={21} />
            <Text
              className={`ml-3 flex-1 text-sm font-semibold ${
                desiredConstructionDate ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              {formattedDate}
            </Text>
            <Ionicons color="#84908D" name="chevron-forward" size={19} />
          </Pressable>
          {dateError && (
            <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-red-600">
              {dateError}
            </Text>
          )}
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsCalendarVisible(false)}
        transparent
        visible={isCalendarVisible}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-md rounded-3xl bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-ink-900">공사 희망 날짜</Text>
              <Pressable
                accessibilityLabel="날짜 선택 닫기"
                className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-50"
                onPress={() => setIsCalendarVisible(false)}
              >
                <Ionicons color="#253330" name="close" size={24} />
              </Pressable>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="이전 달"
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  canMoveToPreviousMonth ? 'active:bg-stone-50' : 'opacity-30'
                }`}
                disabled={!canMoveToPreviousMonth}
                onPress={() => setVisibleMonth((current) => current.subtract(1, 'month'))}
              >
                <Ionicons color="#253330" name="chevron-back" size={22} />
              </Pressable>
              <Text accessibilityRole="header" className="text-base font-bold text-ink-900">
                {visibleMonth.format('YYYY년 M월')}
              </Text>
              <Pressable
                accessibilityLabel="다음 달"
                className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-50"
                onPress={() => setVisibleMonth((current) => current.add(1, 'month'))}
              >
                <Ionicons color="#253330" name="chevron-forward" size={22} />
              </Pressable>
            </View>

            <View className="mt-3 flex-row flex-wrap">
              {WEEKDAYS.map((weekday) => (
                <View key={weekday} className="w-[14.2857%] items-center py-2">
                  <Text className="text-xs font-semibold text-ink-500">{weekday}</Text>
                </View>
              ))}
              {calendarDays.map((calendarDay, index) => {
                if (!calendarDay) {
                  return <View key={`empty-${index}`} className="h-12 w-[14.2857%]" />;
                }

                const isDisabled = calendarDay.date < minimumDate;
                const isSelected = calendarDay.date === desiredConstructionDate;
                return (
                  <View key={calendarDay.date} className="h-12 w-[14.2857%] items-center">
                    <Pressable
                      accessibilityLabel={`${dayjs(calendarDay.date).format('YYYY년 M월 D일')} 선택`}
                      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                      className={`h-11 w-11 items-center justify-center rounded-full ${
                        isSelected ? 'bg-brand-900' : isDisabled ? 'opacity-30' : 'active:bg-brand-100'
                      }`}
                      disabled={isDisabled}
                      onPress={() => {
                        onDateChange(calendarDay.date);
                        setIsCalendarVisible(false);
                      }}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-white' : 'text-ink-900'
                        }`}
                      >
                        {calendarDay.day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
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
          color={isSelected ? '#176D62' : '#C9CECC'}
          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
          size={22}
        />
      </View>
      <Text className="mt-2 text-xs leading-5 text-ink-600">{description}</Text>
    </Pressable>
  );
}
