import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { radius, space, useColors, type Colors } from '@/lib/theme';
import type { Severity } from '@/lib/types';

type TextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption';

export function T({
  variant = 'body',
  muted,
  color,
  style,
  numberOfLines,
  children,
}: PropsWithChildren<{
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[textStyles[variant], { color: color ?? (muted ? c.textMuted : c.text) }, style]}>
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16 },
});

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  accessibilityLabel,
  textColor,
}: {
  title: string;
  accessibilityLabel?: string;
  /** Overrides the variant's text color. */
  textColor?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { bg, fg, border } = buttonColors(c, variant);
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon}
      {title ? <Text style={[styles.buttonText, { color: textColor ?? fg }]}>{title}</Text> : null}
    </Pressable>
  );
}

function buttonColors(c: Colors, v: ButtonVariant) {
  switch (v) {
    case 'primary':
      return { bg: c.accent, fg: c.accentText, border: c.accent };
    case 'secondary':
      return { bg: c.surface, fg: c.text, border: c.border };
    case 'danger':
      return { bg: c.surface, fg: c.danger, border: c.border };
    case 'ghost':
      return { bg: 'transparent', fg: c.accent, border: 'transparent' };
  }
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: space.xs }}>
      <T variant="label" muted>
        {label}
      </T>
      <TextInput
        placeholderTextColor={c.textMuted}
        {...props}
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: error ? c.danger : c.border, color: c.text },
        ]}
      />
      {error ? (
        <T variant="caption" color={c.danger}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'danger' | 'warning' | 'info' | 'success' | 'neutral' }) {
  const c = useColors();
  const map = {
    danger: [c.dangerSoft, c.danger],
    warning: [c.warningSoft, c.warning],
    info: [c.infoSoft, c.info],
    success: [c.successSoft, c.success],
    neutral: [c.surfaceMuted, c.textMuted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info';
  return <Badge label={severity[0].toUpperCase() + severity.slice(1)} tone={tone} />;
}

export function OnlineDot({ online }: { online: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <View style={[styles.dot, { backgroundColor: online ? c.success : c.textMuted }]} />
      <T variant="caption" muted>
        {online ? 'Online' : 'Offline'}
      </T>
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {body ? (
        <T muted style={{ textAlign: 'center' }}>
          {body}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorText({ children }: PropsWithChildren) {
  const c = useColors();
  return (
    <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
      <T color={c.danger}>{children}</T>
    </View>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <T muted>{label}</T>
      {typeof value === 'string' ? <T style={{ flexShrink: 1, textAlign: 'right' }}>{value}</T> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
  },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  badge: { borderRadius: 999, paddingHorizontal: space.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xxl, marginTop: space.xxl },
  errorBox: { borderRadius: radius.md, padding: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg, paddingVertical: space.xs },
});
