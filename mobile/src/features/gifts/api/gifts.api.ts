import {
  newOperationId,
  queryAll,
  queryFirst,
  runInTransaction,
  toAmountX100,
  toLocalId,
} from '@/services/storage/local-db';
import type { ProfileDb } from '@/services/storage/local-db';
import { guardedCreate } from '@/services/storage/local-storage';
import type { LocalProfile } from '@/services/storage/local-storage';
import type { LocalStatement } from '@/types/local-storage';

import type {
  CreateGiftResult,
  Gift,
  GiftIdeaInput,
  GiftStatus,
  GiftTransitionInput,
  NewGivenGiftInput,
  OccurrenceOption,
} from '../types/gifts.types';
import { getTransitionPath } from '../utils/giftStatus';

/** Lớp truy cập SQLite cục bộ của feature quà tặng (không gọi backend). */

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const GIFT_SELECT = `
  SELECT CAST(g.local_id AS TEXT) AS id,
    CAST(g.recipient_id AS TEXT) AS recipientId,
    r.name AS recipientName,
    CAST(g.occurrence_id AS TEXT) AS occurrenceId,
    COALESCE(NULLIF(trim(o.title), ''), e.title) AS occasionTitle,
    o.local_date AS occasionDate,
    g.name AS name,
    g.category AS category,
    g.source AS source,
    g.status AS status,
    g.product_url AS productUrl,
    g.estimated_amount_x100 AS estimatedAmountX100,
    (SELECT SUM(x.amount_x100) FROM expenses x
       WHERE x.gift_id = g.local_id AND x.expense_type = 'GIFT' AND x.deleted_at IS NULL
    ) AS actualAmountX100,
    g.purchased_on AS purchasedOn,
    g.given_on AS givenOn,
    g.reaction AS reaction,
    g.note AS note,
    g.follow_up_prompted_at AS followUpPromptedAt,
    g.follow_up_dismissed_at AS followUpDismissedAt
  FROM gifts g
  JOIN recipients r ON r.local_id = g.recipient_id AND r.deleted_at IS NULL
  LEFT JOIN event_occurrences o ON o.local_id = g.occurrence_id AND o.deleted_at IS NULL
  LEFT JOIN events e ON e.local_id = o.event_id
  WHERE g.deleted_at IS NULL`;

export async function listGifts(profile: LocalProfile): Promise<Gift[]> {
  return queryAll<Gift>(profile, `${GIFT_SELECT} ORDER BY g.updated_at DESC, g.local_id DESC`);
}

export async function getGift(profile: LocalProfile, id: string): Promise<Gift | null> {
  return queryFirst<Gift>(profile, `${GIFT_SELECT} AND g.local_id = ?`, [toLocalId(id)]);
}

/** Các dịp (lần diễn ra) gắn với người nhận, mới nhất trước, để chọn khi thêm/ghi nhận quà. */
export async function listOccurrenceOptions(
  profile: LocalProfile,
  recipientId: string,
): Promise<OccurrenceOption[]> {
  return queryAll<OccurrenceOption>(
    profile,
    `SELECT CAST(o.local_id AS TEXT) AS id,
       COALESCE(NULLIF(trim(o.title), ''), e.title) AS title,
       o.local_date AS date
     FROM event_occurrences o
     JOIN events e ON e.local_id = o.event_id AND e.deleted_at IS NULL
     JOIN occurrence_recipients orr ON orr.occurrence_id = o.local_id
     WHERE orr.recipient_id = ? AND o.deleted_at IS NULL
     ORDER BY o.local_date DESC
     LIMIT 50`,
    [toLocalId(recipientId)],
  );
}

function optionalX100(vnd: number | null | undefined): number | null {
  return vnd === null || vnd === undefined ? null : toAmountX100(vnd);
}

function expenseInsert(
  occurrenceId: string | null,
  type: 'GIFT' | 'OTHER',
  vnd: number,
  date: string,
  description: string | null,
): LocalStatement {
  return {
    sql: `INSERT INTO profile.expenses (gift_id, occurrence_id, expense_type, amount_x100, currency, occurred_at, description)
      VALUES ((SELECT MAX(local_id) FROM profile.gifts), ?, ?, ?, 'VND', ?, ?)`,
    params: [
      occurrenceId ? toLocalId(occurrenceId) : null,
      type,
      toAmountX100(vnd),
      date,
      description,
    ],
  };
}

/** Tạo ý tưởng quà thủ công; khách bị giới hạn 5 ý tưởng. */
export async function createIdea(
  profile: LocalProfile,
  input: GiftIdeaInput,
  operationId: string = newOperationId('idea'),
): Promise<CreateGiftResult> {
  return guardedCreate({
    profile,
    kind: 'idea',
    operationId,
    statements: [
      {
        sql: `INSERT INTO profile.gifts (recipient_id, occurrence_id, name, category, source, status, status_changed_at, estimated_amount_x100, product_url, note)
          VALUES (?, ?, ?, ?, 'MANUAL', 'IDEA', ${NOW_SQL}, ?, ?, ?)`,
        params: [
          toLocalId(input.recipientId),
          input.occurrenceId ? toLocalId(input.occurrenceId) : null,
          input.name,
          input.category,
          optionalX100(input.estimatedVnd),
          input.productUrl,
          input.note,
        ],
      },
    ],
  });
}

/** Ghi nhận một món quà đã tặng chưa từng lưu: tạo quà ở trạng thái GIVEN kèm khoản chi. */
export async function createGivenGift(
  profile: LocalProfile,
  input: NewGivenGiftInput,
  operationId: string = newOperationId('idea'),
): Promise<CreateGiftResult> {
  const statements: LocalStatement[] = [
    {
      sql: `INSERT INTO profile.gifts (recipient_id, occurrence_id, name, source, status, status_changed_at, purchased_on, given_on, reaction, note)
        VALUES (?, ?, ?, 'MANUAL', 'GIVEN', ${NOW_SQL}, ?, ?, ?, ?)`,
      params: [
        toLocalId(input.recipientId),
        input.occurrenceId ? toLocalId(input.occurrenceId) : null,
        input.name,
        input.givenOn,
        input.givenOn,
        input.reaction,
        input.note,
      ],
    },
  ];
  if (input.amountVnd !== null) {
    statements.push(
      expenseInsert(input.occurrenceId, 'GIFT', input.amountVnd, input.givenOn, null),
    );
  }
  if (input.extraVnd !== null) {
    statements.push(
      expenseInsert(input.occurrenceId, 'OTHER', input.extraVnd, input.givenOn, 'Chi phí phụ'),
    );
  }
  return guardedCreate({ profile, kind: 'idea', operationId, statements });
}

/** Sửa thông tin ý tưởng. `local_rev`/`updated_at` do trigger của schema tự tăng. */
export async function updateGift(
  profile: LocalProfile,
  id: string,
  input: GiftIdeaInput,
): Promise<void> {
  await runInTransaction(profile, async (db) => {
    const result = await db.runAsync(
      `UPDATE gifts SET recipient_id = ?, occurrence_id = ?, name = ?, category = ?,
         estimated_amount_x100 = ?, product_url = ?, note = ?
       WHERE local_id = ? AND deleted_at IS NULL`,
      toLocalId(input.recipientId),
      input.occurrenceId ? toLocalId(input.occurrenceId) : null,
      input.name,
      input.category,
      optionalX100(input.estimatedVnd),
      input.productUrl,
      input.note,
      toLocalId(id),
    );
    if (result.changes !== 1) throw new Error('Không tìm thấy món quà');
  });
}

async function upsertExpense(
  db: ProfileDb,
  gift: { id: number; occurrenceId: number | null },
  type: 'GIFT' | 'OTHER',
  vnd: number,
  date: string,
  description: string | null,
): Promise<void> {
  const existing = await db.getFirstAsync<{ local_id: number }>(
    `SELECT local_id FROM expenses
     WHERE gift_id = ? AND expense_type = ? AND deleted_at IS NULL
       AND (? = 'GIFT' OR description IS ?)
     ORDER BY local_id LIMIT 1`,
    gift.id,
    type,
    type,
    description,
  );
  if (existing) {
    await db.runAsync(
      'UPDATE expenses SET amount_x100 = ? WHERE local_id = ?',
      toAmountX100(vnd),
      existing.local_id,
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO expenses (gift_id, occurrence_id, expense_type, amount_x100, currency, occurred_at, description)
     VALUES (?, ?, ?, ?, 'VND', ?, ?)`,
    gift.id,
    gift.occurrenceId,
    type,
    toAmountX100(vnd),
    date,
    description,
  );
}

interface StepRow {
  status: GiftStatus;
  occurrence_id: number | null;
}

/**
 * Chuyển trạng thái quà theo đúng bảng chuyển hợp lệ. Có thể đi qua các bước trung gian
 * (vd IDEA -> SELECTED -> PURCHASED -> GIVEN). `status_changed_at` do trigger đặt;
 * PURCHASED luôn có `purchased_on`, GIVEN luôn có `given_on`. Khoản chi thực tế được
 * ghi/cập nhật khi chuyển sang PURCHASED hoặc GIVEN.
 */
export async function transitionGift(
  profile: LocalProfile,
  id: string,
  input: GiftTransitionInput,
): Promise<void> {
  const localId = toLocalId(id);
  await runInTransaction(profile, async (db) => {
    const gift = await db.getFirstAsync<StepRow>(
      'SELECT status, occurrence_id FROM gifts WHERE local_id = ? AND deleted_at IS NULL',
      localId,
    );
    if (!gift) throw new Error('Không tìm thấy món quà');
    const path = getTransitionPath(gift.status, input.to);
    if (!path || path.length === 0) throw new Error('Không thể chuyển sang trạng thái này');

    for (const step of path) {
      if (step === 'PURCHASED') {
        await db.runAsync(
          'UPDATE gifts SET status = ?, purchased_on = ? WHERE local_id = ?',
          step,
          input.date,
          localId,
        );
      } else if (step === 'GIVEN') {
        await db.runAsync(
          `UPDATE gifts SET status = ?, given_on = ?, purchased_on = COALESCE(purchased_on, ?),
             reaction = COALESCE(?, reaction), note = COALESCE(?, note)
           WHERE local_id = ?`,
          step,
          input.date,
          input.date,
          input.reaction ?? null,
          input.note ?? null,
          localId,
        );
      } else {
        await db.runAsync('UPDATE gifts SET status = ? WHERE local_id = ?', step, localId);
      }
    }

    if (input.to === 'PURCHASED' || input.to === 'GIVEN') {
      const ref = { id: localId, occurrenceId: gift.occurrence_id };
      if (input.amountVnd !== null && input.amountVnd !== undefined) {
        await upsertExpense(db, ref, 'GIFT', input.amountVnd, input.date, null);
      }
      if (input.extraVnd !== null && input.extraVnd !== undefined) {
        await upsertExpense(db, ref, 'OTHER', input.extraVnd, input.date, 'Chi phí phụ');
      }
    }
  });
}

/** Xóa mềm quà và các khoản chi của quà đó. */
export async function deleteGift(profile: LocalProfile, id: string): Promise<void> {
  const localId = toLocalId(id);
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      `UPDATE expenses SET deleted_at = ${NOW_SQL} WHERE gift_id = ? AND deleted_at IS NULL`,
      localId,
    );
    await db.runAsync(
      `UPDATE gifts SET deleted_at = ${NOW_SQL} WHERE local_id = ? AND deleted_at IS NULL`,
      localId,
    );
  });
}

/**
 * Quà đã chọn/đã mua của dịp đã qua trong 30 ngày gần đây mà chưa hỏi lại hôm nay
 * và chưa bị bỏ qua: nguồn cho hộp thoại "Bạn đã tặng món quà nào?".
 */
export async function listFollowUpCandidates(
  profile: LocalProfile,
  todayIsoDate: string,
  promptedBeforeIso: string,
): Promise<Gift[]> {
  return queryAll<Gift>(
    profile,
    `${GIFT_SELECT}
       AND g.status IN ('SELECTED', 'PURCHASED')
       AND o.local_date < ? AND o.local_date >= date(?, '-30 days')
       AND g.follow_up_dismissed_at IS NULL
       AND (g.follow_up_prompted_at IS NULL OR g.follow_up_prompted_at < ?)
     ORDER BY o.local_date DESC, g.local_id`,
    [todayIsoDate, todayIsoDate, promptedBeforeIso],
  );
}

export async function markFollowUpPrompted(
  profile: LocalProfile,
  id: string,
  nowIso: string,
): Promise<void> {
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      'UPDATE gifts SET follow_up_prompted_at = ? WHERE local_id = ? AND deleted_at IS NULL',
      nowIso,
      toLocalId(id),
    );
  });
}

/** "Năm nay không tặng": ngừng hỏi cho các quà đang mở của cùng dịp. */
export async function dismissFollowUp(
  profile: LocalProfile,
  id: string,
  nowIso: string,
): Promise<void> {
  const localId = toLocalId(id);
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      `UPDATE gifts SET follow_up_dismissed_at = ?
       WHERE deleted_at IS NULL AND status IN ('SELECTED', 'PURCHASED')
         AND (local_id = ? OR occurrence_id = (SELECT occurrence_id FROM gifts WHERE local_id = ?))`,
      nowIso,
      localId,
      localId,
    );
  });
}
