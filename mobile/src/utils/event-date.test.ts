import { solarOccurrenceDate } from './event-date';

describe('solarOccurrenceDate', () => {
  it('keeps leap day in a leap year', () => {
    expect(solarOccurrenceDate(2028, 2, 29, 'FEB28')).toBe('2028-02-29');
  });

  it('applies the chosen policy in a non-leap year', () => {
    expect(solarOccurrenceDate(2027, 2, 29, 'FEB28')).toBe('2027-02-28');
    expect(solarOccurrenceDate(2027, 2, 29, 'MAR01')).toBe('2027-03-01');
    expect(solarOccurrenceDate(2027, 2, 29, 'SKIP')).toBeNull();
  });

  it('rejects invalid dates and respects century leap years', () => {
    expect(solarOccurrenceDate(2026, 4, 31)).toBeNull();
    expect(solarOccurrenceDate(1900, 2, 29)).toBeNull();
    expect(solarOccurrenceDate(2000, 2, 29)).toBe('2000-02-29');
  });
});
