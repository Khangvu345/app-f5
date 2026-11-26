import {
  addDays,
  daysBetween,
  daysUntil,
  formatDate,
  formatDayLabel,
  formatDaysUntil,
  isValidYmd,
  todayVn,
} from './dates';

describe('dates', () => {
  it('uses the Ho Chi Minh calendar day', () => {
    expect(todayVn(new Date('2026-11-26T18:30:00Z'))).toBe('2026-11-27');
    expect(todayVn(new Date('2026-11-26T16:59:00Z'))).toBe('2026-11-26');
  });

  it('counts days across month and year boundaries', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysUntil('2026-11-25', '2026-11-27')).toBe(-2);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('formats labels', () => {
    expect(formatDaysUntil(0)).toBe('Hôm nay');
    expect(formatDaysUntil(1)).toBe('Ngày mai');
    expect(formatDaysUntil(12)).toBe('Còn 12 ngày');
    expect(formatDaysUntil(-3)).toBe('Đã qua 3 ngày');
    expect(formatDate('2026-03-05')).toBe('05/03/2026');
    expect(formatDayLabel('2026-11-27')).toBe('Thứ Sáu, 27 tháng 11');
  });

  it('validates calendar days', () => {
    expect(isValidYmd(2025, 2, 29)).toBe(false);
    expect(isValidYmd(2024, 2, 29)).toBe(true);
  });
});
