import type { RecurrenceRule } from '../types/events.types';

import { daysInMonth, formatYmd, isLeapYear, parseYmd } from './dates';
import { lunarToSolar, solarToLunar } from './lunar';

function solarDateInYear(rule: RecurrenceRule, year: number): string | null {
  if (rule.month === 2 && rule.day === 29 && !isLeapYear(year)) {
    const policy = rule.leapDayPolicy ?? 'FEB28';
    if (policy === 'SKIP') return null;
    return policy === 'MAR01' ? formatYmd(year, 3, 1) : formatYmd(year, 2, 28);
  }
  if (rule.day > daysInMonth(year, rule.month)) return null;
  return formatYmd(year, rule.month, rule.day);
}

/** Đổi ngày âm lịch của năm âm `lunarYear` sang dương lịch. Tháng thiếu thì lùi về ngày 29. */
function lunarDateInYear(rule: RecurrenceRule, lunarYear: number): string | null {
  const solar =
    lunarToSolar(rule.day, rule.month, lunarYear, rule.isLeapMonth) ??
    (rule.isLeapMonth ? lunarToSolar(rule.day, rule.month, lunarYear, false) : null);
  if (!solar) return null;
  if (rule.day === 30) {
    const back = solarToLunar(solar.day, solar.month, solar.year);
    if (back.day !== 30 || back.month !== rule.month) {
      const fallback = lunarToSolar(29, rule.month, lunarYear, back.isLeap);
      return fallback ? formatYmd(fallback.year, fallback.month, fallback.day) : null;
    }
  }
  return formatYmd(solar.year, solar.month, solar.day);
}

/** Các ngày dương lịch rơi vào năm dương `year` theo quy tắc lặp hàng năm. */
export function occurrenceDatesInYear(rule: RecurrenceRule, year: number): string[] {
  const dates: string[] = [];
  if (rule.calendarType === 'SOLAR') {
    const date = solarDateInYear(rule, year);
    if (date) dates.push(date);
  } else {
    for (const lunarYear of [year - 1, year]) {
      const date = lunarDateInYear(rule, lunarYear);
      if (date && parseYmd(date).year === year && !dates.includes(date)) dates.push(date);
    }
  }
  return dates.filter((date) => !rule.endDate || date <= rule.endDate);
}

/** Ngày của sự kiện không lặp (cần năm gốc). */
export function singleOccurrenceDate(rule: RecurrenceRule): string | null {
  if (rule.year === null) return null;
  if (rule.calendarType === 'SOLAR') return formatYmd(rule.year, rule.month, rule.day);
  return lunarDateInYear(rule, rule.year);
}

/**
 * Danh sách ngày dương lịch cần có cho các năm đã cho:
 * sự kiện lặp hàng năm sinh theo từng năm, sự kiện không lặp chỉ có một ngày.
 */
export function occurrenceDates(rule: RecurrenceRule, years: readonly number[]): string[] {
  if (!rule.isRecurring) {
    const single = singleOccurrenceDate(rule);
    return single ? [single] : [];
  }
  const dates = years.flatMap((year) => occurrenceDatesInYear(rule, year));
  return [...new Set(dates)].sort();
}
