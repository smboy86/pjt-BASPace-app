import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { type Dayjs } from 'dayjs';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

interface ICalendarDay {
  date: string;
  day: number;
}

interface IConstructionDatePickerModalProps {
  minimumDate: string;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate?: string | null;
  title?: string;
  visible: boolean;
}

const getCalendarDays = (month: Dayjs): (ICalendarDay | null)[] => {
  const cells: (ICalendarDay | null)[] = [
    ...Array.from({ length: month.startOf('month').day() }, () => null),
    ...Array.from({ length: month.daysInMonth() }, (_, index) => {
      const date = month.date(index + 1);
      return { date: date.format('YYYY-MM-DD'), day: index + 1 };
    }),
  ];

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const getInitialMonth = (selectedDate: string | null | undefined, minimumDate: string): Dayjs => {
  const parsedSelectedDate = dayjs(selectedDate);
  return (
    selectedDate && parsedSelectedDate.isValid() ? parsedSelectedDate : dayjs(minimumDate)
  ).startOf('month');
};

export function ConstructionDatePickerModal({
  minimumDate,
  onClose,
  onSelect,
  selectedDate,
  title = '공사 희망 날짜',
  visible,
}: IConstructionDatePickerModalProps): React.JSX.Element {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialMonth(selectedDate, minimumDate),
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const canMoveToPreviousMonth = !visibleMonth
    .subtract(1, 'month')
    .endOf('month')
    .isBefore(dayjs(minimumDate), 'day');

  const handleShow = (): void => {
    setVisibleMonth(getInitialMonth(selectedDate, minimumDate));
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleShow}
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-5">
        <View className="w-full max-w-md rounded-3xl bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink-900">{title}</Text>
            <Pressable
              accessibilityLabel="날짜 선택 닫기"
              className="h-11 w-11 items-center justify-center rounded-full active:bg-stone-50"
              onPress={onClose}
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
              const isSelected = calendarDay.date === selectedDate;
              return (
                <View key={calendarDay.date} className="h-12 w-[14.2857%] items-center">
                  <Pressable
                    accessibilityLabel={`${dayjs(calendarDay.date).format('YYYY년 M월 D일')} 선택`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                    className={`h-11 w-11 items-center justify-center rounded-full ${
                      isSelected
                        ? 'bg-brand-900'
                        : isDisabled
                          ? 'opacity-30'
                          : 'active:bg-brand-100'
                    }`}
                    disabled={isDisabled}
                    onPress={() => onSelect(calendarDay.date)}
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
  );
}
