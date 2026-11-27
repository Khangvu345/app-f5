const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface YmdParts {
  year: number;
  month: number;
  day: number;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function parseYmd(value: string): YmdParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Ngày không hợp lệ: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Ngày hiện tại theo múi giờ Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè). */
export function todayVn(now: Date = new Date()): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidYmd(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function toUtcDay(value: string): number {
  const { year, month, day } = parseYmd(value);
  return Date.UTC(year, month - 1, day);
}

/** Số ngày từ `from` đến `to` (âm nếu `to` ở trước `from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / DAY_MS);
}

export function addDays(value: string, amount: number): string {
  return new Date(toUtcDay(value) + amount * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Chủ nhật. */
export function weekdayOf(value: string): number {
  return new Date(toUtcDay(value)).getUTCDay();
}

export function weekdayName(value: string): string {
  return WEEKDAYS[weekdayOf(value)];
}

/** "Thứ Sáu, 27 tháng 11". */
export function formatDayLabel(value: string): string {
  const { month, day } = parseYmd(value);
  return `${weekdayName(value)}, ${day} tháng ${month}`;
}

/** "27/11/2026". */
export function formatDate(value: string): string {
  const { year, month, day } = parseYmd(value);
  return `${pad(day)}/${pad(month)}/${year}`;
}

/** Số ngày còn lại tính từ hôm nay đến ngày diễn ra. */
export function daysUntil(date: string, today: string = todayVn()): number {
  return daysBetween(today, date);
}

/** "Hôm nay", "Ngày mai", "Còn 5 ngày", "Đã qua 2 ngày". */
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Ngày mai';
  if (days > 1) return `Còn ${days} ngày`;
  return `Đã qua ${-days} ngày`;
}
