import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, fonts, fontSize, spacing } from '@/theme';

import type { GivenGift } from '../types/recipients.types';
import { formatMoney, splitGivenDate } from '../utils/recipientDates';

interface Props {
  gifts: readonly GivenGift[];
}

function describe(gift: GivenGift): string {
  const parts: string[] = [];
  if (gift.occasion) parts.push(gift.occasion);
  if (gift.amount !== null) parts.push(formatMoney(gift.amount));
  if (gift.note?.trim()) parts.push(`“${gift.note.trim()}”`);
  return parts.join(' · ');
}

export function GiftHistoryList({ gifts }: Props) {
  return (
    <Card>
      {gifts.map((gift, index) => {
        const date = splitGivenDate(gift.givenOn);
        const detail = describe(gift);
        return (
          <View key={gift.id} style={[styles.row, index < gifts.length - 1 && styles.separator]}>
            <View style={styles.date}>
              <Text style={styles.dateText}>{date?.dayMonth ?? ''}</Text>
              <Text style={styles.dateText}>{date?.year ?? ''}</Text>
            </View>
            <View style={styles.text}>
              <Text numberOfLines={1} style={styles.name}>
                {gift.name}
              </Text>
              {detail ? (
                <Text numberOfLines={1} style={styles.detail}>
                  {detail}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md - 2 - 0,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separator: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  date: { width: 54 },
  dateText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15.6, color: colors.textMuted },
  text: { flex: 1, gap: spacing.xs },
  name: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  detail: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
