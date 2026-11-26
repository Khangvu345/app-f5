import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, spacing } from '@/theme';

import { Button } from './Button';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Thử lại" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'stretch', gap: spacing.md, padding: spacing.lg },
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.danger,
    textAlign: 'center',
  },
});
