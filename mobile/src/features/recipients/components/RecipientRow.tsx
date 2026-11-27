import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { RELATIONSHIP_LABELS, type RecipientListItem } from '../types/recipients.types';
import { badgeLabel } from '../utils/recipientDates';

interface Props {
  item: RecipientListItem;
  isFirst: boolean;
  isLast: boolean;
}

export function RecipientRow({ item, isFirst, isLast }: Props) {
  const occasion = item.nextOccasion;
  const badge = occasion ? badgeLabel(occasion.daysUntil) : null;
  const subtitle = `${RELATIONSHIP_LABELS[item.relationship]} · ${occasion?.label ?? 'Chưa có ngày'}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${subtitle}`}
      onPress={() => router.push(`/recipients/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        isFirst && styles.first,
        isLast ? styles.last : styles.inner,
        pressed && styles.pressed,
      ]}
    >
      <Avatar name={item.name} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {badge ? <Badge label={badge} /> : null}
      <Icon name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 69,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSoft,
  },
  first: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  last: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  inner: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: spacing.xs - 1 },
  name: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
