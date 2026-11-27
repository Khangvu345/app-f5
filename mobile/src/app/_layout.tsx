import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { setUnauthorizedHandler } from '@/services/api/client';
import { useAuthStore } from '@/store/auth.store';
import { colors, spacing } from '@/theme';

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const [hasFonts, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });
  const [hasStartupError, setStartupError] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const start = useCallback(async () => {
    setStartupError(false);
    setIsStarting(true);
    try {
      await useAuthStore.getState().hydrate();
    } catch {
      setStartupError(true);
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((token) => {
      void useAuthStore
        .getState()
        .invalidate(token)
        .catch(() => setStartupError(true));
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void useAuthStore
          .getState()
          .checkExpiry()
          .catch(() => setStartupError(true));
      }
    });
    void useAuthStore
      .getState()
      .hydrate()
      .catch(() => setStartupError(true))
      .finally(() => setIsStarting(false));
    return () => {
      setUnauthorizedHandler(null);
      subscription.remove();
    };
  }, [start]);

  if (hasStartupError || status === 'error') {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>Không thể mở dữ liệu trên thiết bị. Vui lòng thử lại.</Text>
        <Button title="Thử lại" onPress={() => void start()} />
      </View>
    );
  }
  if (isStarting || status === 'loading' || (!hasFonts && !fontError)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isAuthenticated = status === 'authenticated';
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  error: { color: colors.danger, textAlign: 'center' },
});
