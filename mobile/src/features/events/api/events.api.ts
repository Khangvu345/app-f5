import {
  newOperationId,
  queryAll,
  queryFirst,
  runInTransaction,
  toAmountX100,
  toLocalId,
  withProfileDb,
  type ProfileDb,
} from '@/services/storage/local-db';
import { guardedCreate } from '@/services/storage/local-storage';
import type { LocalProfile } from '@/types/local-storage';

import { saveDefaultReminderRules, saveReminderRules } from '../../notifications/api/reminders.api';
import type {
  CreateEventResult,
  EventDraft,
  EventRecord,
  EventType,
  OccurrenceItem,
  OccurrenceStatus,
  RecurrenceRule,
} from '../types/events.types';
import { parseYmd, todayVn } from '../utils/dates';
import {
  hasErrors,
  isLeapDayRule,
  occasionTypeFor,
  ruleFromDraft,
  validateEventDraft,
} from '../utils/eventDraft';
import { occurrenceDates } from '../utils/occurrences';

import { buildCreateEventStatements } from './event-statements';

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

/** Các năm dương lịch cần có lần diễn ra: năm hiện tại và năm kế tiếp. */
export function yearsToCover(today: string): number[] {
  const year = parseYmd(today).year;
  return [year, year + 1];
}

interface EventRow {
  id: string;
  title: string;
  eventType: EventType;
  calendarType: 'SOLAR' | 'LUNAR';
  day: number;
  month: number;
  year: number | null;
  isLeapMonth: number;
  frequency: 'NONE' | 'ANNUAL';
  leapDayPolicy: 'FEB28' | 'MAR01' | 'SKIP' | null;
  endDate: string | null;
  budgetX100: number | null;
  notes: string | null;
}

const EVENT_SELECT = `SELECT CAST(local_id AS TEXT) AS id, title, event_type AS eventType,
    calendar_type AS calendarType, original_day AS day, original_month AS month,
    original_year AS year, is_lunar_leap_month AS isLeapMonth,
    recurrence_frequency AS frequency, leap_day_policy AS leapDayPolicy, end_date AS endDate,
    default_budget_x100 AS budgetX100, notes FROM events`;

function ruleFromRow(row: EventRow): RecurrenceRule {
  return {
    calendarType: row.calendarType,
    day: row.day,
    month: row.month,
    year: row.year,
    isLeapMonth: row.isLeapMonth === 1,
    isRecurring: row.frequency === 'ANNUAL',
    leapDayPolicy: row.leapDayPolicy,
    endDate: row.endDate,
  };
}

async function loadRecipients(
  profile: LocalProfile,
  eventId: string,
): Promise<EventRecord['recipients']> {
  const rows = await queryAll<{ id: string; name: string; isPrimary: number }>(
    profile,
    `SELECT CAST(r.local_id AS TEXT) AS id, r.name AS name, er.is_primary AS isPrimary
     FROM event_recipients er JOIN recipients r ON r.local_id = er.recipient_id
     WHERE er.event_id = ? AND r.deleted_at IS NULL ORDER BY er.is_primary DESC, r.name COLLATE NOCASE`,
    [toLocalId(eventId)],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, isPrimary: row.isPrimary === 1 }));
}

export async function getEvent(profile: LocalProfile, id: string): Promise<EventRecord | null> {
  const row = await queryFirst<EventRow>(
    profile,
    `${EVENT_SELECT} WHERE local_id = ? AND deleted_at IS NULL`,
    [toLocalId(id)],
  );
  if (!row) return null;
  return {
    ...ruleFromRow(row),
    id: row.id,
    title: row.title,
    eventType: row.eventType,
    defaultBudget: row.budgetX100 === null ? null : row.budgetX100 / 100,
    notes: row.notes ?? '',
    recipients: await loadRecipients(profile, id),
  };
}

/**
 * Thêm các lần diễn ra còn thiếu cho một sự kiện (kèm thành viên). Không thêm lại ngày đã bị
 * xóa mềm. Trả về các ngày đã thêm mới.
 */
async function insertMissingOccurrences(
  db: ProfileDb,
  eventId: number,
  dates: readonly string[],
): Promise<void> {
  for (const date of dates) {
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO event_occurrences (event_id, anchor_recipient_id, nominal_date, local_date)
       SELECT local_id, anchor_recipient_id, ?, ? FROM events WHERE local_id = ? AND deleted_at IS NULL`,
      date,
      date,
      eventId,
    );
    if (result.changes === 0) continue;
    await db.runAsync(
      `INSERT INTO occurrence_recipients (occurrence_id, recipient_id)
       SELECT o.local_id, er.recipient_id FROM event_occurrences o
       JOIN event_recipients er ON er.event_id = o.event_id
       WHERE o.event_id = ? AND o.local_date = ?`,
      eventId,
      date,
    );
  }
}

/** Đảm bảo mọi sự kiện đang hoạt động có đủ lần diễn ra cho năm nay và năm sau. */
export async function ensureOccurrences(
  profile: LocalProfile,
  today: string = todayVn(),
): Promise<void> {
  const years = yearsToCover(today);
  const events = await queryAll<EventRow>(
    profile,
    `${EVENT_SELECT} WHERE deleted_at IS NULL AND recurrence_frequency = 'ANNUAL'`,
  );
  if (events.length === 0) return;
  await runInTransaction(profile, async (db) => {
    for (const event of events) {
      const dates = occurrenceDates(ruleFromRow(event), years);
      await insertMissingOccurrences(db, toLocalId(event.id), dates);
    }
  });
}

export async function createEvent(
  profile: LocalProfile,
  draft: EventDraft,
  operationId: string = newOperationId('event'),
): Promise<CreateEventResult> {
  if (hasErrors(validateEventDraft(draft))) throw new Error('Thông tin sự kiện chưa hợp lệ');
  const today = todayVn();
  const dates = occurrenceDates(ruleFromDraft(draft), yearsToCover(today));
  const result = await guardedCreate({
    profile,
    kind: 'event',
    operationId,
    statements: buildCreateEventStatements(draft, dates),
  });
  if (result === 'limit-reached') return { status: 'limit-reached' };
  const created = await queryFirst<{ id: string }>(
    profile,
    'SELECT CAST(MAX(local_id) AS TEXT) AS id FROM events',
  );
  const eventId = created?.id ?? null;
  let isReminderSaved = false;
  if (eventId) {
    try {
      const reminders = await saveDefaultReminderRules(profile, eventId);
      isReminderSaved = reminders.outcome === 'saved';
    } catch {
      // Sự kiện đã tạo thành công; nhắc nhở có thể đặt lại ở màn Tùy chỉnh.
      isReminderSaved = false;
    }
  }
  return { status: 'created', eventId, isReminderSaved };
}

/** Sửa sự kiện: cập nhật dòng chính, thành viên và các lần diễn ra từ hôm nay trở đi. */
export async function updateEvent(
  profile: LocalProfile,
  id: string,
  draft: EventDraft,
  today: string = todayVn(),
): Promise<void> {
  if (hasErrors(validateEventDraft(draft))) throw new Error('Thông tin sự kiện chưa hợp lệ');
  const eventId = toLocalId(id);
  const rule = ruleFromDraft(draft);
  const wanted = occurrenceDates(rule, yearsToCover(today));
  const anchorId = toLocalId(draft.primaryRecipientId);
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      `UPDATE events SET anchor_recipient_id = ?, title = ?, event_type = ?, occasion_type = ?,
        calendar_type = ?, original_day = ?, original_month = ?, original_year = ?,
        is_lunar_leap_month = ?, recurrence_frequency = ?, leap_day_policy = ?,
        default_budget_x100 = ?, notes = ?, updated_at = ${NOW_SQL}
       WHERE local_id = ? AND deleted_at IS NULL`,
      anchorId,
      draft.title.trim(),
      draft.eventType,
      occasionTypeFor(draft.eventType),
      draft.calendarType,
      draft.day,
      draft.month,
      draft.year,
      rule.isLeapMonth ? 1 : 0,
      draft.isRecurring ? 'ANNUAL' : 'NONE',
      isLeapDayRule(rule) ? (draft.leapDayPolicy ?? 'FEB28') : null,
      draft.defaultBudget === null ? null : toAmountX100(draft.defaultBudget),
      draft.notes.trim() === '' ? null : draft.notes.trim(),
      eventId,
    );
    await db.runAsync('DELETE FROM event_recipients WHERE event_id = ?', eventId);
    for (const recipientId of draft.recipientIds) {
      await db.runAsync(
        'INSERT INTO event_recipients (event_id, recipient_id, is_primary) VALUES (?, ?, ?)',
        eventId,
        toLocalId(recipientId),
        recipientId === draft.primaryRecipientId ? 1 : 0,
      );
    }
    // Lần diễn ra tương lai không còn khớp quy tắc mới thì lưu trữ (xóa mềm, không phải "bỏ qua").
    const future = await db.getAllAsync<{ id: number; date: string }>(
      `SELECT local_id AS id, local_date AS date FROM event_occurrences
       WHERE event_id = ? AND deleted_at IS NULL AND local_date >= ?`,
      eventId,
      today,
    );
    for (const occurrence of future) {
      if (!wanted.includes(occurrence.date)) {
        await db.runAsync(
          `UPDATE event_occurrences SET deleted_at = ${NOW_SQL} WHERE local_id = ?`,
          occurrence.id,
        );
      }
    }
    // Khôi phục lần diễn ra từng bị lưu trữ do sửa (không phải do người dùng bỏ qua).
    if (wanted.length > 0) {
      await db.runAsync(
        `UPDATE event_occurrences SET deleted_at = NULL
         WHERE event_id = ? AND deleted_at IS NOT NULL AND status <> 'SKIPPED'
           AND local_date IN (${wanted.map(() => '?').join(',')})`,
        eventId,
        ...wanted,
      );
    }
    await insertMissingOccurrences(db, eventId, wanted);
    await db.runAsync(
      `UPDATE event_occurrences SET anchor_recipient_id = ?
       WHERE event_id = ? AND deleted_at IS NULL AND local_date >= ?`,
      anchorId,
      eventId,
      today,
    );
    await db.runAsync(
      `DELETE FROM occurrence_recipients WHERE occurrence_id IN (
         SELECT local_id FROM event_occurrences
         WHERE event_id = ? AND deleted_at IS NULL AND local_date >= ?)`,
      eventId,
      today,
    );
    await db.runAsync(
      `INSERT INTO occurrence_recipients (occurrence_id, recipient_id)
       SELECT o.local_id, er.recipient_id FROM event_occurrences o
       JOIN event_recipients er ON er.event_id = o.event_id
       WHERE o.event_id = ? AND o.deleted_at IS NULL AND o.local_date >= ?`,
      eventId,
      today,
    );
  });
}

export type DeleteScope = 'THIS' | 'ALL';

/** Xóa mềm: chỉ một lần diễn ra (đánh dấu SKIPPED) hoặc cả chuỗi sự kiện. */
export async function deleteEvent(
  profile: LocalProfile,
  eventId: string,
  scope: DeleteScope,
  occurrenceId: string | null,
): Promise<void> {
  if (scope === 'THIS') {
    if (!occurrenceId) throw new Error('Thiếu lần diễn ra cần xóa');
    await withProfileDb(profile, async (db) => {
      await db.runAsync(
        `UPDATE event_occurrences SET status = 'SKIPPED', deleted_at = ${NOW_SQL}
         WHERE local_id = ? AND event_id = ? AND deleted_at IS NULL`,
        toLocalId(occurrenceId),
        toLocalId(eventId),
      );
    });
    return;
  }
  try {
    await saveReminderRules(profile, eventId, []);
  } catch {
    // Không chặn việc xóa nếu không hủy được lịch nhắc của hệ điều hành.
  }
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      `UPDATE event_occurrences SET deleted_at = ${NOW_SQL} WHERE event_id = ? AND deleted_at IS NULL`,
      toLocalId(eventId),
    );
    await db.runAsync(
      `UPDATE events SET deleted_at = ${NOW_SQL} WHERE local_id = ? AND deleted_at IS NULL`,
      toLocalId(eventId),
    );
  });
}

interface OccurrenceRow {
  id: string;
  eventId: string;
  title: string;
  eventType: EventType;
  date: string;
  status: OccurrenceStatus;
  recipientNames: string | null;
  primaryName: string | null;
  openTasks: number;
  doneTasks: number;
}

const OCCURRENCE_SELECT = `SELECT CAST(o.local_id AS TEXT) AS id, CAST(o.event_id AS TEXT) AS eventId,
    COALESCE(o.title, e.title) AS title, e.event_type AS eventType, o.local_date AS date,
    o.status AS status,
    (SELECT group_concat(r.name, '||') FROM occurrence_recipients orr
       JOIN recipients r ON r.local_id = orr.recipient_id
       WHERE orr.occurrence_id = o.local_id AND r.deleted_at IS NULL) AS recipientNames,
    (SELECT r.name FROM recipients r WHERE r.local_id = o.anchor_recipient_id) AS primaryName,
    (SELECT count(*) FROM occurrence_tasks t
       WHERE t.occurrence_id = o.local_id AND t.completed_at IS NULL) AS openTasks,
    (SELECT count(*) FROM occurrence_tasks t
       WHERE t.occurrence_id = o.local_id AND t.completed_at IS NOT NULL) AS doneTasks
  FROM event_occurrences o JOIN events e ON e.local_id = o.event_id
  WHERE o.deleted_at IS NULL AND e.deleted_at IS NULL`;

function toOccurrence(row: OccurrenceRow): OccurrenceItem {
  return {
    id: row.id,
    eventId: row.eventId,
    title: row.title,
    eventType: row.eventType,
    date: row.date,
    status: row.status,
    recipientNames: row.recipientNames ? row.recipientNames.split('||') : [],
    primaryRecipientName: row.primaryName ?? '',
    openTaskCount: row.openTasks,
    doneTaskCount: row.doneTasks,
  };
}

/** Các lần diễn ra trong khoảng ngày [from, to] (bao gồm hai đầu), sắp theo ngày. */
export async function listOccurrencesBetween(
  profile: LocalProfile,
  from: string,
  to: string,
): Promise<OccurrenceItem[]> {
  const rows = await queryAll<OccurrenceRow>(
    profile,
    `${OCCURRENCE_SELECT} AND o.local_date BETWEEN ? AND ? ORDER BY o.local_date, o.local_id`,
    [from, to],
  );
  return rows.map(toOccurrence);
}

export async function getOccurrence(
  profile: LocalProfile,
  occurrenceId: string,
): Promise<OccurrenceItem | null> {
  const row = await queryFirst<OccurrenceRow>(profile, `${OCCURRENCE_SELECT} AND o.local_id = ?`, [
    toLocalId(occurrenceId),
  ]);
  return row ? toOccurrence(row) : null;
}

/** Lần diễn ra sắp tới của sự kiện; nếu không còn thì lần gần nhất đã qua. */
export async function getFocusOccurrence(
  profile: LocalProfile,
  eventId: string,
  today: string = todayVn(),
): Promise<OccurrenceItem | null> {
  const upcoming = await queryFirst<OccurrenceRow>(
    profile,
    `${OCCURRENCE_SELECT} AND o.event_id = ? AND o.local_date >= ? ORDER BY o.local_date LIMIT 1`,
    [toLocalId(eventId), today],
  );
  if (upcoming) return toOccurrence(upcoming);
  const past = await queryFirst<OccurrenceRow>(
    profile,
    `${OCCURRENCE_SELECT} AND o.event_id = ? ORDER BY o.local_date DESC LIMIT 1`,
    [toLocalId(eventId)],
  );
  return past ? toOccurrence(past) : null;
}

export async function countActiveEvents(profile: LocalProfile): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    profile,
    'SELECT count(*) AS count FROM events WHERE deleted_at IS NULL',
  );
  return row?.count ?? 0;
}

/** Số ngày có sự kiện trong tháng (dùng chấm trên lưới lịch). */
export async function listOccurrencesInMonth(
  profile: LocalProfile,
  year: number,
  month: number,
): Promise<OccurrenceItem[]> {
  const mm = String(month).padStart(2, '0');
  return listOccurrencesBetween(profile, `${year}-${mm}-01`, `${year}-${mm}-31`);
}
