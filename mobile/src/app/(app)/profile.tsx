import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { getTrialUsage } from '@/services/storage/local-storage';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, spacing } from '@/theme';
import type { TrialKind } from '@/types/local-storage';
import { toApiError } from '@/utils/api-error';

const USAGE_ROWS: readonly { kind: TrialKind; label: string; limit: number }[] = [
  { kind: 'recipient', label: 'Người nhận', limit: 2 },
  { kind: 'event', label: 'Sự kiện', limit: 3 },
  { kind: 'reminder', label: 'Mốc nhắc', limit: 3 },
  { kind: 'idea', label: 'Ý tưởng quà', limit: 5 },
];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isPendingLink = useAuthStore((state) => state.pendingLink);
  const retryLink = useAuthStore((state) => state.retryLink);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<TrialKind, number> | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (!user) {
        void getTrialUsage()
          .then((value) => {
            if (isActive) setUsage(value);
          })
          .catch(() => {
            if (isActive) setUsage(null);
          });
      }
      return () => {
        isActive = false;
      };
    }, [user]),
  );

  const handleRetry = async () => {
    setError(null);
    try {
      await retryLink();
    } catch (e) {
      setError(toApiError(e).message);
    }
  };

  return (
    <Screen isFlush edges={['left', 'right']}>
      <Header variant="bar" title="Cá nhân" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Avatar name={user?.displayName ?? 'Khách'} size={64} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{user?.displayName ?? 'Khách'}</Text>
            <Text style={styles.muted}>
              {user ? `${user.planType} · ${user.email ?? ''}` : 'Dùng thử trên máy'}
            </Text>
          </View>
        </View>
        <Text style={styles.muted}>Dữ liệu của bạn được lưu trên thiết bị này.</Text>
        {!user && usage ? (
          <Card>
            <Text style={styles.cardTitle}>Lượt dùng thử đã sử dụng</Text>
            {USAGE_ROWS.map((row) => (
              <View key={row.kind}>
                <Divider />
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>{row.label}</Text>
                  <Text style={styles.usageValue}>
                    {usage[row.kind]}/{row.limit}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
        {isPendingLink ? (
          <View style={styles.actions}>
            <Button title="Thử nhập lại dữ liệu" onPress={() => void handleRetry()} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Hủy phiên chờ" variant="secondary" onPress={() => void logout()} />
          </View>
        ) : null}
        {user ? (
          <Button title="Đăng xuất" variant="secondary" onPress={() => void logout()} />
        ) : (
          <Link href="/(auth)/login" style={styles.link}>
            Đăng nhập hoặc đăng ký
          </Link>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screen, gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.textMuted },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
  actions: { gap: spacing.sm },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
    padding: spacing.md,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  usageLabel: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text },
  usageValue: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.textMuted },
  link: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.primary },
});
