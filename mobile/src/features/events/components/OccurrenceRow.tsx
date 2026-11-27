import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { colors, fonts, fontSize, radius } from '@/theme';

import { EVENT_TYPE_ICONS, type OccurrenceItem } from '../types/events.types';
import { daysUntil, formatDate, formatDaysUntil } from '../utils/dates';

interface Props {
  item: OccurrenceItem;
  today: string;
  /** Ẩn nhãn "Còn N ngày" (dùng trong danh sách theo ngày ở Lịch). */
  isBadgeHidden?: boolean;
}

export function openOccurrence(item: OccurrenceItem): void {
  router.push(`/events/${item.eventId}?occurrence=${item.id}`);
}

export function OccurrenceRow({ item, today, isBadgeHidden }: Props) {
  const days = daysUntil(item.date, today);
  const names = item.recipientNames.join(', ');
  const subtitle = [names ? `Cho ${names}` : null, formatDate(item.date)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${subtitle}`}
      onPress={() => openOccurrence(item)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon name={EVENT_TYPE_ICONS[item.eventType]} size={20} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {isBadgeHidden ? (
        <Icon name="chevron-forward" size={18} color={colors.textMuted} />
      ) : (
        <Badge
          label={formatDaysUntil(days)}
          tone={days <= 3 ? 'danger' : days <= 14 ? 'warning' : 'primary'}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
