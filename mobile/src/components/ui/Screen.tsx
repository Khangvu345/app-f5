import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  /** Bỏ padding mặc định khi màn hình tự quản lý bố cục (header, danh sách...). */
  isFlush?: boolean;
  edges?: readonly Edge[];
}

export function Screen({ children, style, isFlush, edges }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, isFlush ? null : styles.padded, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.lg },
});
