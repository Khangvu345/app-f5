import type { RecurrenceRule } from '../types/events.types';

import { occurrenceDates } from './occurrences';

const base: RecurrenceRule = {
  calendarType: 'SOLAR',
  day: 15,
  month: 6,
  year: 1990,
  isLeapMonth: false,
  isRecurring: true,
  leapDayPolicy: null,
  endDate: null,
};

describe('occurrenceDates', () => {
  it('repeats a solar event every requested year', () => {
    expect(occurrenceDates(base, [2026, 2027])).toEqual(['2026-06-15', '2027-06-15']);
  });

  it('applies the leap day policy in common years', () => {
    const leap = { ...base, day: 29, month: 2 };
    expect(occurrenceDates({ ...leap, leapDayPolicy: 'FEB28' }, [2025, 2028])).toEqual([
      '2025-02-28',
      '2028-02-29',
    ]);
    expect(occurrenceDates({ ...leap, leapDayPolicy: 'MAR01' }, [2025])).toEqual(['2025-03-01']);
    expect(occurrenceDates({ ...leap, leapDayPolicy: 'SKIP' }, [2025, 2028])).toEqual([
      '2028-02-29',
    ]);
  });

  it('converts lunar events to solar dates', () => {
    const tet = { ...base, calendarType: 'LUNAR' as const, day: 1, month: 1 };
    expect(occurrenceDates(tet, [2025, 2026])).toEqual(['2025-01-29', '2026-02-17']);
  });

  it('maps lunar December onto the matching solar year', () => {
    const lastDay = { ...base, calendarType: 'LUNAR' as const, day: 1, month: 12 };
    expect(occurrenceDates(lastDay, [2024])).toEqual(['2024-01-11', '2024-12-31']);
    expect(occurrenceDates(lastDay, [2025])).toEqual([]);
    expect(occurrenceDates(lastDay, [2026])[0]).toBe('2026-01-19');
  });

  it('falls back to a regular month when the leap month does not exist', () => {
    const rule = { ...base, calendarType: 'LUNAR' as const, day: 1, month: 5, isLeapMonth: true };
    expect(occurrenceDates(rule, [2024])).toEqual(['2024-06-06']);
  });

  it('returns a single date for a one-off event and respects the end date', () => {
    const once = { ...base, isRecurring: false, year: 2026 };
    expect(occurrenceDates(once, [2026, 2027])).toEqual(['2026-06-15']);
    expect(occurrenceDates({ ...base, endDate: '2026-12-31' }, [2026, 2027])).toEqual([
      '2026-06-15',
    ]);
  });
});
