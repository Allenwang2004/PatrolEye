import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Svg, { Rect } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { Button, T } from '@/components/ui';
import { clampRect, normalizeRect, type PixelRect } from '@/lib/masks';
import { radius, space, useColors } from '@/lib/theme';
import type { Scan } from '@/lib/types';

const ZOOMS = [1, 1.75, 3];
/** Drags smaller than this (screen points) are ignored. */
const MIN_SIZE = 12;

type Mode = 'move' | 'draw';

/**
 * Panorama with privacy rectangles drawn on top. Rectangles are kept in
 * panorama pixels so zooming never changes them.
 */
export function MaskEditor({
  scan,
  imageUrl,
  rects,
  onChange,
}: {
  scan: Scan;
  imageUrl: string;
  rects: PixelRect[];
  onChange: (rects: PixelRect[]) => void;
}) {
  const c = useColors();
  const window = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('draw');
  const [zoom, setZoom] = useState(0);
  const [draft, setDraft] = useState<PixelRect | null>(null);
  // Gesture callbacks can run before React re-renders, so the drag itself lives in refs
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<PixelRect | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const viewH = Math.round(Math.min(380, window.height * 0.45));
  const scale = (viewH * ZOOMS[zoom]) / scan.height; // screen points per panorama pixel
  const contentW = scan.width * scale;
  const contentH = scan.height * scale;

  // RNGH re-registers a gesture whenever its config object changes, which
  // cancels a drag in progress. Keep the configs stable and read the latest
  // values through a ref.
  const latest = useRef({ scale, scan, rects, onChange });
  useEffect(() => {
    latest.current = { scale, scan, rects, onChange };
  });

  const panConfig = useMemo(
    () => ({
      enabled: mode === 'draw',
      runOnJS: true,
      minDistance: 4,
      onBegin: (e: { x: number; y: number }) => {
        const { scale } = latest.current;
        startRef.current = { x: e.x / scale, y: e.y / scale };
      },
      onUpdate: (e: { x: number; y: number }) => {
        const s = startRef.current;
        if (!s) return;
        const { scale, scan } = latest.current;
        draftRef.current = clampRect(normalizeRect(s.x, s.y, e.x / scale, e.y / scale), scan);
        setDraft(draftRef.current);
      },
      onDeactivate: () => {
        const d = draftRef.current;
        const { scale, rects, onChange } = latest.current;
        if (d && (d.x1 - d.x0) * scale >= MIN_SIZE && (d.y1 - d.y0) * scale >= MIN_SIZE) {
          onChange([...rects, d]);
          setSelected(rects.length);
        }
      },
      onFinalize: () => {
        startRef.current = null;
        draftRef.current = null;
        setDraft(null);
      },
    }),
    [mode],
  );

  const tapConfig = useMemo(
    () => ({
      runOnJS: true,
      onActivate: (e: { x: number; y: number }) => {
        const { scale, rects } = latest.current;
        const x = e.x / scale;
        const y = e.y / scale;
        // Topmost rectangle under the finger
        for (let i = rects.length - 1; i >= 0; i--) {
          const r = rects[i];
          if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return setSelected(i);
        }
        setSelected(null);
      },
    }),
    [],
  );

  const pan = usePanGesture(panConfig);
  const tap = useTapGesture(tapConfig);
  const gesture = useCompetingGestures(pan, tap);
  const scrollable = mode === 'move';

  return (
    <View style={{ gap: space.md }}>
      <View style={[styles.viewport, { height: viewH, backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
        <ScrollView horizontal scrollEnabled={scrollable} showsHorizontalScrollIndicator>
          <ScrollView scrollEnabled={scrollable} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <GestureDetector gesture={gesture}>
              <View style={{ width: contentW, height: contentH }}>
                {/* Not a touch target: on web, dragging an <img> starts a native image drag and cancels the gesture */}
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="fill" transition={150} />
                </View>
                <Svg width={contentW} height={contentH} style={StyleSheet.absoluteFill} pointerEvents="none">
                  {rects.map((r, i) => (
                    <Rect
                      key={i}
                      x={r.x0 * scale}
                      y={r.y0 * scale}
                      width={(r.x1 - r.x0) * scale}
                      height={(r.y1 - r.y0) * scale}
                      fill="#000000"
                      fillOpacity={0.6}
                      stroke={i === selected ? c.accent : '#FFFFFF'}
                      strokeWidth={i === selected ? 3 : 1.5}
                    />
                  ))}
                  {draft ? (
                    <Rect
                      x={draft.x0 * scale}
                      y={draft.y0 * scale}
                      width={(draft.x1 - draft.x0) * scale}
                      height={(draft.y1 - draft.y0) * scale}
                      fill="#000000"
                      fillOpacity={0.4}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  ) : null}
                </Svg>
              </View>
            </GestureDetector>
          </ScrollView>
        </ScrollView>
      </View>

      <View style={styles.toolbar}>
        <View style={[styles.segment, { borderColor: c.border, backgroundColor: c.surface }]}>
          <ToolButton active={mode === 'draw'} label="Draw" icon="draw" onPress={() => setMode('draw')} />
          <ToolButton active={mode === 'move'} label="Move" icon="move" onPress={() => setMode('move')} />
        </View>
        <View style={[styles.segment, { borderColor: c.border, backgroundColor: c.surface }]}>
          <ToolButton label="Zoom out" icon="zoomOut" disabled={zoom === 0} onPress={() => setZoom(zoom - 1)} />
          <ToolButton label="Zoom in" icon="zoomIn" disabled={zoom === ZOOMS.length - 1} onPress={() => setZoom(zoom + 1)} />
        </View>
      </View>

      <T variant="caption" muted>
        {mode === 'draw'
          ? 'Drag on the picture to black out an area. Switch to Move to look around.'
          : 'Drag to look around. Tap an area to select it.'}
      </T>

      {selected != null && rects[selected] ? (
        <Button
          variant="danger"
          title="Remove selected area"
          icon={<Icon name="trash" color={c.danger} />}
          onPress={() => {
            onChange(rects.filter((_, i) => i !== selected));
            setSelected(null);
          }}
        />
      ) : null}
    </View>
  );
}

function ToolButton({
  label,
  icon,
  active,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'draw' | 'move' | 'zoomIn' | 'zoomOut';
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const showLabel = icon === 'draw' || icon === 'move';
  return (
    <Button
      variant="ghost"
      title={showLabel ? label : ''}
      icon={<Icon name={icon} size={18} color={active ? c.accentText : c.text} />}
      onPress={onPress}
      disabled={disabled}
      style={[styles.tool, active && { backgroundColor: c.accent }]}
      accessibilityLabel={label}
      textColor={active ? c.accentText : c.text}
    />
  );
}

const styles = StyleSheet.create({
  viewport: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  segment: { flexDirection: 'row', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: 2, gap: 2 },
  tool: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm },
});
