import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  optionalText?: string;
  isRequired?: boolean;
  placeholder?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  optionalText,
  isRequired,
  placeholder = 'Không chọn',
}: Props<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isRequired ? <Text style={styles.required}> *</Text> : null}
        {optionalText ? <Text style={styles.optional}> {optionalText}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setIsOpen(true)}
        style={styles.input}
      >
        <Text style={styles.value}>{selected?.label ?? placeholder}</Text>
        <Icon name="chevron-down" size={16} color={colors.text} />
      </Pressable>
      <BottomSheet isVisible={isOpen} title={label} onClose={() => setIsOpen(false)}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: option.value === value }}
            onPress={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            style={styles.option}
          >
            <Text style={[styles.optionText, option.value === value && styles.optionSelected]}>
              {option.label}
            </Text>
            {option.value === value ? (
              <Icon name="checkmark" size={20} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm - 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  required: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.danger },
  optional: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  input: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
  },
  value: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { fontFamily: fonts.regular, fontSize: fontSize.md, color: colors.text },
  optionSelected: { fontFamily: fonts.semiBold, color: colors.primary },
});
