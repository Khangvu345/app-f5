import { daysInMonth, formatYmd, weekdayOf } from './dates';

/** Lưới tháng, tuần bắt đầu từ Thứ Hai. Ô ngoài tháng là `null`. */
export function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstWeekday = (weekdayOf(formatYmd(year, month, 1)) + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    cells.push(formatYmd(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
