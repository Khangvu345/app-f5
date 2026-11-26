import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import type { DeleteImpact } from '../types/recipients.types';

interface Props {
  isVisible: boolean;
  name: string;
  impact: DeleteImpact | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteRecipientDialog({
  isVisible,
  name,
  impact,
  isDeleting,
  onCancel,
  onConfirm,
}: Props) {
  const isBlocked = impact !== null && (impact.eventCount > 0 || impact.giftCount > 0);
  const lines: string[] = [];
  if (impact && impact.eventCount > 0) lines.push(`${impact.eventCount} sự kiện`);
  if (impact && impact.giftCount > 0) lines.push(`${impact.giftCount} ý tưởng hoặc bản ghi quà`);

  return (
    <Modal transparent animationType="fade" visible={isVisible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.iconBox}>
            <Icon name="trash-outline" size={24} color={colors.danger} />
          </View>
          <Text style={styles.title}>
            {isBlocked ? `Chưa thể xóa hồ sơ của ${name}` : `Xóa hồ sơ của ${name}?`}
          </Text>
          {isBlocked ? (
            <>
              <Text style={styles.body}>Hồ sơ này vẫn đang được dùng trong:</Text>
              <View style={styles.list}>
                {lines.map((line) => (
                  <Text key={line} style={styles.item}>
                    {line}
                  </Text>
                ))}
              </View>
              <Text style={styles.body}>
                Hãy xóa hoặc chuyển các mục này sang người khác trước, rồi quay lại xóa hồ sơ.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={[styles.button, styles.keep]}
              >
                <Text style={styles.keepLabel}>Đã hiểu</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Hồ sơ, sở thích và ghi chú riêng tư của {name} sẽ bị xóa khỏi danh sách.
              </Text>
              <Text style={styles.warning}>Không thể hoàn tác.</Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancel}
                  style={[styles.button, styles.keep, styles.half]}
                >
                  <Text style={styles.keepLabel}>Giữ lại</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={onConfirm}
                  style={[styles.button, styles.remove, styles.half, isDeleting && styles.dimmed]}
                >
                  <Text style={styles.removeLabel}>Xóa vĩnh viễn</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.overlay,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.screen,
    paddingTop: 22,
    gap: spacing.sm + 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 21,
    color: colors.textMuted,
  },
  list: { paddingLeft: spacing.screen },
  item: { fontFamily: fonts.regular, fontSize: fontSize.base, lineHeight: 21, color: colors.text },
  warning: { fontFamily: fonts.semiBold, fontSize: fontSize.base, color: colors.danger },
  actions: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  half: { flex: 1 },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  keep: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  keepLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  remove: { backgroundColor: colors.danger },
  removeLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.primaryText },
  dimmed: { opacity: 0.6 },
});
