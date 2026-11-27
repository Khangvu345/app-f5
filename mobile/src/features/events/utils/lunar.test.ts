import { lunarToSolar, solarToLunar } from './lunar';

describe('lunar conversion', () => {
  it('maps Tet to the right solar dates', () => {
    expect(lunarToSolar(1, 1, 2024, false)).toEqual({ day: 10, month: 2, year: 2024 });
    expect(lunarToSolar(1, 1, 2025, false)).toEqual({ day: 29, month: 1, year: 2025 });
    expect(lunarToSolar(1, 1, 2026, false)).toEqual({ day: 17, month: 2, year: 2026 });
  });

  it('maps Mid-Autumn 2024', () => {
    expect(lunarToSolar(15, 8, 2024, false)).toEqual({ day: 17, month: 9, year: 2024 });
  });

  it('converts a solar date to lunar', () => {
    expect(solarToLunar(10, 2, 2024)).toEqual({ day: 1, month: 1, year: 2024, isLeap: false });
    expect(solarToLunar(31, 12, 2024)).toEqual({ day: 1, month: 12, year: 2024, isLeap: false });
  });

  it('handles leap months', () => {
    expect(lunarToSolar(1, 2, 2023, true)).toEqual({ day: 22, month: 3, year: 2023 });
    expect(solarToLunar(22, 3, 2023)).toEqual({ day: 1, month: 2, year: 2023, isLeap: true });
    expect(lunarToSolar(1, 6, 2025, true)).toEqual({ day: 25, month: 7, year: 2025 });
    expect(lunarToSolar(1, 5, 2024, true)).toBeNull();
  });

  it('round-trips every day of 2024 and 2025', () => {
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [1, 15, 28]) {
        const lunar = solarToLunar(day, month, 2024);
        expect(lunarToSolar(lunar.day, lunar.month, lunar.year, lunar.isLeap)).toEqual({
          day,
          month,
          year: 2024,
        });
      }
    }
  });
});
