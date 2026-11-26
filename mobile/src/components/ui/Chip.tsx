import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSize } from '@/theme';

import { Icon } from './Icon';

type Tone = 'filter' | 'primary' | 'warning' | 'add';

interface Props {
  label: string;
  tone?: Tone;
  isSelected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

function textColorFor(tone: Tone, isSelected: boolean | undefined): string {
  if (tone === 'filter') return isSelected ? colors.primaryText : colors.text;
  if (tone === 'primary') return colors.primaryDark;
  if (tone === 'warning') return colors.warningText;
  return colors.textMuted;
}

export function Chip({ label, tone = 'filter', isSelected, onPress, onRemove }: Props) {
  const textColor = textColorFor(tone, isSelected);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(isSelected) }}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.base,
        tone === 'filter' && styles.filter,
        tone === 'filter' && isSelected && styles.filterSelected,
        tone === 'primary' && styles.primary,
        tone === 'warning' && styles.warning,
        tone === 'add' && styles.add,
      ]}
    >
      <Text style={[styles.label, tone === 'filter' && styles.filterLabel, { color: textColor }]}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Bỏ ${label}`}
          hitSlop={8}
          onPress={onRemove}
        >
          <Icon name="close" size={14} color={textColor} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  label: { fontFamily: fonts.regular, fontSize: fontSize.base },
  filter: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterLabel: { fontFamily: fonts.medium },
  filterSelected: { backgroundColor: colors.text, borderColor: colors.text },
  primary: { backgroundColor: colors.primarySoft },
  warning: { backgroundColor: colors.warningSoft, height: 30, borderRadius: 15 },
  add: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.dashed },
});
