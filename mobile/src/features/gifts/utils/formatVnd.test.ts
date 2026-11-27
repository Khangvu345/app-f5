import {
  formatEstimateFromX100,
  formatVnd,
  formatVndFromX100,
  formatVndInput,
  parseVndInput,
} from './formatVnd';

describe('formatVnd', () => {
  it('groups thousands with dots and appends the dong sign', () => {
    expect(formatVnd(0)).toBe('0đ');
    expect(formatVnd(950)).toBe('950đ');
    expect(formatVnd(750000)).toBe('750.000đ');
    expect(formatVnd(1000000)).toBe('1.000.000đ');
  });

  it('converts amounts stored times 100', () => {
    expect(formatVndFromX100(82000000)).toBe('820.000đ');
    expect(formatEstimateFromX100(75000000)).toBe('~750.000đ');
  });
});

describe('VND input helpers', () => {
  it('formats digits while typing and drops other characters', () => {
    expect(formatVndInput('1234567')).toBe('1.234.567');
    expect(formatVndInput('12a.3b')).toBe('123');
    expect(formatVndInput('007')).toBe('7');
    expect(formatVndInput('')).toBe('');
  });

  it('parses the formatted text back to a number', () => {
    expect(parseVndInput('820.000')).toBe(820000);
    expect(parseVndInput('  ')).toBeNull();
    expect(parseVndInput('99999999999999')).toBeNull();
  });
});
