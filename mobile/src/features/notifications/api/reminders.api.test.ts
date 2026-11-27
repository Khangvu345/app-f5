import { queryAll, queryFirst } from '@/services/storage/local-db';
import { scheduleReminder } from '@/services/storage/local-storage';
import type { LocalProfile, ReminderScheduler } from '@/types/local-storage';

import { listReminderRules, saveReminderRules } from './reminders.api';

jest.mock('@/services/storage/local-db', () => ({
  newOperationId: (prefix: string) => `${prefix}-test`,
  queryAll: jest.fn(),
  queryFirst: jest.fn(),
  runInTransaction: jest.fn(),
  toLocalId: (value: string) => Number(value),
}));
jest.mock('@/services/storage/local-storage', () => ({
  getTrialUsage: jest.fn(),
  scheduleReminder: jest.fn(),
}));
jest.mock('../store/notification-prefs.store', () => ({
  useNotificationPrefsStore: { getState: () => ({ isPrivate: true }) },
}));

const profile: LocalProfile = { dbName: 'giftmate-profile-1.db', serverUserId: null };
const scheduler: ReminderScheduler = {
  ensureScheduled: jest.fn(),
  cancelScheduled: jest.fn(),
};
const now = new Date(2026, 9, 1, 12, 0);

const mockedAll = jest.mocked(queryAll);
const mockedFirst = jest.mocked(queryFirst);
const mockedSchedule = jest.mocked(scheduleReminder);

beforeEach(() => {
  jest.resetAllMocks();
  mockedFirst.mockResolvedValue({ title: 'Sinh nhật Mẹ' });
});

describe('listReminderRules', () => {
  it('ánh xạ hàng SQLite sang ReminderRule', async () => {
    mockedAll.mockResolvedValue([
      {
        id: '5',
        eventId: '1',
        daysBefore: 7,
        reminderTime: '08:00',
        isEnabled: 1,
        deletedAt: null,
      },
    ]);
    await expect(listReminderRules(profile, '1')).resolves.toEqual([
      { id: '5', eventId: '1', daysBefore: 7, reminderTime: '08:00', isEnabled: true },
    ]);
  });
});

describe('saveReminderRules', () => {
  function setupRows() {
    mockedAll
      .mockResolvedValueOnce([{ id: '9', date: '2026-11-03' }]) // lần diễn ra sắp tới
      .mockResolvedValueOnce([]) // mốc đã có
      .mockResolvedValueOnce([]); // lịch đang hoạt động
  }

  it('tạo mốc mới qua scheduleReminder với INSERT đầu vào reminder_rules và lịch kèm theo', async () => {
    setupRows();
    mockedSchedule.mockResolvedValue('created');
    const result = await saveReminderRules(
      profile,
      '1',
      [{ daysBefore: 7, reminderTime: '08:00', isEnabled: true }],
      { scheduler, now },
    );
    expect(result).toEqual({ outcome: 'saved' });
    const call = mockedSchedule.mock.calls[0][0];
    expect(call.statements[0].sql).toMatch(/^INSERT INTO profile\.reminder_rules/);
    expect(call.statements[0].params).toEqual([1, 7, '08:00', 1]);
    expect(call.statements[1].sql).toMatch(/INSERT INTO profile\.notification_schedules/);
    expect(call.statements[1].params?.slice(0, 4)).toEqual([9, 7, 1, '2026-10-27T08:00']);
    expect(call.request).toMatchObject({ fireAt: '2026-10-27T08:00', daysBefore: 7 });
  });

  it('dừng tạo thêm và báo hết lượt khi scheduleReminder trả limit-reached', async () => {
    setupRows();
    mockedSchedule.mockResolvedValue('limit-reached');
    const result = await saveReminderRules(
      profile,
      '1',
      [
        { daysBefore: 7, reminderTime: '08:00', isEnabled: true },
        { daysBefore: 3, reminderTime: '08:00', isEnabled: true },
      ],
      { scheduler, now },
    );
    expect(result).toEqual({ outcome: 'limit-reached' });
    expect(mockedSchedule).toHaveBeenCalledTimes(1);
  });

  it('báo thiếu quyền khi hệ điều hành từ chối lịch', async () => {
    setupRows();
    mockedSchedule.mockResolvedValue('rejected');
    const result = await saveReminderRules(
      profile,
      '1',
      [{ daysBefore: 7, reminderTime: '08:00', isEnabled: true }],
      { scheduler, now },
    );
    expect(result).toEqual({ outcome: 'permission-denied' });
  });
});
