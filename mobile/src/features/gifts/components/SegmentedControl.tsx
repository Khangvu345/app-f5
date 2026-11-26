import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Thanh chuyển đoạn nền be, đoạn đang chọn nổi màu trắng (Figma SCR-12, SCR-13). */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={[styles.item, isSelected && styles.itemSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
            {option.count !== undefined ? <Text style={styles.count}>{option.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 2,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  item: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  itemSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.textMuted },
  labelSelected: { fontFamily: fonts.semiBold, color: colors.text },
  count: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
});
