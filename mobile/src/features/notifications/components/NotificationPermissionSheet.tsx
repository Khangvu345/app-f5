import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Icon } from '@/components/ui';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import type { PermissionState } from '../api/notification.permission';

import { Checkbox } from './Checkbox';

interface Props {
  isVisible: boolean;
  eventTitle: string;
  permission: PermissionState;
  isPrivate: boolean;
  isRequesting?: boolean;
  onPrivateChange: (isPrivate: boolean) => void;
  onEnable: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

/** SCR-01d: đề nghị bật thông báo. Khi bị từ chối vĩnh viễn thì hướng dẫn mở cài đặt hệ thống. */
export function NotificationPermissionSheet({
  isVisible,
  eventTitle,
  permission,
  isPrivate,
  isRequesting,
  onPrivateChange,
  onEnable,
  onOpenSettings,
  onDismiss,
}: Props) {
  const isBlocked = permission.status === 'denied' && !permission.canAskAgain;
  return (
    <BottomSheet isVisible={isVisible} onClose={onDismiss}>
      <View style={styles.iconBox}>
        <Icon name="notifications-outline" size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>Bật nhắc nhở cho {eventTitle}?</Text>
      <Text style={styles.body}>
        {isBlocked
          ? 'Thông báo của GiftMate đang bị tắt trong cài đặt điện thoại. Mở Cài đặt, chọn Thông báo rồi bật lại để nhận nhắc nhở.'
          : 'GiftMate sẽ nhắc trước 14, 7, 3, 1 ngày và đúng ngày, chỉ khi việc chuẩn bị chưa xong. Bạn có thể tắt bất cứ lúc nào.'}
      </Text>
      <View style={styles.privacy}>
        <Checkbox
          size={20}
          isChecked={isPrivate}
          onChange={onPrivateChange}
          label="Chế độ riêng tư"
        />
        <View style={styles.privacyText}>
          <Text style={styles.privacyTitle}>Chế độ riêng tư</Text>
          <Text style={styles.privacyHint}>Không hiện tên quà và ghi chú trên màn hình khóa.</Text>
        </View>
      </View>
      <Button
        title={isBlocked ? 'Mở cài đặt' : 'Bật thông báo'}
        loading={isRequesting}
        onPress={isBlocked ? onOpenSettings : onEnable}
      />
      <Text accessibilityRole="button" onPress={onDismiss} style={styles.later}>
        Để sau
      </Text>
      {isBlocked ? null : (
        <Text style={styles.footnote}>Sau khi bấm Bật, điện thoại sẽ hỏi quyền gửi thông báo.</Text>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28.6, color: colors.text },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    lineHeight: 22.5,
    color: colors.textMuted,
  },
  privacy: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  privacyText: { flex: 1, gap: 2 },
  privacyTitle: { fontFamily: fonts.semiBold, fontSize: fontSize.md, color: colors.text },
  privacyHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 18.85,
    color: colors.textMuted,
  },
  later: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
