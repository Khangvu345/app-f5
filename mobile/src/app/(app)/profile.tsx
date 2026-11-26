import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/theme';
import { toApiError } from '@/utils/api-error';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isPendingLink = useAuthStore((state) => state.pendingLink);
  const retryLink = useAuthStore((state) => state.retryLink);
  const [error, setError] = useState<string | null>(null);
  const handleRetry = async () => {
    setError(null);
    try {
      await retryLink();
    } catch (e) {
      setError(toApiError(e).message);
    }
  };
  return (
    <Screen style={styles.container}>
      <Text style={styles.name}>{user?.displayName ?? 'Khách'}</Text>
      <Text style={styles.muted}>
        {user ? `${user.planType} · ${user.email ?? ''}` : 'Dùng thử trên máy'}
      </Text>
      {isPendingLink ? (
        <>
          <Button title="Thử nhập lại dữ liệu" onPress={() => void handleRetry()} />
          {error ? <Text style={styles.muted}>{error}</Text> : null}
          <Button title="Hủy phiên chờ" variant="secondary" onPress={() => void logout()} />
        </>
      ) : null}
      {user ? (
        <Button title="Đăng xuất" variant="secondary" onPress={() => void logout()} />
      ) : (
        <Link href="/(auth)/login">Đăng nhập hoặc đăng ký</Link>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.md },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  muted: { fontSize: fontSize.md, color: colors.textMuted },
});
