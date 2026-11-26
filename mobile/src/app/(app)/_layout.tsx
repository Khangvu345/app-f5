import { Stack } from 'expo-router';

import { useReminderReconcile } from '@/features/notifications/hooks/useReminderReconcile';
import { colors } from '@/theme';

export default function AppLayout() {
  useReminderReconcile();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
