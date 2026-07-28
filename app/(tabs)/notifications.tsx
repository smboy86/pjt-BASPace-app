import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <View className="flex-1 px-5 pb-10 pt-4">
        <Text accessibilityRole="header" className="text-2xl font-bold text-ink-900">
          알림
        </Text>

        <View
          accessible
          accessibilityLabel="새 알림이 없습니다"
          className="mt-6 flex-1 items-center justify-center rounded-3xl border border-stone-100 bg-white px-6"
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100">
            <Ionicons name="notifications-outline" color="#123F3B" size={30} />
          </View>
          <Text className="mt-5 text-lg font-bold text-ink-900">새 알림이 없어요.</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
            새로운 소식이 도착하면 이곳에서 확인할 수 있어요.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
