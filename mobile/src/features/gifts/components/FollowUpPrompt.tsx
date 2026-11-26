import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Icon } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { useFollowUpPrompt } from '../hooks/useFollowUpPrompt';
import { formatVndFromX100 } from '../utils/formatVnd';
import { isoToShort } from '../utils/giftDate';
import { GIFT_STATUS_LABELS } from '../utils/giftStatus';

/**
 * Hộp thoại "Bạn đã tặng món quà nào?" sau một dịp đã qua (SCR-13b).
 * Màn hình nào muốn nhắc (Trang chủ, Bộ sưu tập) chỉ cần render component này.
 */
export function FollowUpPrompt() {
  const profile = useAuthStore((s) => s.profile);
  const { gift, snooze, dismiss } = useFollowUpPrompt(profile);

  if (!gift) return null;

  const occasion = gift.occasionTitle
    ? `${gift.occasionTitle} ${gift.recipientName}${gift.occasionDate ? ` · ${isoToShort(gift.occasionDate)} đã qua` : ''}`
    : gift.recipientName;
  const amountX100 = gift.actualAmountX100 ?? gift.estimatedAmountX100;
  const status = `Trạng thái: ${GIFT_STATUS_LABELS[gift.status]}${
    amountX100 !== null ? ` · ${formatVndFromX100(amountX100)}` : ''
  }`;

  function handleGivenThis() {
    const target = gift;
    void snooze();
    if (target) router.push({ pathname: '/gifts/given', params: { giftId: target.id } });
  }

  function handleGivenOther() {
    const target = gift;
    void snooze();
    if (target) {
      router.push({
        pathname: '/gifts/given',
        params: {
          recipientId: target.recipientId,
          ...(target.occurrenceId ? { occurrenceId: target.occurrenceId } : {}),
        },
      });
    }
  }

  return (
    <BottomSheet isVisible onClose={() => void snooze()}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{occasion}</Text>
        <Text style={styles.title}>Bạn đã tặng món quà nào?</Text>
      </View>
      <View style={styles.giftRow}>
        <View style={styles.giftIcon}>
          <Icon name="gift-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.giftText}>
          <Text numberOfLines={1} style={styles.giftName}>
            {gift.name}
          </Text>
          <Text numberOfLines={1} style={styles.giftStatus}>
            {status}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Đã tặng món này" onPress={handleGivenThis} />
        <Pressable accessibilityRole="button" onPress={handleGivenOther} style={styles.outline}>
          <Text style={styles.outlineLabel}>Tôi đã tặng món khác</Text>
        </Pressable>
      </View>
      <View style={styles.links}>
        <Pressable accessibilityRole="button" onPress={() => void dismiss()} style={styles.link}>
          <Text style={styles.linkPrimary}>Năm nay không tặng</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void snooze()} style={styles.link}>
          <Text style={styles.linkMuted}>Để sau</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  eyebrow: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.textMuted },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg + 2,
  },
  giftIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftText: { flex: 1, gap: 2 },
  giftName: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  giftStatus: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  actions: { gap: spacing.sm + 2 },
  outline: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  outlineLabel: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text },
  links: { flexDirection: 'row' },
  link: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkPrimary: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.primary },
  linkMuted: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.textMuted },
});
