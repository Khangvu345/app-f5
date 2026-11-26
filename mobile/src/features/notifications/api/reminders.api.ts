import {
  newOperationId,
  queryAll,
  queryFirst,
  runInTransaction,
  toLocalId,
} from '@/services/storage/local-db';
import { getTrialUsage, scheduleReminder } from '@/services/storage/local-storage';
import type { LocalProfile, ReminderScheduler } from '@/types/local-storage';

import { useNotificationPrefsStore } from '../store/notification-prefs.store';
import type {
  ReminderDays,
  ReminderEventInfo,
  ReminderRequest,
  ReminderRule,
  ReminderRuleInput,
  SaveRemindersResult,
  SnoozeOption,
  SnoozeResult,
  UpcomingOccurrence,
} from '../types/notifications.types';
import {
  buildReminderContent,
  computeSnoozeDate,
  DEFAULT_REMINDER_TIME,
  formatFireAt,
  pickUpcomingOccurrence,
  toDateKey,
} from '../utils/reminderTime';

import { notificationScheduler } from './notification.scheduler';

/** Hạn mức mốc nhắc của khách; phải khớp `LIMITS.reminder` trong `local-storage.ts`. */
export const TRIAL_REMINDER_LIMIT = 3;
/** Thứ tự tạo mốc mặc định: khách (còn ít lượt) được các mốc gần ngày nhất trước. */
export const DEFAULT_REMINDER_DAYS: readonly ReminderDays[] = [7, 3, 1, 0, 14];
const UPCOMING_LIMIT = 4;

export interface ReminderApiOptions {
  isPrivate?: boolean;
  scheduler?: ReminderScheduler;
  now?: Date;
}

interface RuleRow {
  id: string;
  eventId: string;
  daysBefore: ReminderDays;
  reminderTime: string;
  isEnabled: number;
  deletedAt: string | null;
}

interface ScheduleRow {
  occurrenceId: string;
  daysBefore: number;
  notificationId: string | null;
  scheduledAt: string;
}

const RULE_SELECT = `SELECT CAST(local_id AS TEXT) AS id, CAST(event_id AS TEXT) AS eventId,
    days_before AS daysBefore, reminder_time AS reminderTime, enabled AS isEnabled,
    deleted_at AS deletedAt
  FROM reminder_rules WHERE event_id = ?`;

const ACTIVE_SCHEDULE_SELECT = `SELECT CAST(occurrence_id AS TEXT) AS occurrenceId,
    days_before AS daysBefore, local_notification_id AS notificationId, scheduled_at AS scheduledAt
  FROM notification_schedules
  WHERE event_id = ? AND status IN ('SCHEDULED', 'CANCEL_PENDING')`;

function toRule(row: RuleRow): ReminderRule {
  return {
    id: row.id,
    eventId: row.eventId,
    daysBefore: row.daysBefore,
    reminderTime: row.reminderTime,
    isEnabled: row.isEnabled === 1,
  };
}

export async function listReminderRules(
  profile: LocalProfile,
  eventId: string,
): Promise<ReminderRule[]> {
  const rows = await queryAll<RuleRow>(
    profile,
    `${RULE_SELECT} AND deleted_at IS NULL ORDER BY days_before DESC`,
    [toLocalId(eventId)],
  );
  return rows.map(toRule);
}

/** Các mốc từng được tạo cho dịp (kể cả đã xóa mềm): chọn lại những mốc này không tốn lượt dùng thử. */
export async function listKnownReminderDays(
  profile: LocalProfile,
  eventId: string,
): Promise<ReminderDays[]> {
  const rows = await queryAll<RuleRow>(profile, RULE_SELECT, [toLocalId(eventId)]);
  return rows.map((row) => row.daysBefore);
}

/** Tiêu đề dịp và các lần diễn ra sắp tới (null nếu dịp đã bị xóa hoặc không tồn tại). */
export async function getReminderEventInfo(
  profile: LocalProfile,
  eventId: string,
  now: Date = new Date(),
): Promise<ReminderEventInfo | null> {
  const event = await queryFirst<{ title: string }>(
    profile,
    'SELECT title FROM events WHERE local_id = ? AND deleted_at IS NULL',
    [toLocalId(eventId)],
  );
  if (!event) return null;
  const upcoming = await queryAll<UpcomingOccurrence>(
    profile,
    `SELECT CAST(local_id AS TEXT) AS id, local_date AS date FROM event_occurrences
     WHERE event_id = ? AND deleted_at IS NULL AND status IN ('PLANNED', 'PREPARING', 'ACTIVE')
       AND local_date >= ? ORDER BY local_date LIMIT ${UPCOMING_LIMIT}`,
    [toLocalId(eventId), toDateKey(now)],
  );
  return { eventId, title: event.title, upcoming };
}

/** Số mốc nhắc mới khách còn tạo được; null nghĩa là không giới hạn (hồ sơ tài khoản). */
export async function getReminderTrialRemaining(profile: LocalProfile): Promise<number | null> {
  if (profile.serverUserId !== null) return null;
  const usage = await getTrialUsage();
  return Math.max(0, TRIAL_REMINDER_LIMIT - usage.reminder);
}

interface SaveContext {
  profile: LocalProfile;
  info: ReminderEventInfo;
  scheduler: ReminderScheduler;
  isPrivate: boolean;
  now: Date;
}

function buildRequest(
  context: SaveContext,
  daysBefore: number,
  fireAt: Date | null,
): ReminderRequest {
  return {
    eventId: context.info.eventId,
    daysBefore,
    fireAt: fireAt ? formatFireAt(fireAt) : null,
    ...buildReminderContent(context.info.title, daysBefore, context.isPrivate),
  };
}

const upsertScheduleSql = (table: string): string => `INSERT INTO ${table}
    (occurrence_id, days_before, event_id, scheduled_at, local_notification_id, status)
  VALUES (?, ?, ?, ?, ?, 'SCHEDULED')
  ON CONFLICT(occurrence_id, days_before) DO UPDATE SET
    scheduled_at = excluded.scheduled_at,
    local_notification_id = excluded.local_notification_id,
    status = 'SCHEDULED'`;
const UPSERT_SCHEDULE_SQL = upsertScheduleSql('notification_schedules');
const CREATE_SCHEDULE_SQL = upsertScheduleSql('profile.notification_schedules');

/** Hủy lịch hệ điều hành của một mốc. Ném lỗi nếu chưa chắc đã hủy (giữ CANCEL_PENDING để thử lại). */
async function cancelSchedules(
  context: SaveContext,
  eventId: string,
  schedules: ScheduleRow[],
): Promise<void> {
  let hasUnconfirmed = false;
  for (const schedule of schedules) {
    const isCancelled = schedule.notificationId
      ? await context.scheduler.cancelScheduled(schedule.notificationId)
      : true;
    if (!isCancelled) hasUnconfirmed = true;
    await runInTransaction(context.profile, async (db) => {
      await db.runAsync(
        `UPDATE notification_schedules
         SET status = ?, local_notification_id = CASE WHEN ? THEN NULL ELSE local_notification_id END
         WHERE event_id = ? AND occurrence_id = ? AND days_before = ?`,
        isCancelled ? 'CANCELLED' : 'CANCEL_PENDING',
        isCancelled ? 1 : 0,
        toLocalId(eventId),
        toLocalId(schedule.occurrenceId),
        schedule.daysBefore,
      );
    });
  }
  if (hasUnconfirmed) throw new Error('Chưa hủy được lịch nhắc cũ, vui lòng thử lại');
}

async function removeRule(
  context: SaveContext,
  rule: RuleRow,
  schedules: ScheduleRow[],
): Promise<void> {
  await cancelSchedules(
    context,
    rule.eventId,
    schedules.filter((item) => item.daysBefore === rule.daysBefore),
  );
  await runInTransaction(context.profile, async (db) => {
    await db.runAsync(
      "UPDATE reminder_rules SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE local_id = ?",
      toLocalId(rule.id),
    );
  });
}

/** Sửa/bật/tắt/khôi phục một mốc đã có: cập nhật SQLite và đặt lại lịch hệ điều hành. */
async function updateRule(
  context: SaveContext,
  rule: RuleRow,
  input: ReminderRuleInput,
  schedules: ScheduleRow[],
): Promise<boolean> {
  await cancelSchedules(
    context,
    rule.eventId,
    schedules.filter((item) => item.daysBefore === rule.daysBefore),
  );
  const pick = input.isEnabled
    ? pickUpcomingOccurrence(
        context.info.upcoming,
        input.daysBefore,
        input.reminderTime,
        context.now,
      )
    : null;
  let notificationId: string | null = null;
  let isDenied = false;
  if (pick) {
    const operationId = newOperationId('rem');
    const isAccepted = await context.scheduler.ensureScheduled(
      operationId,
      buildRequest(context, input.daysBefore, pick.fireAt),
    );
    if (isAccepted) notificationId = operationId;
    else isDenied = true;
  }
  try {
    await runInTransaction(context.profile, async (db) => {
      await db.runAsync(
        'UPDATE reminder_rules SET reminder_time = ?, enabled = ?, deleted_at = NULL WHERE local_id = ?',
        input.reminderTime,
        input.isEnabled ? 1 : 0,
        toLocalId(rule.id),
      );
      if (pick && notificationId) {
        await db.runAsync(
          UPSERT_SCHEDULE_SQL,
          toLocalId(pick.occurrence.id),
          input.daysBefore,
          toLocalId(rule.eventId),
          formatFireAt(pick.fireAt),
          notificationId,
        );
      }
    });
  } catch (error) {
    if (notificationId) await context.scheduler.cancelScheduled(notificationId);
    throw error;
  }
  return !isDenied;
}

type CreateOutcome = 'created' | 'limit-reached' | 'rejected';

/** Tạo mốc mới qua `scheduleReminder` để áp hạn mức dùng thử và lịch hệ điều hành idempotent. */
async function createRule(context: SaveContext, input: ReminderRuleInput): Promise<CreateOutcome> {
  const pick = input.isEnabled
    ? pickUpcomingOccurrence(
        context.info.upcoming,
        input.daysBefore,
        input.reminderTime,
        context.now,
      )
    : null;
  const operationId = newOperationId('rem');
  const eventId = toLocalId(context.info.eventId);
  const statements = [
    {
      sql: 'INSERT INTO profile.reminder_rules (event_id, days_before, reminder_time, enabled) VALUES (?, ?, ?, ?)',
      params: [eventId, input.daysBefore, input.reminderTime, input.isEnabled ? 1 : 0],
    },
  ];
  if (pick) {
    statements.push({
      sql: CREATE_SCHEDULE_SQL,
      params: [
        toLocalId(pick.occurrence.id),
        input.daysBefore,
        eventId,
        formatFireAt(pick.fireAt),
        operationId,
      ],
    });
  }
  const result = await scheduleReminder(
    {
      profile: context.profile,
      operationId,
      request: buildRequest(context, input.daysBefore, pick?.fireAt ?? null),
      statements,
    },
    context.scheduler,
  );
  if (result === 'limit-reached' || result === 'rejected') return result;
  return 'created';
}

/**
 * Lưu trạng thái mong muốn của các mốc nhắc: mốc có trong `rules` được tạo/sửa, mốc không có bị xóa mềm.
 * Mốc đã từng tạo (kể cả đã xóa mềm) được khôi phục, không tốn thêm lượt dùng thử.
 */
export async function saveReminderRules(
  profile: LocalProfile,
  eventId: string,
  rules: readonly ReminderRuleInput[],
  options: ReminderApiOptions = {},
): Promise<SaveRemindersResult> {
  const now = options.now ?? new Date();
  const info = await getReminderEventInfo(profile, eventId, now);
  if (!info) throw new Error('Không tìm thấy sự kiện');
  const context: SaveContext = {
    profile,
    info,
    scheduler: options.scheduler ?? notificationScheduler,
    isPrivate: options.isPrivate ?? useNotificationPrefsStore.getState().isPrivate,
    now,
  };
  const existing = await queryAll<RuleRow>(profile, RULE_SELECT, [toLocalId(eventId)]);
  const schedules = await queryAll<ScheduleRow>(profile, ACTIVE_SCHEDULE_SELECT, [
    toLocalId(eventId),
  ]);
  const byDays = new Map(existing.map((row) => [row.daysBefore, row]));
  const desired = new Map(rules.map((rule) => [rule.daysBefore, rule]));
  let isDenied = false;
  let isLimited = false;

  for (const row of existing) {
    if (row.deletedAt === null && !desired.has(row.daysBefore)) {
      await removeRule(context, row, schedules);
    }
  }
  for (const input of desired.values()) {
    const row = byDays.get(input.daysBefore);
    if (!row) continue;
    const hasSchedule = schedules.some(
      (item) => item.daysBefore === input.daysBefore && item.notificationId !== null,
    );
    const isUnchanged =
      row.deletedAt === null &&
      row.reminderTime === input.reminderTime &&
      (row.isEnabled === 1) === input.isEnabled &&
      (!input.isEnabled ||
        hasSchedule ||
        !pickUpcomingOccurrence(info.upcoming, input.daysBefore, input.reminderTime, now));
    if (isUnchanged) continue;
    if (!(await updateRule(context, row, input, schedules))) isDenied = true;
  }
  for (const input of desired.values()) {
    if (byDays.has(input.daysBefore) || isLimited) continue;
    const result = await createRule(context, input);
    if (result === 'limit-reached') isLimited = true;
    if (result === 'rejected') isDenied = true;
  }
  if (isLimited) return { outcome: 'limit-reached' };
  return { outcome: isDenied ? 'permission-denied' : 'saved' };
}

/** Tạo bộ mốc mặc định cho dịp chưa có mốc nào (gọi sau khi tạo sự kiện). */
export async function saveDefaultReminderRules(
  profile: LocalProfile,
  eventId: string,
  options: ReminderApiOptions = {},
): Promise<SaveRemindersResult> {
  const current = await listReminderRules(profile, eventId);
  if (current.length > 0) return { outcome: 'saved' };
  return saveReminderRules(
    profile,
    eventId,
    DEFAULT_REMINDER_DAYS.map((daysBefore) => ({
      daysBefore,
      reminderTime: DEFAULT_REMINDER_TIME,
      isEnabled: true,
    })),
    options,
  );
}

/** Mốc (số ngày trước) của lần nhắc kế tiếp đang có lịch, hoặc null. */
export async function getNextReminderDays(
  profile: LocalProfile,
  eventId: string,
  now: Date = new Date(),
): Promise<number | null> {
  const row = await queryFirst<{ daysBefore: number }>(
    profile,
    `SELECT days_before AS daysBefore FROM notification_schedules
     WHERE event_id = ? AND status = 'SCHEDULED' AND scheduled_at > ?
     ORDER BY scheduled_at LIMIT 1`,
    [toLocalId(eventId), formatFireAt(now)],
  );
  return row ? row.daysBefore : null;
}

/** Hoãn lần nhắc kế tiếp: đặt lịch mới trước, chỉ hủy lịch cũ khi lịch mới đã được nhận. */
export async function snoozeNextReminder(
  profile: LocalProfile,
  eventId: string,
  option: SnoozeOption,
  options: ReminderApiOptions = {},
): Promise<SnoozeResult> {
  const now = options.now ?? new Date();
  const scheduler = options.scheduler ?? notificationScheduler;
  const next = await queryFirst<ScheduleRow & { reminderTime: string }>(
    profile,
    `SELECT CAST(s.occurrence_id AS TEXT) AS occurrenceId, s.days_before AS daysBefore,
        s.local_notification_id AS notificationId, s.scheduled_at AS scheduledAt,
        r.reminder_time AS reminderTime
     FROM notification_schedules s
     JOIN reminder_rules r ON r.event_id = s.event_id AND r.days_before = s.days_before
     WHERE s.event_id = ? AND s.status = 'SCHEDULED' AND s.scheduled_at > ? AND r.deleted_at IS NULL
     ORDER BY s.scheduled_at LIMIT 1`,
    [toLocalId(eventId), formatFireAt(now)],
  );
  if (!next || !next.notificationId) return 'nothing-to-snooze';
  const info = await getReminderEventInfo(profile, eventId, now);
  const snoozeAt = computeSnoozeDate(option, now, next.reminderTime);
  if (!info || !snoozeAt) return 'unavailable';

  const context: SaveContext = {
    profile,
    info,
    scheduler,
    isPrivate: options.isPrivate ?? useNotificationPrefsStore.getState().isPrivate,
    now,
  };
  const snoozeId = newOperationId('snooze');
  const isAccepted = await scheduler.ensureScheduled(
    snoozeId,
    buildRequest(context, next.daysBefore, snoozeAt),
  );
  if (!isAccepted) return 'permission-denied';
  if (!(await scheduler.cancelScheduled(next.notificationId))) {
    await scheduler.cancelScheduled(snoozeId);
    return 'unavailable';
  }
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      `UPDATE notification_schedules
       SET local_notification_id = ?, scheduled_at = ?, status = 'SCHEDULED'
       WHERE event_id = ? AND occurrence_id = ? AND days_before = ?`,
      snoozeId,
      formatFireAt(snoozeAt),
      toLocalId(eventId),
      toLocalId(next.occurrenceId),
      next.daysBefore,
    );
  });
  return 'snoozed';
}

/** Hoàn tất các lần hủy lịch còn dang dở (CANCEL_PENDING) sau khi khởi động lại. */
export async function retryPendingCancellations(
  profile: LocalProfile,
  scheduler: ReminderScheduler = notificationScheduler,
): Promise<void> {
  const rows = await queryAll<{
    eventId: string;
    occurrenceId: string;
    daysBefore: number;
    notificationId: string;
  }>(
    profile,
    `SELECT CAST(event_id AS TEXT) AS eventId, CAST(occurrence_id AS TEXT) AS occurrenceId,
        days_before AS daysBefore, local_notification_id AS notificationId
     FROM notification_schedules WHERE status = 'CANCEL_PENDING' AND local_notification_id IS NOT NULL`,
  );
  for (const row of rows) {
    if (!(await scheduler.cancelScheduled(row.notificationId))) continue;
    await runInTransaction(profile, async (db) => {
      await db.runAsync(
        `UPDATE notification_schedules SET status = 'CANCELLED', local_notification_id = NULL
         WHERE event_id = ? AND occurrence_id = ? AND days_before = ?`,
        toLocalId(row.eventId),
        toLocalId(row.occurrenceId),
        row.daysBefore,
      );
    });
  }
}
