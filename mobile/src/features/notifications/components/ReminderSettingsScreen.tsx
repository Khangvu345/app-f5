import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, ErrorState, Header, Icon, Loading, Screen } from '@/components/ui';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

import { useNotificationPermission } from '../hooks/useNotificationPermission';
import { useReminderSettings } from '../hooks/useReminderSettings';
import { useNotificationPrefsStore } from '../store/notification-prefs.store';
import type { SnoozeOption, SnoozeResult } from '../types/notifications.types';
import { daysLabel, formatDayMonth, formatTimeInput, REMINDER_DAYS } from '../utils/reminderTime';

import { Checkbox } from './Checkbox';
import { DayChip } from './DayChip';
import { NotificationPermissionSheet } from './NotificationPermissionSheet';

const SNOOZE_OPTIONS: { option: SnoozeOption; label: string }[] = [
  { option: 'hour', label: '1 giờ' },
  { option: 'tonight', label: 'Tối nay' },
  { option: 'tomorrow', label: 'Ngày mai' },
];

const SNOOZE_MESSAGES: Record<SnoozeResult, string> = {
  snoozed: 'Đã hoãn lần nhắc kế tiếp.',
  'nothing-to-snooze': 'Không còn lần nhắc nào để hoãn.',
  'permission-denied': 'Hãy bật thông báo để hoãn nhắc nhở.',
  unavailable: 'Chưa hoãn được lúc này, bạn thử lại nhé.',
};

/** SCR-08b: tùy chỉnh các mốc nhắc của một sự kiện (route `/events/[id]/reminders`). */
export function ReminderSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useReminderSettings(id);
  const { permission, request, refresh, openSettings } = useNotificationPermission();
  const isPrivate = useNotificationPrefsStore((state) => state.isPrivate);
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [isRequesting, setRequesting] = useState(false);

  const { status, info } = settings;
  const subtitle = info
    ? [info.title, info.upcoming[0] ? formatDayMonth(info.upcoming[0].date) : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  const handleSave = async () => {
    if (!(await settings.hasPermissionToSave())) {
      await refresh();
      setSheetVisible(true);
      return;
    }
    if (await settings.save()) router.back();
  };

  const handleEnable = async () => {
    setRequesting(true);
    const next = await request();
    setRequesting(false);
    if (next.status === 'granted') {
      setSheetVisible(false);
      if (await settings.save()) router.back();
    }
  };

  return (
    <Screen isFlush edges={['left', 'right', 'bottom']}>
      <Header variant="bar" title="Nhắc nhở" />
      {status === 'loading' ? <Loading /> : null}
      {status === 'error' ? (
        <ErrorState message="Không tải được nhắc nhở của sự kiện." onRetry={settings.reload} />
      ) : null}
      {status === 'ready' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.heading}>
              <Text style={styles.title}>Nhắc nhở</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.masterRow}>
              <Text style={styles.masterLabel}>Bật nhắc cho sự kiện này</Text>
              <Checkbox
                isChecked={settings.isEnabled}
                onChange={settings.setEnabled}
                label="Bật nhắc cho sự kiện này"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Mốc nhắc</Text>
              <View style={styles.chips}>
                {REMINDER_DAYS.map((day) => (
                  <DayChip
                    key={day}
                    label={daysLabel(day)}
                    isSelected={settings.days.includes(day)}
                    disabled={!settings.isEnabled}
                    onPress={() => settings.toggleDay(day)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.sectionLabel}>Giờ nhắc</Text>
              <TextInput
                accessibilityLabel="Giờ nhắc"
                keyboardType="number-pad"
                maxLength={5}
                value={settings.time}
                editable={settings.isEnabled}
                onChangeText={(text) => settings.setTime(formatTimeInput(text))}
                placeholder="08:00"
                placeholderTextColor={colors.placeholder}
                style={[
                  styles.timeInput,
                  !settings.isTimeValid && styles.timeInputError,
                  !settings.isEnabled && styles.dimmed,
                ]}
              />
            </View>
            {settings.isTimeValid ? null : (
              <Text style={styles.error}>Nhập giờ theo dạng 24 giờ, ví dụ 08:00.</Text>
            )}

            {settings.nextDays !== null ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Hoãn lần nhắc kế tiếp (
                  {settings.nextDays === 0 ? 'đúng ngày' : `${settings.nextDays} ngày trước`})
                </Text>
                <View style={styles.snoozeRow}>
                  {SNOOZE_OPTIONS.map(({ option, label }) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => void settings.snooze(option)}
                      style={styles.snoozeButton}
                    >
                      <Text style={styles.snoozeLabel}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {settings.snoozeResult ? (
                  <Text style={styles.hint}>{SNOOZE_MESSAGES[settings.snoozeResult]}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Icon name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.infoText}>
                Khi quà đã được đánh dấu “Đã mua”, các lần nhắc chọn quà sẽ tự dừng.
              </Text>
            </View>

            {settings.isTrialExhausted || settings.notice === 'limit-reached' ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>
                  Bạn đã dùng hết lượt nhắc nhở của bản dùng thử (tối đa 3 mốc). Đăng nhập để thêm
                  mốc nhắc không giới hạn.
                </Text>
                <Button
                  title="Đăng nhập"
                  variant="secondary"
                  onPress={() => router.push('/(auth)/login')}
                />
              </View>
            ) : null}
            {settings.notice === 'error' ? (
              <Text style={styles.error}>Không lưu được nhắc nhở. Vui lòng thử lại.</Text>
            ) : null}
            {settings.notice === 'permission-denied' ? (
              <Text style={styles.error}>Chưa bật thông báo nên chưa đặt được lịch nhắc.</Text>
            ) : null}

            <Button
              title="Lưu"
              loading={settings.isSaving}
              disabled={!settings.isTimeValid}
              onPress={() => void handleSave()}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      <NotificationPermissionSheet
        isVisible={isSheetVisible}
        eventTitle={info?.title ?? ''}
        permission={permission}
        isPrivate={isPrivate}
        isRequesting={isRequesting}
        onPrivateChange={(value) => void useNotificationPrefsStore.getState().setPrivate(value)}
        onEnable={() => void handleEnable()}
        onOpenSettings={() => void openSettings()}
        onDismiss={() => setSheetVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.md, paddingBottom: spacing.xl },
  heading: { gap: 4 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSize.base, color: colors.textMuted },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 57,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  masterLabel: { fontFamily: fonts.medium, fontSize: fontSize.md, color: colors.text },
  section: { gap: spacing.sm + 2 },
  sectionLabel: { fontFamily: fonts.semiBold, fontSize: fontSize.sm, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeInput: {
    width: 132,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  timeInputError: { borderColor: colors.danger },
  dimmed: { opacity: 0.5 },
  snoozeRow: { flexDirection: 'row', gap: spacing.sm },
  snoozeButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  snoozeLabel: { fontFamily: fonts.medium, fontSize: fontSize.base, color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 4 },
  infoText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 19.5,
    color: colors.textMuted,
  },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.danger },
  banner: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  bannerText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.warningText,
  },
});
