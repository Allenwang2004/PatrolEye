import { useEvent } from 'expo';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, ErrorText, Row, SeverityBadge, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { EVENT_SELECT, signClip, type EventRow } from '@/lib/events';
import { dateTime, deviceTitle } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { radius, space, useColors } from '@/lib/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const c = useColors();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acking, setAcking] = useState(false);

  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.muted = true; // clips have no audio; muted also lets web browsers autoplay
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).maybeSingle<EventRow>();
      if (error) return setError(error.message);
      if (!data) return setError('This event does not exist or is not from one of your cameras.');
      setEvent(data);
      if (data.clip_path) {
        try {
          setClipUrl(await signClip(data.clip_path));
        } catch (e) {
          setError((e as Error).message);
        }
      }
    })();
  }, [id]);

  useEffect(() => {
    if (clipUrl) player.replaceAsync(clipUrl).then(() => player.play());
  }, [clipUrl, player]);

  async function ack() {
    setAcking(true);
    const { data, error } = await supabase
      .from('events')
      .update({ acked_at: new Date().toISOString(), acked_by: userId })
      .eq('id', id)
      .select(EVENT_SELECT)
      .single<EventRow>();
    setAcking(false);
    if (error) setError(error.message);
    else setEvent(data);
  }

  if (!event) {
    return error ? (
      <View style={styles.page}>
        <ErrorText>{error}</ErrorText>
      </View>
    ) : (
      <ActivityIndicator style={{ marginTop: space.xxl }} />
    );
  }

  const meta = event.meta ?? {};
  const reading = typeof meta.reading === 'number' ? `${meta.reading}${meta.unit ? ` ${meta.unit}` : ''}` : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {event.clip_path ? (
        <View style={[styles.video, { backgroundColor: '#000' }]}>
          <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
          {!clipUrl || status === 'loading' ? (
            <ActivityIndicator color="#FFFFFF" style={StyleSheet.absoluteFill} />
          ) : null}
        </View>
      ) : null}
      {status === 'error' ? <ErrorText>The clip could not be played.</ErrorText> : null}

      <View style={{ gap: space.sm }}>
        <SeverityBadge severity={event.severity} />
        <T variant="title" style={{ fontSize: 24 }}>
          {event.title}
        </T>
        {event.detail ? <T>{event.detail}</T> : null}
      </View>

      <Card>
        <Row label="Time" value={dateTime(event.ts)} />
        {event.devices ? <Row label="Camera" value={deviceTitle({ id: event.device_id, name: event.devices.name })} /> : null}
        {event.devices?.room ? <Row label="Room" value={event.devices.room} /> : null}
        {event.checkpoint ? <Row label="Checkpoint" value={event.checkpoint} /> : null}
        {reading ? <Row label="Reading" value={reading} /> : null}
        {typeof meta.confidence === 'string' ? <Row label="Confidence" value={meta.confidence} /> : null}
      </Card>

      {error ? <ErrorText>{error}</ErrorText> : null}

      {event.acked_at ? (
        <View style={[styles.acked, { backgroundColor: c.successSoft }]}>
          <T color={c.success}>Marked as seen {dateTime(event.acked_at)}</T>
        </View>
      ) : (
        <Button title="Got it" onPress={ack} loading={acking} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg },
  video: { aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'center' },
  acked: { borderRadius: radius.md, padding: space.md, alignItems: 'center' },
});
