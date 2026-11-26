import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { getTrialUsage } from '@/services/storage/local-storage';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/theme';
import type { TrialKind } from '@/types/local-storage';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
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

  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>Xin chào, {user?.displayName ?? 'bạn'}</Text>
      <Text style={styles.muted}>Dữ liệu của bạn được lưu trên thiết bị này.</Text>
      {!user && usage ? (
        <>
          <Text style={styles.subtitle}>Lượt dùng thử đã sử dụng</Text>
          <Text style={styles.muted}>Người nhận: {usage.recipient}/2</Text>
          <Text style={styles.muted}>Sự kiện: {usage.event}/3</Text>
          <Text style={styles.muted}>Mốc nhắc: {usage.reminder}/3</Text>
          <Text style={styles.muted}>Ý tưởng quà: {usage.idea}/5</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  muted: { fontSize: fontSize.md, color: colors.textMuted },
});
