import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing } from '@/theme';

import type { IconName } from './Icon';
import { IconButton } from './IconButton';

interface Props {
  title: string;
  subtitle?: string;
  /** `large`: tiêu đề to bên trái (màn tab). `bar`: thanh tiêu đề giữa có nút Huỷ/Quay lại. */
  variant?: 'large' | 'bar';
  /** Chỉ cho `bar`: chữ ở bên trái, mặc định là nút quay lại. */
  leftLabel?: string;
  onLeftPress?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  isRightDisabled?: boolean;
  /** Chỉ cho `large`: nút vuông xanh bên phải. */
  actionIcon?: IconName;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function Header({
  title,
  subtitle,
  variant = 'large',
  leftLabel,
  onLeftPress,
  rightLabel,
  onRightPress,
  isRightDisabled,
  actionIcon,
  actionLabel,
  onActionPress,
}: Props) {
  const insets = useSafeAreaInsets();

  if (variant === 'large') {
    return (
      <View style={[styles.large, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.largeText}>
          <Text style={styles.largeTitle}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionIcon && onActionPress ? (
          <IconButton
            tone="filled"
            icon={actionIcon}
            label={actionLabel ?? title}
            onPress={onActionPress}
          />
        ) : null}
      </View>
    );
  }

  const handleLeft = onLeftPress ?? (() => router.back());
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.side}>
        {leftLabel ? (
          <Pressable accessibilityRole="button" onPress={handleLeft} style={styles.textButton}>
            <Text style={styles.leftLabel}>{leftLabel}</Text>
          </Pressable>
        ) : (
          <IconButton icon="chevron-back" label="Quay lại" onPress={handleLeft} />
        )}
      </View>
      <View style={styles.center}>
        <Text numberOfLines={1} style={styles.barTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>
        {rightLabel && onRightPress ? (
          <Pressable
            accessibilityRole="button"
            disabled={isRightDisabled}
            onPress={onRightPress}
            style={styles.textButton}
          >
            <Text style={[styles.rightLabel, isRightDisabled && styles.disabled]}>
              {rightLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  largeText: { flex: 1, gap: 2 },
  largeTitle: { fontFamily: fonts.bold, fontSize: fontSize.xl, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
  side: { width: 76, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  barTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.lg, color: colors.text },
  textButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  leftLabel: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.textMuted },
  rightLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.primary },
  disabled: { opacity: 0.4 },
});
