import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Colors } from '@shared/config';
import { useCustomerBackFallback } from '@shared/lib';

type TIoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ITabIconProps {
  name: TIoniconName;
  color: ColorValue;
  size: number;
}

function TabIcon({ name, color, size }: ITabIconProps): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout(): React.JSX.Element {
  const segments = useSegments();

  useCustomerBackFallback(segments);

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.DEFAULT,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarStyle: {
          backgroundColor: Colors.background.secondary,
          borderTopColor: Colors.surface.glassBorder,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: '견적요청',
          tabBarIcon: ({ color, size }) => <TabIcon name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '나의견적',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="document-text" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="notifications" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="request/[requestId]" options={{ href: null }} />
      <Tabs.Screen name="assignment" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}
