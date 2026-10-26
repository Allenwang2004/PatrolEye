import { Stack } from 'expo-router';

import { EventAlert } from '@/components/event-alert';
import { LiveEventsProvider } from '@/lib/live-events';

export default function AppLayout() {
  return (
    <LiveEventsProvider>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-camera" options={{ title: 'Add camera', presentation: 'modal' }} />
        <Stack.Screen name="camera/[id]/index" options={{ title: 'Camera' }} />
        <Stack.Screen name="camera/[id]/masks" options={{ title: 'Privacy zones', gestureEnabled: false }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
      </Stack>
      <EventAlert />
    </LiveEventsProvider>
  );
}
