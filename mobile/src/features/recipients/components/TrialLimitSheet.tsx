import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { colors, fonts, fontSize } from '@/theme';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

/** Thông báo khi khách dùng hết lượt tạo người nhận. */
export function TrialLimitSheet({ isVisible, onClose }: Props) {
  function handleLogin() {
    onClose();
    router.push('/(auth)/login');
  }

  return (
    <BottomSheet isVisible={isVisible} title="Bạn đã hết lượt dùng thử" onClose={onClose}>
      <Text style={styles.message}>
        Chế độ dùng thử chỉ cho tạo tối đa 2 người nhận. Hãy đăng nhập để thêm không giới hạn và giữ
        dữ liệu của bạn.
      </Text>
      <Button title="Đăng nhập" onPress={handleLogin} />
      <Button title="Để sau" variant="secondary" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
