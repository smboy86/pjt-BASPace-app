import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@shared/config';

type TIoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ITabIconProps {
  name: TIoniconName;
  color: string;
  size: number;
}

function TabIcon({ name, color, size }: ITabIconProps): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout(): React.JSX.Element {
  return (
    <Tabs
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
        name="index"
        options={{
          title: '내 요청',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="document-text" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '새 요청',
          tabBarIcon: ({ color, size }) => <TabIcon name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color, size }) => <TabIcon name="person" color={color} size={size} />,
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
    </Tabs>
  );
}
