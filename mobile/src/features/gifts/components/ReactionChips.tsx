import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, spacing } from '@/theme';

import type { GiftReaction } from '../types/gifts.types';
import { GIFT_REACTION_LABELS, GIFT_REACTIONS } from '../utils/giftStatus';

interface Props {
  value: GiftReaction | null;
  /** Bấm lại lựa chọn đang chọn để bỏ chọn (phản hồi không bắt buộc). */
  onChange: (value: GiftReaction | null) => void;
}

export function ReactionChips({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {GIFT_REACTIONS.map((reaction) => {
        const isSelected = reaction === value;
        return (
          <Pressable
            key={reaction}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(isSelected ? null : reaction)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {GIFT_REACTION_LABELS[reaction]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  label: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.text },
  labelSelected: { fontFamily: fonts.semiBold, color: colors.primaryDark },
});
