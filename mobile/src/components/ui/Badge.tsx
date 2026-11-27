import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Tone = 'danger' | 'primary' | 'warning' | 'neutral';

interface Props {
  label: string;
  tone?: Tone;
}

const BACKGROUND: Record<Tone, string> = {
  danger: colors.dangerSoft,
  primary: colors.primarySoft,
  warning: colors.warningSoft,
  neutral: colors.surfaceMuted,
};
const FOREGROUND: Record<Tone, string> = {
  danger: colors.dangerText,
  primary: colors.primaryDark,
  warning: colors.warningText,
  neutral: colors.textMuted,
};

export function Badge({ label, tone = 'danger' }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: BACKGROUND[tone] }]}>
      <Text style={[styles.text, { color: FOREGROUND[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontFamily: fonts.semiBold, fontSize: 12 },
});
