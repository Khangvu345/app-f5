import type { NextOccasion } from '../types/recipients.types';

const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Ngày hiện tại theo giờ thiết bị, dạng YYYY-MM-DD (không cắt từ UTC). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtcDay(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcDay(toIso) - toUtcDay(fromIso)) / MS_PER_DAY);
}

/** Sinh nhật gần nhất không sớm hơn `today`. 29/2 năm không nhuận lùi sang 1/3. */
export function nextBirthdayIso(day: number, month: number, today: string): string {
  const year = Number(today.slice(0, 4));
  for (const candidateYear of [year, year + 1]) {
    const date = new Date(Date.UTC(candidateYear, month - 1, day));
    const iso = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    if (iso >= today) return iso;
  }
  return today;
}

export function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${day}/${month}`;
}

export interface UpcomingOccurrence {
  date: string;
  title: string;
}

/** Chọn dịp gần nhất giữa dịp sắp tới trong sự kiện và sinh nhật. */
export function pickNextOccasion(
  today: string,
  occurrence: UpcomingOccurrence | null,
  birthDay: number | null,
  birthMonth: number | null,
): NextOccasion | null {
  const candidates: NextOccasion[] = [];
  if (occurrence) {
    candidates.push({
      label: `${occurrence.title} ${formatDayMonth(occurrence.date)}`,
      date: occurrence.date,
      daysUntil: daysBetween(today, occurrence.date),
    });
  }
  if (birthDay !== null && birthMonth !== null) {
    const date = nextBirthdayIso(birthDay, birthMonth, today);
    candidates.push({
      label: `Sinh nhật ${formatDayMonth(date)}`,
      date,
      daysUntil: daysBetween(today, date),
    });
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((best, item) => (item.date < best.date ? item : best));
}

/** Nhãn badge cho dịp sắp tới; null nếu còn xa. */
export function badgeLabel(daysUntil: number, thresholdDays = 14): string | null {
  if (daysUntil < 0 || daysUntil > thresholdDays) return null;
  return daysUntil === 0 ? 'Hôm nay' : `${daysUntil} ngày`;
}

/** Tách ngày tặng thành `3/11` và năm để hiển thị hai dòng. */
export function splitGivenDate(iso: string | null): { dayMonth: string; year: string } | null {
  if (!iso) return null;
  return { dayMonth: formatDayMonth(iso), year: iso.slice(0, 4) };
}

/** Số tiền đã lưu dạng ×100 → `1.000.000đ`. */
export function formatMoney(amountX100: number): string {
  const whole = Math.round(amountX100 / 100);
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
