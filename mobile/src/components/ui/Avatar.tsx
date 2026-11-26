import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

interface Props {
  name: string;
  size?: number;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, size = 44 }: Props) {
  return (
    <View
      accessibilityLabel={`Ảnh đại diện của ${name}`}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.text, { fontSize: size >= 60 ? 22 : 15 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.semiBold, color: colors.text },
});
