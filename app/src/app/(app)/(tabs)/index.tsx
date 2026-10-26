import { Stack, router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Badge, Button, Empty, ErrorText, OnlineDot, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { useDevices, useNow, type DeviceWithState } from '@/lib/devices';
import { deviceTitle, isOnline, statusLabel, timeAgo } from '@/lib/format';
import { radius, space, useColors } from '@/lib/theme';

export default function Cameras() {
  const c = useColors();
  const userId = useUserId();
  const { devices, error, refreshing, refresh } = useDevices(userId);
  const now = useNow();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/add-camera')}
              accessibilityLabel="Add camera"
              hitSlop={12}
              style={{ paddingHorizontal: space.lg }}>
              <Icon name="add" size={22} color={c.accent} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={devices ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={error ? <ErrorText>{error}</ErrorText> : undefined}
        ListEmptyComponent={
          devices ? (
            <Empty
              title="No cameras yet"
              body="Scan the QR code on your PatrolEye camera to add it."
              action={
                <Button
                  title="Add camera"
                  icon={<Icon name="qr" color={c.accentText} />}
                  onPress={() => router.push('/add-camera')}
                  style={{ marginTop: space.md, alignSelf: 'stretch' }}
                />
              }
            />
          ) : undefined
        }
        renderItem={({ item }) => <CameraRow device={item} now={now} />}
      />
    </>
  );
}

function CameraRow({ device, now }: { device: DeviceWithState; now: number }) {
  const c = useColors();
  const state = device.device_state;
  const online = isOnline(state, now);
  return (
    <Pressable
      onPress={() => router.push(`/camera/${device.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={{ flex: 1, gap: space.xs }}>
        <T variant="heading" numberOfLines={1}>
          {deviceTitle(device)}
        </T>
        {device.room ? (
          <T muted numberOfLines={1}>
            {device.room}
          </T>
        ) : null}
        <View style={styles.meta}>
          <OnlineDot online={online} />
          {online && state ? (
            <Badge label={statusLabel(state.status)} tone={state.status === 'error' ? 'danger' : 'neutral'} />
          ) : state?.last_seen ? (
            <T variant="caption" muted>
              Last seen {timeAgo(state.last_seen, now)}
            </T>
          ) : null}
        </View>
      </View>
      <Icon name="chevron" size={16} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
});
