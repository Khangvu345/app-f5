import type { JsonValue } from '@/types/local-storage';

export type ReminderDays = 14 | 7 | 3 | 1 | 0;

export interface ReminderRule {
  id: string;
  eventId: string;
  daysBefore: ReminderDays;
  /** 'HH:mm' theo giờ địa phương. */
  reminderTime: string;
  isEnabled: boolean;
}

export interface ReminderRuleInput {
  daysBefore: ReminderDays;
  reminderTime: string;
  isEnabled: boolean;
}

/** Một lần diễn ra sắp tới của sự kiện (ngày dương lịch `YYYY-MM-DD`). */
export interface UpcomingOccurrence {
  id: string;
  date: string;
}

export interface ReminderEventInfo {
  eventId: string;
  title: string;
  upcoming: UpcomingOccurrence[];
}

/**
 * Dữ liệu JSON đủ để đặt lại lịch hệ điều hành sau gián đoạn (`ReminderWrite.request`).
 * `fireAt` là giờ địa phương `YYYY-MM-DDTHH:mm`; null nghĩa là chỉ lưu mốc, chưa có lịch.
 * Có chữ ký chỉ mục để gán được cho `JsonValue`.
 */
export interface ReminderRequest {
  [key: string]: JsonValue;
  eventId: string;
  daysBefore: number;
  title: string;
  body: string;
  fireAt: string | null;
}

export type SaveRemindersOutcome = 'saved' | 'limit-reached' | 'permission-denied';

export interface SaveRemindersResult {
  outcome: SaveRemindersOutcome;
}

export type SnoozeOption = 'hour' | 'tonight' | 'tomorrow';

export type SnoozeResult = 'snoozed' | 'nothing-to-snooze' | 'permission-denied' | 'unavailable';

export type NotificationPermission = 'unknown' | 'granted' | 'denied' | 'undetermined';
