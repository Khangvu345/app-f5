// Design tokens lấy từ Figma "GiftMate – Mobile UI".
export const colors = {
  background: '#F6F4F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EFECE6',
  text: '#1C1B19',
  textMuted: '#57534E',
  placeholder: '#6B665F',
  primary: '#0E6E66',
  primaryDark: '#0A524C',
  primarySoft: '#DCEFEC',
  primaryText: '#FFFFFF',
  border: '#D4CFC6',
  borderSoft: '#E2DED6',
  divider: '#EFECE6',
  dashed: '#A8A29A',
  danger: '#B42318',
  dangerBorder: '#F1C9C4',
  dangerSoft: '#FBE9E4',
  dangerText: '#A53D28',
  warningSoft: '#FDF1DC',
  warningText: '#8A4B08',
  overlay: 'rgba(28, 27, 25, 0.45)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, screen: 20 } as const;
export const radius = { sm: 8, md: 12, lg: 14, xl: 18, pill: 999 } as const;
export const fontSize = { xs: 11, sm: 13, base: 14, md: 15, lg: 17, xl: 24, title: 28 } as const;

export const fonts = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semiBold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
} as const;
