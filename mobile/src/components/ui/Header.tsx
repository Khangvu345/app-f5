import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '@/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  style?: ViewStyle;
}

export function Header({ title, showBack = false, onBack, rightAction, style }: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      ) : null}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 32,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 36,
    color: colors.text,
    lineHeight: 40,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
