import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/theme';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>Xin chào, {user?.fullName ?? 'bạn'}</Text>
      <Text style={styles.muted}>
        Đây là màn hình khởi đầu. Thêm tính năng của ứng dụng tại đây.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  muted: { fontSize: fontSize.md, color: colors.textMuted },
});
