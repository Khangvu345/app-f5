import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/theme';

interface DividerProps {
  color?: string;
  thickness?: number;
  spacingVertical?: number;
  style?: ViewStyle;
}

export function Divider({
  color = colors.border,
  thickness = 1,
  spacingVertical = spacing.sm,
  style,
}: DividerProps) {
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: color,
          height: thickness,
          marginVertical: spacingVertical,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    width: '100%',
  },
});
