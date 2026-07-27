import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AssignmentScreen(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-6">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-stone-100">
        <Ionicons name="lock-closed-outline" color="#62706D" size={28} />
      </View>
      <Text className="mt-5 text-xl font-bold text-ink-900">접근할 수 없는 화면이에요.</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-ink-600">
        고객 계정에서는 담당자 배정 기능을 사용할 수 없습니다.
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-6 rounded-xl bg-brand-900 px-5 py-3"
        onPress={() => router.back()}
      >
        <Text className="font-bold text-white">돌아가기</Text>
      </Pressable>
    </SafeAreaView>
  );
}
