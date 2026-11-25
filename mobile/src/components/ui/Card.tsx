import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

interface CardProps extends ViewProps {
  padding?: number;
  bordered?: boolean;
}

export function Card({
  children,
  padding = spacing.md,
  bordered = true,
  style,
  ...viewProps
}: CardProps) {
  return (
    <View style={[styles.card, { padding }, bordered && styles.bordered, style]} {...viewProps}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
