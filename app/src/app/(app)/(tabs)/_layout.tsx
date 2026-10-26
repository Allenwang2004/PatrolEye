import { Tabs } from 'expo-router';

import { Icon } from '@/components/icon';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'left' }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Cameras', tabBarIcon: ({ color }) => <Icon name="camera" color={color} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: 'Events', tabBarIcon: ({ color }) => <Icon name="events" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }}
      />
    </Tabs>
  );
}
