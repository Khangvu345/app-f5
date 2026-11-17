import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/theme';
import { toApiError } from '@/utils/api-error';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      // On success the root layout guard redirects to the app group.
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.form} behavior="padding">
        <Text style={styles.title}>Đăng nhập</Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Đăng nhập" onPress={onSubmit} loading={isLoading} />
        <View style={styles.footer}>
          <Text style={styles.muted}>Chưa có tài khoản? </Text>
          <Link href="/register" style={styles.link}>
            Đăng ký
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
});
