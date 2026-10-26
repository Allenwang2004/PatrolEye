import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { SeverityBadge, T } from '@/components/ui';
import { useLiveEvents } from '@/lib/live-events';
import { radius, space, useColors } from '@/lib/theme';

const SHOW_MS = 8000;

/** In-app alert for a new event, shown on top of every screen (stands in for push). */
export function EventAlert() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { latest, dismiss } = useLiveEvents();

  useEffect(() => {
    if (!latest) return;
    const t = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(t);
  }, [latest, dismiss]);

  if (!latest || pathname === `/event/${latest.id}`) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`New event: ${latest.title}. Open`}
        onPress={() => {
          dismiss();
          router.push(`/event/${latest.id}`);
        }}
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, shadowColor: '#000' }]}>
        <View style={{ flex: 1, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <SeverityBadge severity={latest.severity} />
            <T variant="caption" muted>
              New event
            </T>
          </View>
          <T variant="heading" numberOfLines={2}>
            {latest.title}
          </T>
        </View>
        <Pressable accessibilityLabel="Dismiss" hitSlop={12} onPress={dismiss}>
          <Icon name="close" size={18} color={c.textMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
