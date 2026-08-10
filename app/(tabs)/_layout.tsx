import { Ionicons } from '@expo/vector-icons';
import { Tabs, useSegments } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerHomeColors } from '@shared/config';
import { useCustomerBackFallback } from '@shared/lib';

type TIoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ITabIconProps {
  activeName: TIoniconName;
  inactiveName: TIoniconName;
  focused: boolean;
  color: ColorValue;
  size: number;
}

function TabIcon({
  activeName,
  inactiveName,
  focused,
  color,
  size,
}: ITabIconProps): React.JSX.Element {
  return <Ionicons name={focused ? activeName : inactiveName} size={size} color={color} />;
}

interface IHomeTabIconProps {
  focused: boolean;
}

function HomeTabIcon({ focused }: IHomeTabIconProps): React.JSX.Element {
  return (
    <View
      accessible={false}
      className="h-[60px] w-[60px] items-center justify-center rounded-full border-4 border-white"
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.homeTabCircle,
        {
          backgroundColor: focused ? CustomerHomeColors.primary : CustomerHomeColors.primaryLight,
        },
      ]}
    >
      <Ionicons
        color={focused ? CustomerHomeColors.surface : CustomerHomeColors.primary}
        name={focused ? 'home' : 'home-outline'}
        size={27}
      />
    </View>
  );
}

export default function TabLayout(): React.JSX.Element {
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  useCustomerBackFallback(segments);

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CustomerHomeColors.primary,
        tabBarInactiveTintColor: CustomerHomeColors.inactive,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          backgroundColor: CustomerHomeColors.surface,
          borderTopColor: CustomerHomeColors.primaryLight,
          borderTopWidth: 1,
          overflow: 'visible',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: '견적요청',
          tabBarAccessibilityLabel: '견적요청 탭',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              activeName="add-circle"
              inactiveName="add-circle-outline"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '나의견적',
          tabBarAccessibilityLabel: '나의견적 탭',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              activeName="document-text"
              inactiveName="document-text-outline"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarAccessibilityLabel: '홈 탭',
          tabBarActiveTintColor: CustomerHomeColors.primary,
          tabBarLabel: () => null,
          tabBarButton: ({
            accessibilityLargeContentTitle,
            accessibilityShowsLargeContentViewer,
            disabled,
            onLongPress,
            onPress,
            role,
            style: tabBarButtonStyle,
            testID,
            'aria-label': ariaLabel,
            'aria-selected': ariaSelected,
          }) => (
            <Pressable
              accessibilityLabel={ariaLabel}
              accessibilityLargeContentTitle={accessibilityLargeContentTitle}
              accessibilityShowsLargeContentViewer={accessibilityShowsLargeContentViewer}
              accessibilityState={{ selected: ariaSelected }}
              disabled={disabled}
              onLongPress={onLongPress}
              onPress={onPress as React.ComponentProps<typeof Pressable>['onPress']}
              style={({ pressed }) => [
                tabBarButtonStyle,
                styles.homeTabButton,
                pressed && styles.homeTabButtonPressed,
              ]}
              role={role}
              testID={testID}
            >
              <HomeTabIcon focused={ariaSelected ?? false} />
              <Text
                allowFontScaling
                accessible={false}
                style={[
                  styles.homeTabLabel,
                  {
                    color: ariaSelected
                      ? CustomerHomeColors.primary
                      : CustomerHomeColors.inactive,
                    fontWeight: ariaSelected ? '700' : '600',
                  },
                ]}
              >
                홈
              </Text>
            </Pressable>
          ),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarAccessibilityLabel: '알림 탭',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              activeName="notifications"
              inactiveName="notifications-outline"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarAccessibilityLabel: '설정 탭',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon
              activeName="settings"
              inactiveName="settings-outline"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen name="request/[requestId]" options={{ href: null }} />
      <Tabs.Screen name="assignment" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeTabButton: {
    minWidth: 64,
    minHeight: 79,
    marginTop: -22,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
    borderRadius: 32,
  },
  homeTabCircle: {
    ...Platform.select({
      ios: {
        shadowColor: CustomerHomeColors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 7,
      },
      android: {
        elevation: 7,
      },
      default: {},
    }),
  },
  homeTabLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  homeTabButtonPressed: {
    opacity: 0.86,
  },
});
