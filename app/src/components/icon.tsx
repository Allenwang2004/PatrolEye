import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

// One name per icon, mapped to SF Symbols (iOS) and Material Symbols (Android, web)
const ICONS = {
  camera: { ios: 'video', android: 'videocam' },
  events: { ios: 'bell', android: 'notifications' },
  settings: { ios: 'gearshape', android: 'settings' },
  add: { ios: 'plus', android: 'add' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  trash: { ios: 'trash', android: 'delete' },
  check: { ios: 'checkmark', android: 'check' },
  zoomIn: { ios: 'plus.magnifyingglass', android: 'zoom_in' },
  zoomOut: { ios: 'minus.magnifyingglass', android: 'zoom_out' },
  draw: { ios: 'rectangle.dashed', android: 'crop_free' },
  move: { ios: 'hand.draw', android: 'pan_tool' },
  qr: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: ColorValue }) {
  const { ios, android } = ICONS[name];
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} />;
}
