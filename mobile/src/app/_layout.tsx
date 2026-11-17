import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { setUnauthorizedHandler } from '@/services/api/client';
import { useAuthStore } from '@/store/auth.store';

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    // Any 401 from the API signs the user out; the guards below redirect to login.
    setUnauthorizedHandler(() => {
      void useAuthStore.getState().logout();
    });
    void useAuthStore.getState().hydrate();
  }, []);

  if (status === 'loading') {
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
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
