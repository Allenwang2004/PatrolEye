import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, ErrorText, Row, T } from '@/components/ui';
import { useAuth, useUserId } from '@/lib/auth';
import { useDevices } from '@/lib/devices';
import { deviceTitle } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { space, useColors } from '@/lib/theme';

export default function Settings() {
  const c = useColors();
  const { session } = useAuth();
  const userId = useUserId();
  const { devices } = useDevices(userId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Card>
        <T variant="heading">Account</T>
        <Row label="Email" value={session?.user.email ?? ''} />
      </Card>

      <Card style={{ gap: 0 }}>
        <T variant="heading" style={{ marginBottom: space.sm }}>
          Cameras
        </T>
        {devices?.length ? (
          devices.map((d, i) => (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/camera/${d.id}`)}
              style={[
                styles.cameraRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
              ]}>
              <View style={{ flex: 1 }}>
                <T>{deviceTitle(d)}</T>
                {d.room ? (
                  <T variant="caption" muted>
                    {d.room}
                  </T>
                ) : null}
              </View>
              <T variant="caption" color={c.accent}>
                Rename
              </T>
              <Icon name="chevron" size={14} color={c.textMuted} />
            </Pressable>
          ))
        ) : (
          <T muted>No cameras yet.</T>
        )}
      </Card>

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button variant="danger" title="Sign out" onPress={signOut} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg },
  cameraRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
});
