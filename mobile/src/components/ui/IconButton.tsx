import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon: Icon,
  onPress,
  size = 44,
  iconSize = 22,
  color = colors.text,
  backgroundColor = colors.surface,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Icon size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
