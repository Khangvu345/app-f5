import {
  badgeLabel,
  daysBetween,
  formatMoney,
  nextBirthdayIso,
  pickNextOccasion,
  todayIso,
} from './recipientDates';

describe('recipientDates', () => {
  it('formats the local date without UTC shifting', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('counts days across a month boundary', () => {
    expect(daysBetween('2026-10-28', '2026-11-03')).toBe(6);
  });

  it('rolls a passed birthday to next year', () => {
    expect(nextBirthdayIso(3, 11, '2026-11-27')).toBe('2027-11-03');
    expect(nextBirthdayIso(27, 11, '2026-11-27')).toBe('2026-11-27');
  });

  it('moves 29/2 to 1/3 in a non-leap year', () => {
    expect(nextBirthdayIso(29, 2, '2027-01-10')).toBe('2027-03-01');
  });

  it('picks the earlier of event occurrence and birthday', () => {
    const result = pickNextOccasion('2026-10-28', { date: '2026-11-15', title: 'Kỷ niệm' }, 3, 11);
    expect(result).toEqual({ label: 'Sinh nhật 3/11', date: '2026-11-03', daysUntil: 6 });
  });

  it('returns null without any date', () => {
    expect(pickNextOccasion('2026-10-28', null, null, null)).toBeNull();
  });

  it('shows a badge only for near occasions', () => {
    expect(badgeLabel(6)).toBe('6 ngày');
    expect(badgeLabel(0)).toBe('Hôm nay');
    expect(badgeLabel(18)).toBeNull();
  });

  it('formats money stored x100', () => {
    expect(formatMoney(45000000)).toBe('450.000đ');
  });
});
