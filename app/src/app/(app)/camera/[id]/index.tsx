import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { CameraNameForm } from '@/components/camera-name-form';
import { Button, Card, ErrorText, OnlineDot, Row, T } from '@/components/ui';
import { useNow } from '@/lib/devices';
import { deviceTitle, isOnline, statusLabel, timeAgo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';
import type { Device, DeviceState, Masks } from '@/lib/types';

type Detail = Device & { device_state: DeviceState | null };

export default function CameraDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const [device, setDevice] = useState<Detail | null>(null);
  const [masks, setMasks] = useState<Pick<Masks, 'version' | 'rects' | 'created_at'> | null>(null);
  const [hasScan, setHasScan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const [dev, mask, scan] = await Promise.all([
      supabase.from('devices').select('*, device_state(*)').eq('id', id).maybeSingle<Detail>(),
      supabase
        .from('masks')
        .select('version, rects, created_at')
        .eq('device_id', id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('scans').select('id', { count: 'exact', head: true }).eq('device_id', id),
    ]);
    if (dev.error) return setError(dev.error.message);
    if (!dev.data) return setError('This camera does not exist or is not linked to your account.');
    setError(null);
    setDevice(dev.data);
    setMasks(mask.data);
    setHasScan((scan.count ?? 0) > 0);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const channel = supabase
      .channel(`device-state-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'device_state', filter: `device_id=eq.${id}` },
        (msg) => setDevice((d) => (d ? { ...d, device_state: msg.new as DeviceState } : d)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (error) {
    return (
      <View style={styles.page}>
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }
  if (!device) return <ActivityIndicator style={{ marginTop: space.xxl }} />;

  const state = device.device_state;
  const online = isOnline(state, now);
  const applied = masks && state && state.masks_version >= masks.version;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: deviceTitle(device) }} />

      <Card>
        <View style={styles.cardHead}>
          <T variant="heading">Status</T>
          <OnlineDot online={online} />
        </View>
        <Row label="Activity" value={online && state ? statusLabel(state.status) : 'Not reporting'} />
        <Row label="Last seen" value={state?.last_seen ? timeAgo(state.last_seen, now) : 'Never'} />
        {device.room ? <Row label="Room" value={device.room} /> : null}
      </Card>

      <Card>
        <T variant="heading">Privacy zones</T>
        <T muted>
          {masks
            ? `${masks.rects.length} ${masks.rects.length === 1 ? 'zone is' : 'zones are'} always blacked out. ${
                applied ? 'Active on the camera.' : 'Waiting for the camera to apply them.'
              }`
            : 'Choose areas the camera should never see, like a bed or a bathroom door.'}
        </T>
        <Button
          title={masks || hasScan ? 'Edit privacy zones' : 'Set up privacy zones'}
          onPress={() => router.push(`/camera/${id}/masks`)}
        />
        {hasScan ? (
          <Button
            variant="secondary"
            title="Rescan the room"
            onPress={() => router.push(`/camera/${id}/masks?rescan=1`)}
          />
        ) : null}
      </Card>

      <Card>
        <View style={styles.cardHead}>
          <T variant="heading">Name</T>
          {!editing ? <Button variant="ghost" title="Edit" onPress={() => setEditing(true)} style={{ minHeight: 32 }} /> : null}
        </View>
        {editing ? (
          <CameraNameForm
            deviceId={device.id}
            initialName={device.name ?? ''}
            initialRoom={device.room ?? ''}
            submitLabel="Save"
            onSaved={(v) => {
              setDevice({ ...device, ...v });
              setEditing(false);
            }}
          />
        ) : (
          <>
            <Row label="Name" value={deviceTitle(device)} />
            <Row label="Room" value={device.room ?? 'Not set'} />
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
