import { useColorScheme } from 'react-native';

const light = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F3',
  border: '#E1E4E8',
  text: '#11181C',
  textMuted: '#5F6B76',
  accent: '#1F6FEB',
  accentText: '#FFFFFF',
  danger: '#D1242F',
  dangerSoft: '#FDECEC',
  warning: '#B35900',
  warningSoft: '#FFF1E0',
  info: '#3B5B7A',
  infoSoft: '#E8EEF5',
  success: '#1A7F37',
  successSoft: '#E3F4E8',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

const dark: typeof light = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceMuted: '#1F252D',
  border: '#2A313A',
  text: '#E6EDF3',
  textMuted: '#8D96A0',
  accent: '#4C8DF6',
  accentText: '#FFFFFF',
  danger: '#F85149',
  dangerSoft: '#3A1D1F',
  warning: '#E3A03C',
  warningSoft: '#3A2A12',
  info: '#8DB2D9',
  infoSoft: '#1C2836',
  success: '#3FB950',
  successSoft: '#17301E',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
