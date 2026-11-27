import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { JsonValue, ReminderScheduler } from '@/types/local-storage';

import type { ReminderRequest } from '../types/notifications.types';
import { parseFireAt } from '../utils/reminderTime';

export const REMINDER_CHANNEL_ID = 'reminders';

/** Đọc `request` đã lưu trong SQLite; trả null khi sai dạng (từ chối chắc chắn). */
export function parseReminderRequest(value: JsonValue): ReminderRequest | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { eventId, daysBefore, title, body, fireAt } = value;
  if (
    typeof eventId !== 'string' ||
    typeof daysBefore !== 'number' ||
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    (fireAt !== null && typeof fireAt !== 'string')
  ) {
    return null;
  }
  return { eventId, daysBefore, title, body, fireAt };
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Nhắc nhở',
    importance: AndroidImportance.DEFAULT,
  });
}

async function isGranted(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
}

async function findScheduled(identifier: string): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((item) => item.identifier === identifier);
}

/**
 * Adapter lịch nhắc dùng `expo-notifications`. `operationId` chính là identifier của lịch hệ điều hành
 * nên gọi lại sau gián đoạn không tạo trùng.
 */
export const notificationScheduler: ReminderScheduler = {
  async ensureScheduled(operationId, request) {
    const parsed = parseReminderRequest(request);
    if (!parsed) return false;
    // Chỉ lưu mốc: không có thời điểm nhắc ở tương lai thì không cần lịch hệ điều hành.
    const fireAt = parsed.fireAt ? parseFireAt(parsed.fireAt) : null;
    if (parsed.fireAt && !fireAt) return false;
    if (!fireAt || fireAt.getTime() <= Date.now()) return true;

    if (await findScheduled(operationId)) return true;
    // Chưa được cấp quyền: hệ điều hành sẽ không hiện thông báo nên từ chối chắc chắn.
    if (!(await isGranted())) return false;
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: operationId,
      content: {
        title: parsed.title,
        body: parsed.body,
        data: { eventId: parsed.eventId, daysBefore: parsed.daysBefore },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
    return true;
  },

  async cancelScheduled(operationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(operationId);
      return !(await findScheduled(operationId));
    } catch {
      return false;
    }
  },
};

/** Hiện thông báo ngay cả khi ứng dụng đang mở (foreground). Gọi nhiều lần vẫn an toàn. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
