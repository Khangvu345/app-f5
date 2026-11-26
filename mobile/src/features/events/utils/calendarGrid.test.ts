import { buildMonthGrid, shiftMonth } from './calendarGrid';

describe('calendar grid', () => {
  it('starts weeks on Monday and pads with nulls', () => {
    const weeks = buildMonthGrid(2026, 11);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[weeks.length - 1][0]).toBe('2026-11-30');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('handles leap February', () => {
    expect(buildMonthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
  });

  it('moves across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
