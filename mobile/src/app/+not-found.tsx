import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { colors, fontSize, spacing } from '@/theme';

export default function NotFound() {
  return (
    <Screen style={styles.center}>
      <Text style={styles.title}>Không tìm thấy trang</Text>
      <Link href="/" style={styles.link}>
        Về trang chủ
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSize.lg, color: colors.text, fontWeight: '600' },
  link: { color: colors.primary, fontSize: fontSize.md },
});
