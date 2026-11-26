import { StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { colors, fonts, fontSize } from '@/theme';

import type { DeleteScope } from '../api/events.api';

interface Props {
  isVisible: boolean;
  title: string;
  isRecurring: boolean;
  /** Có lần diễn ra cụ thể để xóa riêng lần đó. */
  hasOccurrence: boolean;
  isBusy: boolean;
  onDelete: (scope: DeleteScope) => void;
  onClose: () => void;
}

/** Hộp thoại xác nhận xóa mềm sự kiện (riêng sự kiện lặp có thêm lựa chọn "chỉ lần này"). */
export function DeleteEventSheet({
  isVisible,
  title,
  isRecurring,
  hasOccurrence,
  isBusy,
  onDelete,
  onClose,
}: Props) {
  const isChoice = isRecurring && hasOccurrence;
  return (
    <BottomSheet
      isVisible={isVisible}
      title={isRecurring ? 'Xóa sự kiện lặp?' : 'Xóa sự kiện?'}
      onClose={onClose}
    >
      <Text style={styles.message}>
        {isChoice
          ? `"${title}" lặp lại hằng năm. Bạn muốn xóa riêng lần này hay toàn bộ chuỗi sự kiện?`
          : `"${title}" sẽ bị xóa cùng các lần diễn ra và nhắc nhở của nó. Quà đã lưu vẫn được giữ lại.`}
      </Text>
      {isChoice ? (
        <Button
          title="Chỉ xóa lần này"
          variant="secondary"
          loading={isBusy}
          onPress={() => onDelete('THIS')}
        />
      ) : null}
      <Button
        title={isChoice ? 'Xóa cả chuỗi sự kiện' : 'Xóa sự kiện'}
        variant="danger"
        loading={isBusy}
        onPress={() => onDelete('ALL')}
      />
      <Button title="Hủy" variant="secondary" disabled={isBusy} onPress={onClose} />
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
