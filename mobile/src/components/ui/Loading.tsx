import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/theme';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export function Loading({
  message = 'Đang tải dữ liệu...',
  fullScreen = false,
  size = 'large',
}: LoadingProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={colors.primary} />

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
