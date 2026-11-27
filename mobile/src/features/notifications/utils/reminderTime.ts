import type {
  ReminderDays,
  ReminderRequest,
  SnoozeOption,
  UpcomingOccurrence,
} from '../types/notifications.types';

export const REMINDER_DAYS: readonly ReminderDays[] = [14, 7, 3, 1, 0];
export const DEFAULT_REMINDER_TIME = '08:00';
export const SNOOZE_TONIGHT_HOUR = 20;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FIRE_AT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidReminderTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Thời điểm nhắc = ngày diễn ra − daysBefore, tại giờ địa phương `reminderTime`. */
export function computeReminderDate(
  occurrenceDate: string,
  daysBefore: number,
  reminderTime: string,
): Date | null {
  const date = DATE_PATTERN.exec(occurrenceDate);
  const time = TIME_PATTERN.exec(reminderTime);
  if (!date || !time) return null;
  const result = new Date(
    Number(date[1]),
    Number(date[2]) - 1,
    Number(date[3]) - daysBefore,
    Number(time[1]),
    Number(time[2]),
    0,
    0,
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

export function formatFireAt(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function parseFireAt(value: string): Date | null {
  const match = FIRE_AT_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface UpcomingReminder {
  occurrence: UpcomingOccurrence;
  fireAt: Date;
}

/** Lần diễn ra đầu tiên mà thời điểm nhắc vẫn còn ở tương lai. */
export function pickUpcomingOccurrence(
  occurrences: readonly UpcomingOccurrence[],
  daysBefore: number,
  reminderTime: string,
  now: Date,
): UpcomingReminder | null {
  const sorted = [...occurrences].sort((a, b) => a.date.localeCompare(b.date));
  for (const occurrence of sorted) {
    const fireAt = computeReminderDate(occurrence.date, daysBefore, reminderTime);
    if (fireAt && fireAt.getTime() > now.getTime()) return { occurrence, fireAt };
  }
  return null;
}

export function computeSnoozeDate(
  option: SnoozeOption,
  now: Date,
  reminderTime: string,
): Date | null {
  if (option === 'hour') return new Date(now.getTime() + 60 * 60 * 1000);
  if (option === 'tonight') {
    const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), SNOOZE_TONIGHT_HOUR);
    return tonight.getTime() > now.getTime() ? tonight : null;
  }
  const time = TIME_PATTERN.exec(reminderTime);
  if (!time) return null;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    Number(time[1]),
    Number(time[2]),
  );
}

export function formatDayMonth(date: string): string {
  const match = DATE_PATTERN.exec(date);
  return match ? `${Number(match[3])}/${Number(match[2])}` : date;
}

export function daysLabel(daysBefore: number): string {
  return daysBefore === 0 ? 'Đúng ngày' : `${daysBefore} ngày`;
}

/** Nội dung thông báo theo Figma; chế độ riêng tư ẩn tên dịp. */
export function buildReminderContent(
  eventTitle: string,
  daysBefore: number,
  isPrivate: boolean,
): Pick<ReminderRequest, 'title' | 'body'> {
  if (isPrivate) {
    return { title: 'Sắp đến một dịp đặc biệt', body: 'Mở GiftMate để xem chi tiết.' };
  }
  const title =
    daysBefore === 0
      ? `Hôm nay là ${eventTitle}`
      : daysBefore === 1
        ? `Ngày mai là ${eventTitle}`
        : `Còn ${daysBefore} ngày tới ${eventTitle}`;
  return { title, body: 'Chọn quà ngay để kịp chuẩn bị?' };
}

/** Chuẩn hóa chữ người dùng gõ vào ô giờ thành dạng `HH:mm` (tối đa 4 chữ số). */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}
