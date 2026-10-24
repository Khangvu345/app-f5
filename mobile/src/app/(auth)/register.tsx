import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/theme';
import { toApiError } from '@/utils/api-error';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password });
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.form} behavior="padding">
        <Text style={styles.title}>Tạo tài khoản</Text>
        <TextField label="Họ và tên" value={fullName} onChangeText={setFullName} />
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
          autoComplete="new-password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Đăng ký" onPress={onSubmit} loading={isLoading} />
        <View style={styles.footer}>
          <Text style={styles.muted}>Đã có tài khoản? </Text>
          <Link href="/login" style={styles.link}>
            Đăng nhập
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
