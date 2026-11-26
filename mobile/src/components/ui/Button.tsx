import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: IconName;
}

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.primaryText,
  secondary: colors.primary,
  danger: colors.danger,
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: Props) {
  const isDisabled = disabled || loading;
  const textColor = TEXT_COLOR[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || isDisabled) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.label, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dangerBorder },
  dimmed: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontFamily: fonts.semiBold, fontSize: fontSize.md },
});
