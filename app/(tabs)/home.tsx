import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerHomeColors } from '@shared/config';

export default function CustomerHomeScreen(): React.JSX.Element {
  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: CustomerHomeColors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-10"
      >
        <View
          className="w-full max-w-[360px] self-center rounded-3xl border bg-white px-6 py-10"
          style={{ borderColor: CustomerHomeColors.primaryLight }}
        >
          <View
            className="self-start rounded-full px-3 py-2"
            style={{ backgroundColor: CustomerHomeColors.primaryLight }}
          >
            <Text className="text-xs font-bold" style={{ color: CustomerHomeColors.primary }}>
              콘텐츠 준비 중
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            className="mt-5 text-2xl font-bold"
            style={{ color: CustomerHomeColors.primaryDark }}
          >
            홈을 준비하고 있어요
          </Text>
          <Text className="mt-3 text-base leading-7" style={{ color: CustomerHomeColors.inactive }}>
            메인 이미지와 서비스 안내 콘텐츠가 준비되면 이곳에서 확인할 수 있어요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
