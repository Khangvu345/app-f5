export type LeapDayPolicy = 'FEB28' | 'MAR01' | 'SKIP';

/** Returns a Gregorian calendar date without relying on the device time zone. */
export function solarOccurrenceDate(
  year: number,
  month: number,
  day: number,
  leapDayPolicy: LeapDayPolicy = 'SKIP',
): string | null {
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && day === 29 && !isLeapYear) {
    if (leapDayPolicy === 'SKIP') return null;
    return leapDayPolicy === 'FEB28'
      ? `${String(year).padStart(4, '0')}-02-28`
      : `${String(year).padStart(4, '0')}-03-01`;
  }
  if (day > daysInMonth[month - 1]) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
