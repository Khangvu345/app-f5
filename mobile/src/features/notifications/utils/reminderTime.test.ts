import type { UpcomingOccurrence } from '../types/notifications.types';

import {
  buildReminderContent,
  computeReminderDate,
  computeSnoozeDate,
  formatDayMonth,
  formatFireAt,
  formatTimeInput,
  isValidReminderTime,
  parseFireAt,
  pickUpcomingOccurrence,
} from './reminderTime';

describe('computeReminderDate', () => {
  it('trừ daysBefore và đặt giờ địa phương', () => {
    const date = computeReminderDate('2026-11-03', 3, '08:00');
    expect(date).not.toBeNull();
    expect(formatFireAt(date as Date)).toBe('2026-10-31T08:00');
  });

  it('đúng ngày giữ nguyên ngày diễn ra', () => {
    expect(formatFireAt(computeReminderDate('2026-11-03', 0, '09:30') as Date)).toBe(
      '2026-11-03T09:30',
    );
  });

  it('lùi qua đầu năm và năm nhuận', () => {
    expect(formatFireAt(computeReminderDate('2027-01-05', 14, '08:00') as Date)).toBe(
      '2026-12-22T08:00',
    );
    expect(formatFireAt(computeReminderDate('2028-03-01', 1, '08:00') as Date)).toBe(
      '2028-02-29T08:00',
    );
  });

  it('trả null khi dữ liệu sai', () => {
    expect(computeReminderDate('03/11/2026', 1, '08:00')).toBeNull();
    expect(computeReminderDate('2026-11-03', 1, '25:00')).toBeNull();
  });
});

describe('fireAt', () => {
  it('khứ hồi theo giờ địa phương', () => {
    const date = parseFireAt('2026-10-31T08:05');
    expect(date?.getHours()).toBe(8);
    expect(date?.getMinutes()).toBe(5);
    expect(formatFireAt(date as Date)).toBe('2026-10-31T08:05');
    expect(parseFireAt('2026-10-31')).toBeNull();
  });
});

describe('pickUpcomingOccurrence', () => {
  const occurrences: UpcomingOccurrence[] = [
    { id: '2', date: '2027-11-03' },
    { id: '1', date: '2026-11-03' },
  ];

  it('chọn lần diễn ra gần nhất còn nhắc được', () => {
    const now = new Date(2026, 9, 1, 12, 0);
    expect(pickUpcomingOccurrence(occurrences, 7, '08:00', now)?.occurrence.id).toBe('1');
  });

  it('bỏ qua lần đã quá giờ nhắc và chuyển sang năm sau', () => {
    const now = new Date(2026, 9, 30, 12, 0);
    expect(pickUpcomingOccurrence(occurrences, 7, '08:00', now)?.occurrence.id).toBe('2');
  });

  it('trả null khi không còn lần nào', () => {
    expect(pickUpcomingOccurrence([], 1, '08:00', new Date())).toBeNull();
  });
});

describe('computeSnoozeDate', () => {
  const now = new Date(2026, 9, 27, 10, 15);

  it('1 giờ sau', () => {
    expect(formatFireAt(computeSnoozeDate('hour', now, '08:00') as Date)).toBe('2026-10-27T11:15');
  });

  it('tối nay 20:00, null khi đã qua', () => {
    expect(formatFireAt(computeSnoozeDate('tonight', now, '08:00') as Date)).toBe(
      '2026-10-27T20:00',
    );
    expect(computeSnoozeDate('tonight', new Date(2026, 9, 27, 21, 0), '08:00')).toBeNull();
  });

  it('ngày mai theo giờ nhắc', () => {
    expect(formatFireAt(computeSnoozeDate('tomorrow', now, '08:00') as Date)).toBe(
      '2026-10-28T08:00',
    );
  });
});

describe('định dạng', () => {
  it('kiểm tra giờ HH:mm', () => {
    expect(isValidReminderTime('08:00')).toBe(true);
    expect(isValidReminderTime('8:00')).toBe(false);
    expect(isValidReminderTime('24:00')).toBe(false);
  });

  it('ngày/tháng', () => {
    expect(formatDayMonth('2026-11-03')).toBe('3/11');
  });

  it('nội dung thông báo và chế độ riêng tư', () => {
    expect(buildReminderContent('Sinh nhật Mẹ', 7, false).title).toBe(
      'Còn 7 ngày tới Sinh nhật Mẹ',
    );
    expect(buildReminderContent('Sinh nhật Mẹ', 0, false).title).toBe('Hôm nay là Sinh nhật Mẹ');
    const hidden = buildReminderContent('Sinh nhật Mẹ', 7, true);
    expect(hidden.title).toBe('Sắp đến một dịp đặc biệt');
    expect(hidden.body).not.toContain('Mẹ');
  });
});

describe('formatTimeInput', () => {
  it('chèn dấu hai chấm và giới hạn 4 chữ số', () => {
    expect(formatTimeInput('0')).toBe('0');
    expect(formatTimeInput('0830')).toBe('08:30');
    expect(formatTimeInput('08:3a0999')).toBe('08:30');
  });
});
