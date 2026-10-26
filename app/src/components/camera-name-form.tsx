import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, ErrorText, Field, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { radius, space, useColors } from '@/lib/theme';

const ROOMS = ['Living room', 'Kitchen', 'Bedroom', 'Hallway', 'Bathroom', 'Garage'];

/** Name and room for a camera; updates devices.name and devices.room. */
export function CameraNameForm({
  deviceId,
  initialName = '',
  initialRoom = '',
  submitLabel,
  onSaved,
}: {
  deviceId: string;
  initialName?: string;
  initialRoom?: string;
  submitLabel: string;
  onSaved: (v: { name: string; room: string | null }) => void;
}) {
  const c = useColors();
  const [name, setName] = useState(initialName);
  const [room, setRoom] = useState(initialRoom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const values = { name: name.trim(), room: room.trim() || null };
    const { error } = await supabase.from('devices').update(values).eq('id', deviceId);
    setBusy(false);
    if (error) setError(error.message);
    else onSaved(values);
  }

  return (
    <View style={{ gap: space.lg }}>
      <Field label="Camera name" value={name} onChangeText={setName} placeholder="e.g. Grandma's camera" maxLength={40} />
      <View style={{ gap: space.sm }}>
        <Field label="Room" value={room} onChangeText={setRoom} placeholder="Pick one or type your own" maxLength={40} />
        <View style={styles.chips}>
          {ROOMS.map((r) => {
            const selected = r === room;
            return (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setRoom(r)}
                style={[
                  styles.chip,
                  { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accent : c.surface },
                ]}>
                <T variant="caption" color={selected ? c.accentText : c.text}>
                  {r}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title={submitLabel} onPress={save} loading={busy} disabled={!name.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm },
});
