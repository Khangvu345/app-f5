import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui';
import { colors } from '@/theme';

interface Props {
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
  label: string;
  size?: number;
}

export function Checkbox({ isChecked, onChange, label, size = 22 }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isChecked }}
      hitSlop={8}
      onPress={() => onChange(!isChecked)}
    >
      <View
        style={[
          styles.box,
          { width: size, height: size },
          isChecked ? styles.checked : styles.unchecked,
        ]}
      >
        {isChecked ? <Icon name="checkmark" size={size - 6} color={colors.primaryText} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.primary },
  unchecked: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
});
