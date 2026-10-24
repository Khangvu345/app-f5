import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/theme';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <Screen style={styles.container}>
      <Text style={styles.name}>{user?.fullName}</Text>
      <Text style={styles.muted}>{user?.email}</Text>
      <Button title="Đăng xuất" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  muted: { fontSize: fontSize.md, color: colors.textMuted },
});
