import { queryAll, queryFirst, toLocalId, withProfileDb } from '@/services/storage/local-db';
import type { LocalProfile } from '@/types/local-storage';

import type { EventTask, GiftIdeaItem, OccurrenceBudget } from '../types/events.types';
import { todayVn } from '../utils/dates';

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export async function listTasks(profile: LocalProfile, occurrenceId: string): Promise<EventTask[]> {
  const rows = await queryAll<{
    id: string;
    occurrenceId: string;
    title: string;
    dueOn: string | null;
    isDone: number;
    eventTitle: string;
  }>(
    profile,
    `SELECT CAST(t.local_id AS TEXT) AS id, CAST(t.occurrence_id AS TEXT) AS occurrenceId,
        t.title AS title, t.due_on AS dueOn, (t.completed_at IS NOT NULL) AS isDone,
        e.title AS eventTitle
     FROM occurrence_tasks t JOIN event_occurrences o ON o.local_id = t.occurrence_id
     JOIN events e ON e.local_id = o.event_id
     WHERE t.occurrence_id = ? ORDER BY t.completed_at IS NOT NULL, t.local_id`,
    [toLocalId(occurrenceId)],
  );
  return rows.map((row) => ({ ...row, isDone: row.isDone === 1 }));
}

/** Việc cần làm đến hạn hôm nay hoặc quá hạn của các lần diễn ra chưa bị xóa. */
export async function listTasksDue(
  profile: LocalProfile,
  today: string = todayVn(),
): Promise<EventTask[]> {
  const rows = await queryAll<{
    id: string;
    occurrenceId: string;
    title: string;
    dueOn: string | null;
    isDone: number;
    eventTitle: string;
  }>(
    profile,
    `SELECT CAST(t.local_id AS TEXT) AS id, CAST(t.occurrence_id AS TEXT) AS occurrenceId,
        t.title AS title, t.due_on AS dueOn, (t.completed_at IS NOT NULL) AS isDone,
        e.title AS eventTitle
     FROM occurrence_tasks t JOIN event_occurrences o ON o.local_id = t.occurrence_id
     JOIN events e ON e.local_id = o.event_id
     WHERE t.completed_at IS NULL AND t.due_on IS NOT NULL AND t.due_on <= ?
       AND o.deleted_at IS NULL AND e.deleted_at IS NULL
     ORDER BY t.due_on, t.local_id LIMIT 20`,
    [today],
  );
  return rows.map((row) => ({ ...row, isDone: row.isDone === 1 }));
}

export async function addTask(
  profile: LocalProfile,
  occurrenceId: string,
  title: string,
  dueOn: string | null,
): Promise<void> {
  const trimmed = title.trim();
  if (trimmed.length === 0 || trimmed.length > 200) throw new Error('Tên việc không hợp lệ');
  await withProfileDb(profile, async (db) => {
    await db.runAsync(
      'INSERT INTO occurrence_tasks (occurrence_id, title, due_on) VALUES (?, ?, ?)',
      toLocalId(occurrenceId),
      trimmed,
      dueOn,
    );
  });
}

export async function setTaskDone(
  profile: LocalProfile,
  taskId: string,
  isDone: boolean,
): Promise<void> {
  await withProfileDb(profile, async (db) => {
    await db.runAsync(
      `UPDATE occurrence_tasks SET completed_at = ${isDone ? NOW_SQL : 'NULL'} WHERE local_id = ?`,
      toLocalId(taskId),
    );
  });
}

/** Ý tưởng quà gắn với lần diễn ra (chỉ đọc từ bảng của feature quà). */
export async function listOccurrenceGifts(
  profile: LocalProfile,
  occurrenceId: string,
): Promise<GiftIdeaItem[]> {
  return queryAll<GiftIdeaItem>(
    profile,
    `SELECT CAST(g.local_id AS TEXT) AS id, g.name AS name, g.status AS status,
        CASE WHEN g.estimated_amount_x100 IS NULL THEN NULL
             ELSE g.estimated_amount_x100 / 100.0 END AS estimatedAmount,
        r.name AS recipientName
     FROM gifts g JOIN recipients r ON r.local_id = g.recipient_id
     WHERE g.occurrence_id = ? AND g.deleted_at IS NULL AND g.status <> 'CANCELLED'
     ORDER BY g.local_id`,
    [toLocalId(occurrenceId)],
  );
}

/** Ngân sách của lần diễn ra: ưu tiên mục EVENT, nếu chưa có thì dùng ngân sách mặc định của sự kiện. */
export async function getOccurrenceBudget(
  profile: LocalProfile,
  occurrenceId: string,
  defaultBudget: number | null,
): Promise<OccurrenceBudget> {
  const budget = await queryFirst<{ amountX100: number }>(
    profile,
    `SELECT amount_x100 AS amountX100 FROM budgets
     WHERE scope_type = 'EVENT' AND occurrence_id = ? AND currency = 'VND' AND deleted_at IS NULL`,
    [toLocalId(occurrenceId)],
  );
  const spend = await queryFirst<{ spentX100: number }>(
    profile,
    `SELECT actual_spend_x100 AS spentX100 FROM v_occurrence_spend
     WHERE occurrence_id = ? AND currency = 'VND'`,
    [toLocalId(occurrenceId)],
  );
  return {
    planned: budget ? budget.amountX100 / 100 : defaultBudget,
    spent: spend ? spend.spentX100 / 100 : 0,
  };
}
