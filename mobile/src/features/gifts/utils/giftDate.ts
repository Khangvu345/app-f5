const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Ngày hôm nay theo múi giờ Asia/Ho_Chi_Minh (UTC+7), dạng YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** "2026-11-03" -> "03/11/2026" */
export function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** "2026-11-03" -> "3/11" */
export function isoToShort(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(day)}/${Number(month)}`;
}

/** "3/11/2026" hoặc "03/11/2026" -> "2026-11-03"; ngày không hợp lệ -> null. */
export function displayToIso(text: string): string | null {
  const match = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  return isValid ? `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}` : null;
}

/** "Sinh nhật 3/11" */
export function formatOccasion(title: string | null, date: string | null): string | null {
  if (!title) return null;
  return date ? `${title} ${isoToShort(date)}` : title;
}
