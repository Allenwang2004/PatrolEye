import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Badge, Empty, ErrorText, SeverityBadge, T } from '@/components/ui';
import { useNow } from '@/lib/devices';
import { EVENT_PAGE, EVENT_SELECT, fetchEvents, mergeEvents, signThumbs, type EventRow } from '@/lib/events';
import { deviceTitle, timeAgo } from '@/lib/format';
import { useLiveEvents } from '@/lib/live-events';
import { supabase } from '@/lib/supabase';
import { radius, space, useColors } from '@/lib/theme';

export default function Events() {
  const now = useNow(30_000);
  const { subscribe } = useLiveEvents();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function addThumbs(rows: EventRow[]) {
    const paths = rows.map((r) => r.thumb_path).filter((p): p is string => !!p && !thumbs[p]);
    try {
      const signed = await signThumbs(paths);
      setThumbs((t) => ({ ...t, ...signed }));
    } catch {
      // Rows still show without a thumbnail
    }
  }

  /** Newest page; merged so pages already loaded below stay. */
  const loadFirst = useCallback(async () => {
    try {
      const rows = await fetchEvents();
      setError(null);
      setEvents((list) => (list ? mergeEvents(list, rows) : rows));
      setHasMore((h) => h && rows.length === EVENT_PAGE);
      addThumbs(rows);
    } catch (e) {
      setError((e as Error).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst]),
  );

  // New events arrive through Realtime while the app is open
  useEffect(
    () =>
      subscribe(async (e) => {
        const { data } = await supabase.from('events').select(EVENT_SELECT).eq('id', e.id).single<EventRow>();
        if (!data) return;
        setEvents((list) => mergeEvents(list ?? [], [data]));
        addThumbs([data]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscribe],
  );

  async function refresh() {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }

  async function loadMore() {
    if (!events?.length || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const rows = await fetchEvents(events[events.length - 1].ts);
      setEvents((list) => mergeEvents(list ?? [], rows));
      setHasMore(rows.length === EVENT_PAGE);
      addThumbs(rows);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoadingMore(false);
  }

  return (
    <FlatList
      data={events ?? []}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={error ? <ErrorText>{error}</ErrorText> : undefined}
      ListEmptyComponent={
        events ? (
          <Empty title="No events" body="When a camera notices something wrong, it shows up here with a video clip." />
        ) : (
          <ActivityIndicator style={{ marginTop: space.xxl }} />
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: space.lg }} /> : undefined}
      renderItem={({ item }) => <EventRowView event={item} thumb={item.thumb_path ? thumbs[item.thumb_path] : undefined} now={now} />}
    />
  );
}

function EventRowView({ event, thumb, now }: { event: EventRow; thumb?: string; now: number }) {
  const c = useColors();
  const camera = event.devices ? deviceTitle({ id: event.device_id, name: event.devices.name }) : null;
  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.thumb, { backgroundColor: c.surfaceMuted }]}>
        {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={styles.badges}>
          <SeverityBadge severity={event.severity} />
          {event.acked_at ? <Badge label="Seen" tone="neutral" /> : null}
        </View>
        <T variant="heading" numberOfLines={2} style={!event.acked_at ? undefined : { fontWeight: '500' }}>
          {event.title}
        </T>
        <T variant="caption" muted numberOfLines={1}>
          {[camera, timeAgo(event.ts, now)].filter(Boolean).join(' · ')}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 96, height: 72, borderRadius: radius.md, overflow: 'hidden' },
  badges: { flexDirection: 'row', gap: space.sm },
});
