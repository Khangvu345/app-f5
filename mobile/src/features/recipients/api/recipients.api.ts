import {
  newOperationId,
  queryAll,
  queryFirst,
  runInTransaction,
  toLocalId,
} from '@/services/storage/local-db';
import { guardedCreate } from '@/services/storage/local-storage';
import type { LocalProfile } from '@/types/local-storage';

import type {
  AgeGroup,
  CreateOutcome,
  DeleteImpact,
  GiftIdea,
  GivenGift,
  RecipientDetail,
  RecipientFormValues,
  RecipientListItem,
  RecipientSummary,
  Relationship,
} from '../types/recipients.types';
import { planPreferenceSync, type ExistingPreference } from '../utils/preferenceSync';
import { pickNextOccasion, todayIso, type UpcomingOccurrence } from '../utils/recipientDates';
import { buildCreateStatements, parseBirth } from '../utils/recipientForm';

interface RecipientRow {
  id: string;
  name: string;
  relationship: Relationship;
  birth_day: number | null;
  birth_month: number | null;
}

interface OccurrenceRow {
  recipient_id: string;
  local_date: string;
  title: string;
}

/** Không cho xóa khi người nhận còn nằm trong sự kiện hoặc quà. */
export class RecipientInUseError extends Error {
  readonly impact: DeleteImpact;

  constructor(impact: DeleteImpact) {
    super('Người nhận vẫn còn trong sự kiện hoặc quà');
    this.name = 'RecipientInUseError';
    this.impact = impact;
  }
}

const RECIPIENT_COLUMNS =
  'CAST(local_id AS TEXT) AS id, name, relationship, birth_day, birth_month';

/** Dịp sắp tới (chỉ đọc từ bảng sự kiện) của mọi người nhận, sớm nhất trước. */
const UPCOMING_OCCURRENCES_SQL = `
  SELECT CAST(orr.recipient_id AS TEXT) AS recipient_id, o.local_date AS local_date,
         coalesce(nullif(trim(o.title), ''), e.title) AS title
  FROM occurrence_recipients orr
  JOIN event_occurrences o ON o.local_id = orr.occurrence_id AND o.deleted_at IS NULL
       AND o.status NOT IN ('CANCELLED', 'SKIPPED', 'COMPLETED')
  JOIN events e ON e.local_id = o.event_id AND e.deleted_at IS NULL
  WHERE o.local_date >= ?
  ORDER BY o.local_date ASC`;

function firstOccurrenceByRecipient(rows: OccurrenceRow[]): Map<string, UpcomingOccurrence> {
  const map = new Map<string, UpcomingOccurrence>();
  for (const row of rows) {
    if (!map.has(row.recipient_id)) {
      map.set(row.recipient_id, { date: row.local_date, title: row.title });
    }
  }
  return map;
}

/** Danh sách đầy đủ, sắp theo dịp gần nhất (người chưa có dịp xếp cuối, theo tên). */
export async function listRecipientItems(profile: LocalProfile): Promise<RecipientListItem[]> {
  const today = todayIso();
  const [rows, occurrences] = await Promise.all([
    queryAll<RecipientRow>(
      profile,
      `SELECT ${RECIPIENT_COLUMNS} FROM recipients WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE`,
    ),
    queryAll<OccurrenceRow>(profile, UPCOMING_OCCURRENCES_SQL, [today]),
  ]);
  const byRecipient = firstOccurrenceByRecipient(occurrences);
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      relationship: row.relationship,
      nextOccasion: pickNextOccasion(
        today,
        byRecipient.get(row.id) ?? null,
        row.birth_day,
        row.birth_month,
      ),
    }))
    .sort((a, b) => {
      if (a.nextOccasion && b.nextOccasion) {
        return a.nextOccasion.date.localeCompare(b.nextOccasion.date);
      }
      if (a.nextOccasion) return -1;
      if (b.nextOccasion) return 1;
      return 0;
    });
}

/** Hợp đồng chia sẻ: chỉ người chưa xóa mềm. */
export async function listRecipientSummaries(profile: LocalProfile): Promise<RecipientSummary[]> {
  return queryAll<RecipientSummary>(
    profile,
    `SELECT CAST(local_id AS TEXT) AS id, name, relationship FROM recipients
     WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE`,
  );
}

export async function getRecipientSummary(
  profile: LocalProfile,
  id: string,
): Promise<RecipientSummary | null> {
  return queryFirst<RecipientSummary>(
    profile,
    `SELECT CAST(local_id AS TEXT) AS id, name, relationship FROM recipients
     WHERE local_id = ? AND deleted_at IS NULL`,
    [toLocalId(id)],
  );
}

interface DetailRow extends RecipientRow {
  age_group: AgeGroup | null;
  birth_year: number | null;
  notes: string | null;
}

interface PreferenceRow {
  id: string;
  value: string;
  polarity: string;
  is_live: number;
}

async function listPreferences(profile: LocalProfile, id: string): Promise<ExistingPreference[]> {
  const rows = await queryAll<PreferenceRow>(
    profile,
    `SELECT CAST(local_id AS TEXT) AS id, value, polarity,
            CASE WHEN deleted_at IS NULL AND is_active = 1 THEN 1 ELSE 0 END AS is_live
     FROM recipient_preferences WHERE recipient_id = ? ORDER BY local_id`,
    [toLocalId(id)],
  );
  return rows.map((row) => ({
    id: row.id,
    value: row.value,
    polarity: row.polarity,
    isLive: row.is_live === 1,
  }));
}

export async function getRecipientDetail(
  profile: LocalProfile,
  id: string,
): Promise<RecipientDetail | null> {
  const row = await queryFirst<DetailRow>(
    profile,
    `SELECT ${RECIPIENT_COLUMNS}, age_group, birth_year, notes FROM recipients
     WHERE local_id = ? AND deleted_at IS NULL`,
    [toLocalId(id)],
  );
  if (!row) return null;
  const today = todayIso();
  const [preferences, occurrences] = await Promise.all([
    listPreferences(profile, id),
    queryAll<OccurrenceRow>(profile, UPCOMING_OCCURRENCES_SQL, [today]),
  ]);
  const own = firstOccurrenceByRecipient(occurrences).get(row.id) ?? null;
  const live = preferences.filter((item) => item.isLive);
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    ageGroup: row.age_group,
    birthDay: row.birth_day,
    birthMonth: row.birth_month,
    birthYear: row.birth_year,
    notes: row.notes,
    likes: live.filter((item) => item.polarity === 'LIKE').map((item) => item.value),
    avoids: live.filter((item) => item.polarity === 'AVOID').map((item) => item.value),
    nextOccasion: pickNextOccasion(today, own, row.birth_day, row.birth_month),
  };
}

interface GivenGiftRow {
  id: string;
  name: string;
  given_on: string | null;
  occasion: string | null;
  amount_x100: number | null;
  note: string | null;
}

/** Quà đã tặng (status GIVEN) của người nhận, mới nhất trước. Chỉ đọc. */
export async function listGivenGifts(
  profile: LocalProfile,
  id: string,
  limit?: number,
): Promise<GivenGift[]> {
  const rows = await queryAll<GivenGiftRow>(
    profile,
    `SELECT CAST(g.local_id AS TEXT) AS id, g.name AS name, g.given_on AS given_on,
            coalesce(nullif(trim(o.title), ''), e.title) AS occasion,
            g.estimated_amount_x100 AS amount_x100, g.note AS note
     FROM gifts g
     LEFT JOIN event_occurrences o ON o.local_id = g.occurrence_id
     LEFT JOIN events e ON e.local_id = o.event_id
     WHERE g.recipient_id = ? AND g.status = 'GIVEN' AND g.deleted_at IS NULL
     ORDER BY g.given_on DESC, g.local_id DESC LIMIT ?`,
    [toLocalId(id), limit ?? -1],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    givenOn: row.given_on,
    occasion: row.occasion,
    amount: row.amount_x100,
    note: row.note,
  }));
}

export async function listGiftIdeas(profile: LocalProfile, id: string): Promise<GiftIdea[]> {
  return queryAll<GiftIdea>(
    profile,
    `SELECT CAST(local_id AS TEXT) AS id, name, status FROM gifts
     WHERE recipient_id = ? AND status IN ('IDEA', 'CONSIDERING', 'SELECTED') AND deleted_at IS NULL
     ORDER BY local_id DESC`,
    [toLocalId(id)],
  );
}

export async function createRecipient(
  profile: LocalProfile,
  values: RecipientFormValues,
  operationId: string = newOperationId('recipient'),
): Promise<CreateOutcome> {
  const result = await guardedCreate({
    profile,
    kind: 'recipient',
    operationId,
    statements: buildCreateStatements(values),
  });
  return result === 'limit-reached' ? 'limit-reached' : 'created';
}

export async function updateRecipient(
  profile: LocalProfile,
  id: string,
  values: RecipientFormValues,
): Promise<void> {
  const localId = toLocalId(id);
  const { parts } = parseBirth(values.birthDay, values.birthMonth, values.birthYear);
  const notes = values.notes.trim();
  await runInTransaction(profile, async (db) => {
    // `local_rev` và `updated_at` do trigger `recipients_content_changed` cập nhật.
    await db.runAsync(
      `UPDATE recipients SET name = ?, relationship = ?, age_group = ?, birth_day = ?,
         birth_month = ?, birth_year = ?, notes = ? WHERE local_id = ? AND deleted_at IS NULL`,
      values.name.trim(),
      values.relationship,
      values.ageGroup,
      parts.day,
      parts.month,
      parts.year,
      notes ? notes : null,
      localId,
    );
    const rows = await db.getAllAsync<PreferenceRow>(
      `SELECT CAST(local_id AS TEXT) AS id, value, polarity,
              CASE WHEN deleted_at IS NULL AND is_active = 1 THEN 1 ELSE 0 END AS is_live
       FROM recipient_preferences WHERE recipient_id = ?`,
      localId,
    );
    const plan = planPreferenceSync(
      rows.map((row) => ({
        id: row.id,
        value: row.value,
        polarity: row.polarity,
        isLive: row.is_live === 1,
      })),
      values.likes,
      values.avoids,
    );
    for (const prefId of plan.revive) {
      await db.runAsync(
        'UPDATE recipient_preferences SET deleted_at = NULL, is_active = 1 WHERE local_id = ?',
        toLocalId(prefId),
      );
    }
    for (const prefId of plan.remove) {
      await db.runAsync(
        "UPDATE recipient_preferences SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE local_id = ?",
        toLocalId(prefId),
      );
    }
    for (const item of plan.insert) {
      await db.runAsync(
        "INSERT INTO recipient_preferences (recipient_id, category, value, polarity) VALUES (?, 'general', ?, ?)",
        localId,
        item.value,
        item.polarity,
      );
    }
  });
}

/** Số sự kiện và quà còn hiệu lực gắn với người nhận (chỉ đọc). */
export async function getDeleteImpact(profile: LocalProfile, id: string): Promise<DeleteImpact> {
  const localId = toLocalId(id);
  const events = await queryFirst<{ count: number }>(
    profile,
    `SELECT count(DISTINCT er.event_id) AS count FROM event_recipients er
     JOIN events e ON e.local_id = er.event_id AND e.deleted_at IS NULL
     WHERE er.recipient_id = ?`,
    [localId],
  );
  const gifts = await queryFirst<{ count: number }>(
    profile,
    'SELECT count(*) AS count FROM gifts WHERE recipient_id = ? AND deleted_at IS NULL',
    [localId],
  );
  return { eventCount: events?.count ?? 0, giftCount: gifts?.count ?? 0 };
}

/** Xóa mềm. Ném `RecipientInUseError` nếu còn sự kiện/quà để không vi phạm ràng buộc. */
export async function deleteRecipient(profile: LocalProfile, id: string): Promise<void> {
  const impact = await getDeleteImpact(profile, id);
  if (impact.eventCount > 0 || impact.giftCount > 0) throw new RecipientInUseError(impact);
  await runInTransaction(profile, async (db) => {
    await db.runAsync(
      "UPDATE recipients SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE local_id = ? AND deleted_at IS NULL",
      toLocalId(id),
    );
  });
}
