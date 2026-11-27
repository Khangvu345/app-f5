import { displayToIso, formatOccasion, isoToDisplay, isoToShort, todayIso } from './giftDate';

describe('gift dates', () => {
  it('uses the Vietnam calendar day instead of UTC', () => {
    expect(todayIso(new Date('2026-11-02T18:30:00Z'))).toBe('2026-11-03');
    expect(todayIso(new Date('2026-11-03T16:59:00Z'))).toBe('2026-11-03');
  });

  it('converts between ISO and display formats', () => {
    expect(isoToDisplay('2026-11-03')).toBe('03/11/2026');
    expect(isoToShort('2026-11-03')).toBe('3/11');
    expect(displayToIso('3/11/2026')).toBe('2026-11-03');
  });

  it('rejects impossible dates', () => {
    expect(displayToIso('31/02/2026')).toBeNull();
    expect(displayToIso('2026-11-03')).toBeNull();
    expect(displayToIso('29/02/2028')).toBe('2028-02-29');
  });

  it('formats an occasion label', () => {
    expect(formatOccasion('Sinh nhật', '2026-11-03')).toBe('Sinh nhật 3/11');
    expect(formatOccasion(null, '2026-11-03')).toBeNull();
  });
});
