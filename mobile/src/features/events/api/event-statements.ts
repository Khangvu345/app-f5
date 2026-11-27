import { toAmountX100, toLocalId } from '@/services/storage/local-db';
import type { LocalStatement } from '@/types/local-storage';

import type { EventDraft } from '../types/events.types';
import { isLeapDayRule, occasionTypeFor, ruleFromDraft } from '../utils/eventDraft';

const LATEST_EVENT = '(SELECT MAX(local_id) FROM profile.events)';

/**
 * Câu lệnh tạo sự kiện cho `guardedCreate` (kind 'event'). Câu đầu thêm dòng `events`;
 * các câu sau lấy id vừa tạo bằng MAX(local_id). Khóa ngoại anchor là FK hoãn nên thứ tự
 * thêm sự kiện -> thành viên -> lần diễn ra -> thành viên lần diễn ra là hợp lệ.
 */
export function buildCreateEventStatements(
  draft: EventDraft,
  occurrenceDates: readonly string[],
): LocalStatement[] {
  const rule = ruleFromDraft(draft);
  const anchorId = toLocalId(draft.primaryRecipientId);
  const statements: LocalStatement[] = [
    {
      sql: `INSERT INTO profile.events (anchor_recipient_id, title, event_type, occasion_type,
        calendar_type, original_day, original_month, original_year, is_lunar_leap_month,
        recurrence_frequency, leap_day_policy, default_budget_x100, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
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
      ],
    },
  ];
  for (const recipientId of draft.recipientIds) {
    statements.push({
      sql: `INSERT INTO profile.event_recipients (event_id, recipient_id, is_primary)
        VALUES (${LATEST_EVENT}, ?, ?)`,
      params: [toLocalId(recipientId), recipientId === draft.primaryRecipientId ? 1 : 0],
    });
  }
  for (const date of occurrenceDates) {
    statements.push({
      sql: `INSERT INTO profile.event_occurrences (event_id, anchor_recipient_id, nominal_date, local_date)
        VALUES (${LATEST_EVENT}, ?, ?, ?)`,
      params: [anchorId, date, date],
    });
    for (const recipientId of draft.recipientIds) {
      statements.push({
        sql: `INSERT INTO profile.occurrence_recipients (occurrence_id, recipient_id)
          VALUES ((SELECT local_id FROM profile.event_occurrences
            WHERE event_id = ${LATEST_EVENT} AND local_date = ?), ?)`,
        params: [date, toLocalId(recipientId)],
      });
    }
  }
  return statements;
}
