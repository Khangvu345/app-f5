export const colors = {
  background: '#F6F4F0',
  surface: '#FFFFFF',

  text: '#111827',
  textMuted: '#6B7280',

  primary: '#0E6E66',
  primaryText: '#FFFFFF',

  border: '#E2DED6',
  danger: '#C24E36',
  success: '#16A34A',
  warning: '#D97706',
  info: '#2563EB',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
