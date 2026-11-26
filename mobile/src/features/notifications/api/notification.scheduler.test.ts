import * as Notifications from 'expo-notifications';

import { notificationScheduler, parseReminderRequest } from './notification.scheduler';

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mocked = jest.mocked(Notifications);

function request(fireAt: string | null) {
  return { eventId: '1', daysBefore: 7, title: 'Còn 7 ngày', body: 'Nội dung', fireAt };
}

function futureFireAt(): string {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T08:00`;
}

beforeEach(() => {
  jest.resetAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
  mocked.scheduleNotificationAsync.mockResolvedValue('op-1');
  mocked.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

describe('parseReminderRequest', () => {
  it('nhận dữ liệu đúng dạng và từ chối dữ liệu sai', () => {
    expect(parseReminderRequest(request(null))).toEqual(request(null));
    expect(parseReminderRequest({ eventId: 1 })).toBeNull();
    expect(parseReminderRequest('x')).toBeNull();
  });
});

describe('ensureScheduled', () => {
  it('đặt lịch với identifier = operationId', async () => {
    await expect(
      notificationScheduler.ensureScheduled('op-1', request(futureFireAt())),
    ).resolves.toBe(true);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync.mock.calls[0][0].identifier).toBe('op-1');
  });

  it('idempotent: đã có lịch cùng identifier thì không tạo lại', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'op-1' } as never]);
    await expect(
      notificationScheduler.ensureScheduled('op-1', request(futureFireAt())),
    ).resolves.toBe(true);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('chưa cấp quyền thì từ chối chắc chắn', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(
      notificationScheduler.ensureScheduled('op-1', request(futureFireAt())),
    ).resolves.toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('không có thời điểm nhắc tương lai thì chỉ lưu mốc', async () => {
    await expect(notificationScheduler.ensureScheduled('op-1', request(null))).resolves.toBe(true);
    await expect(
      notificationScheduler.ensureScheduled('op-2', request('2020-01-01T08:00')),
    ).resolves.toBe(true);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('request sai dạng bị từ chối, lỗi hệ điều hành được ném ra', async () => {
    await expect(notificationScheduler.ensureScheduled('op-1', { a: 1 })).resolves.toBe(false);
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('os'));
    await expect(
      notificationScheduler.ensureScheduled('op-1', request(futureFireAt())),
    ).rejects.toThrow('os');
  });
});

describe('cancelScheduled', () => {
  it('true khi lịch đã vắng mặt', async () => {
    await expect(notificationScheduler.cancelScheduled('op-1')).resolves.toBe(true);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('op-1');
  });

  it('false khi vẫn còn lịch hoặc hủy lỗi', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'op-1' } as never]);
    await expect(notificationScheduler.cancelScheduled('op-1')).resolves.toBe(false);
    mocked.cancelScheduledNotificationAsync.mockRejectedValue(new Error('os'));
    await expect(notificationScheduler.cancelScheduled('op-1')).resolves.toBe(false);
  });
});
