import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

interface Props {
  /** 0-100. */
  percent: number;
  label: string;
  tone?: 'primary' | 'danger';
}

export function ProgressBar({ percent, label, tone = 'primary' }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={styles.track}
    >
      <View
        style={[
          styles.fill,
          { width: `${clamped}%` },
          tone === 'danger' ? styles.danger : styles.primary,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: radius.pill },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
});
