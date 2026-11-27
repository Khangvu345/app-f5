import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSize } from '@/theme';

interface Props {
  label: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Chip chọn mốc nhắc theo Figma SCR-08b: chọn = nền xanh nhạt, viền xanh, chữ xanh đậm. */
export function DayChip({ label, isSelected, disabled, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, isSelected && styles.selected, disabled && styles.disabled]}
    >
      <Text style={[styles.label, isSelected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.text },
  selectedLabel: { fontFamily: fonts.semiBold, color: colors.primaryDark },
});
