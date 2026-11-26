import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme';

import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** `filled`: nền xanh chủ đạo, `plain`: chỉ có biểu tượng. */
  tone?: 'filled' | 'plain';
}

export function IconButton({ icon, label, onPress, tone = 'plain' }: Props) {
  const isFilled = tone === 'filled';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.base, isFilled && styles.filled, pressed && styles.pressed]}
    >
      <Icon
        name={icon}
        size={isFilled ? 22 : 24}
        color={isFilled ? colors.primaryText : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: colors.primary, borderRadius: radius.lg },
  pressed: { opacity: 0.7 },
});
