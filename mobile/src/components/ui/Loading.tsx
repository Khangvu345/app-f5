import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function Loading() {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Đang tải">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
