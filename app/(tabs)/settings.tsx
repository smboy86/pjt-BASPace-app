import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDemoSessionStore } from '@/features/demo-session';

type TIoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ISettingRowProps {
  icon: TIoniconName;
  label: string;
  description?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export default function SettingsScreen(): React.JSX.Element {
  const user = useDemoSessionStore((state) => state.user);
  const signOut = useDemoSessionStore((state) => state.signOut);

  const logout = (): void => {
    Alert.alert('로그아웃', '현재 계정에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const openStore = (): void => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/kr/search?term=%EB%B0%94%EC%8A%A4%ED%8E%98%EC%9D%B4%EC%8A%A4',
      android: 'https://play.google.com/store/apps/details?id=com.baspace.app',
      default: 'https://play.google.com/store/apps/details?id=com.baspace.app',
    });
    void Linking.openURL(url).catch(() => {
      Alert.alert('스토어를 열 수 없어요', '잠시 후 다시 시도해주세요.');
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Text className="text-2xl font-bold text-ink-900">설정</Text>
        <Text className="mt-1 text-sm text-ink-600">계정과 앱 정보를 확인하세요.</Text>

        <View className="mt-6 overflow-hidden rounded-2xl border border-stone-100 bg-white">
          <SettingRow
            icon="person-outline"
            label="로그인 정보"
            description={`${user?.name ?? '사용자'} · ${user?.companyName ?? '고객 계정'}`}
          />
          <SettingRow
            icon="megaphone-outline"
            label="공지사항"
            onPress={() => Alert.alert('공지사항', '등록된 공지사항이 없습니다.')}
          />
          <SettingRow icon="log-out-outline" label="로그아웃" onPress={logout} destructive />
          <SettingRow icon="storefront-outline" label="앱스토어에서 보기" onPress={openStore} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  description,
  onPress,
  destructive = false,
}: ISettingRowProps): React.JSX.Element {
  const content = (
    <>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-sand-50">
        <Ionicons name={icon} color={destructive ? '#DC2626' : '#123F3B'} size={21} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className={`text-base font-semibold ${destructive ? 'text-red-600' : 'text-ink-900'}`}
        >
          {label}
        </Text>
        {description && <Text className="mt-1 text-sm text-ink-600">{description}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" color="#84908D" size={18} />}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      className="min-h-16 flex-row items-center border-b border-stone-100 px-4 py-3 active:bg-sand-50"
      onPress={onPress}
    >
      {content}
    </Pressable>
  ) : (
    <View className="min-h-16 flex-row items-center border-b border-stone-100 px-4 py-3">
      {content}
    </View>
  );
}
