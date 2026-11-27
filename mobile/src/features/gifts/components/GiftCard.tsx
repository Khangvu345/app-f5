import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, Icon } from '@/components/ui';
import { colors, fonts, fontSize, spacing } from '@/theme';

import type { Gift } from '../types/gifts.types';
import { formatEstimateFromX100, formatVndFromX100 } from '../utils/formatVnd';
import { formatOccasion } from '../utils/giftDate';
import { getNextStatuses, GIFT_STATUS_LABELS } from '../utils/giftStatus';

interface Props {
  gift: Gift;
  onPress: () => void;
  onChangeStatus: () => void;
}

export function GiftCard({ gift, onPress, onChangeStatus }: Props) {
  const occasion = formatOccasion(gift.occasionTitle, gift.occasionDate);
  const subtitle = occasion ? `${gift.recipientName} · ${occasion}` : gift.recipientName;
  const isEstimate = gift.actualAmountX100 === null;
  const amountX100 = gift.actualAmountX100 ?? gift.estimatedAmountX100;
  const canChange = getNextStatuses(gift.status).length > 0;
  const sourceLabel = gift.source === 'AI' ? 'Lưu từ gợi ý AI' : 'Tự thêm';

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${gift.name}, ${subtitle}`}
        onPress={onPress}
        style={styles.top}
      >
        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={styles.name}>
            {gift.name}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
        {amountX100 !== null ? (
          <View style={styles.priceBlock}>
            <Text style={styles.price}>
              {isEstimate ? formatEstimateFromX100(amountX100) : formatVndFromX100(amountX100)}
            </Text>
            <Text style={styles.subtitleSmall}>{isEstimate ? 'Ước tính' : 'Thực tế'}</Text>
          </View>
        ) : null}
      </Pressable>
      <View style={styles.footer}>
        <View style={styles.sourceRow}>
          <Text style={styles.subtitleSmall}>{sourceLabel}</Text>
          {gift.status === 'RETURNED' ? (
            <Badge label={GIFT_STATUS_LABELS.RETURNED} tone="warning" />
          ) : null}
        </View>
        {canChange ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chuyển trạng thái ${gift.name}`}
            onPress={onChangeStatus}
            style={styles.action}
          >
            <Text style={styles.actionLabel}>Chuyển trạng thái</Text>
            <Icon name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: spacing.sm,
  },
  titleBlock: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  priceBlock: { alignItems: 'flex-end', gap: 2 },
  price: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  subtitleSmall: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 43,
    marginHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 36 },
  actionLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.base, color: colors.primary },
});
