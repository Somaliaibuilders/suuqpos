import '@/global.css';

import { Platform } from 'react-native';

export type Colors = {
  blue: string; blueLight: string; blueDark: string;
  bg: string; bgSecondary: string; surface: string;
  text: string; textSecondary: string; textTertiary: string;
  border: string; borderLight: string;
  red: string; redLight: string;
  green: string; greenLight: string;
  orange: string; orangeLight: string;
  white: string;
};

export const Light: Colors = {
  blue: '#418FDE',
  blueLight: '#EBF3FD',
  blueDark: '#2B6CB0',
  bg: '#FFFFFF',
  bgSecondary: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  red: '#DC2626',
  redLight: '#FEF2F2',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  white: '#FFFFFF',
};

export const Dark: Colors = {
  blue: '#5A9FE8',
  blueLight: '#172030',
  blueDark: '#7AB8F5',
  bg: '#0F1115',
  bgSecondary: '#1A1D23',
  surface: '#1A1D23',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  border: '#2D3139',
  borderLight: '#1F2329',
  red: '#EF4444',
  redLight: '#2D1B1B',
  green: '#22C55E',
  greenLight: '#162318',
  orange: '#F97316',
  orangeLight: '#2D2012',
  white: '#FFFFFF',
};

// Keep static C for backward compat in non-themed code
export const C = Light;

export const Font = Platform.select({
  ios: { mono: 'Menlo' },
  default: { mono: 'monospace' },
})!;

export const S = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const BP = {
  phone: 380,
  tablet: 600,
  tabletLg: 900,
} as const;

export const TAB_H = Platform.select({ ios: 50, android: 80 }) ?? 0;
