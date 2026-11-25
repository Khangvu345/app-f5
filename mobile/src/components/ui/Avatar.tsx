import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight } from '@/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name = '', size = 48 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <Text style={styles.initial}>{initial || '?'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  initial: {
    color: colors.primaryText,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
