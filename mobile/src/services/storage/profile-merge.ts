import type { SQLiteDatabase } from 'expo-sqlite';

// All identity arithmetic and joins happen in SQLite, never through JS numbers.
const entities: Record<string, { key: string; refs?: Record<string, string> }> = {
  recipients: { key: 'local_id' },
  recipient_preferences: { key: 'local_id', refs: { recipient_id: 'recipients' } },
  events: { key: 'local_id', refs: { anchor_recipient_id: 'recipients' } },
  event_occurrences: {
    key: 'local_id',
    refs: { event_id: 'events', anchor_recipient_id: 'recipients' },
  },
  reminder_rules: { key: 'local_id', refs: { event_id: 'events' } },
  gifts: {
    key: 'local_id',
    refs: { recipient_id: 'recipients', occurrence_id: 'event_occurrences' },
  },
  budgets: { key: 'local_id', refs: { occurrence_id: 'event_occurrences' } },
  expenses: { key: 'local_id', refs: { gift_id: 'gifts', occurrence_id: 'event_occurrences' } },
  occurrence_tasks: {
    key: 'local_id',
    refs: { occurrence_id: 'event_occurrences', gift_id: 'gifts' },
  },
  draft_preferences: { key: 'id', refs: { recipient_id: 'recipients' } },
  ai_draft: { key: 'id', refs: { recipient_id: 'recipients', occurrence_id: 'event_occurrences' } },
  image_cache: { key: 'id' },
};
const joins: Record<string, Record<string, string>> = {
  event_recipients: { event_id: 'events', recipient_id: 'recipients' },
  occurrence_recipients: { occurrence_id: 'event_occurrences', recipient_id: 'recipients' },
  notification_schedules: { event_id: 'events', occurrence_id: 'event_occurrences' },
};
const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

async function columns(db: SQLiteDatabase, table: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string; hidden: number }>(
    `PRAGMA source.table_xinfo(${q(table)})`,
  );
  return rows.filter((row) => row.hidden === 0).map((row) => row.name);
}
function mapped(table: string, column: string, sourceId: number, targetId: number): string {
  return `(SELECT target_key FROM profile_merge_ids WHERE source_id=${sourceId} AND target_id=${targetId} AND table_name='${table}' AND source_key=s.${q(column)})`;
}
async function allocate(
  db: SQLiteDatabase,
  sourceId: number,
  targetId: number,
  table: string,
  key: string,
): Promise<void> {
  // Reserve every free source key before allocating collisions. All arithmetic stays
  // in SQLite; the gap search never increments INT64_MAX.
  await db.runAsync(
    `INSERT INTO profile_merge_ids(source_id,target_id,table_name,source_key,target_key)
     SELECT ?1, ?2, ?3, s.${q(key)}, s.${q(key)} FROM source.${q(table)} s
     WHERE NOT EXISTS(SELECT 1 FROM target.${q(table)} t WHERE t.${q(key)}=s.${q(key)})
       AND NOT EXISTS(SELECT 1 FROM profile_merge_ids m WHERE m.source_id=?1 AND m.target_id=?2 AND m.table_name=?3 AND (m.source_key=s.${q(key)} OR m.target_key=s.${q(key)}))`,
    sourceId,
    targetId,
    table,
  );
  for (;;) {
    const result = await db.runAsync(
      `INSERT INTO profile_merge_ids(source_id,target_id,table_name,source_key,target_key)
       SELECT ?1, ?2, ?3, s.${q(key)}, (
         SELECT min(candidate) FROM (
           SELECT 1 AS candidate UNION ALL
           SELECT ${q(key)}+1 FROM target.${q(table)} WHERE ${q(key)} >= 1 AND ${q(key)} < 9223372036854775807 UNION ALL
           SELECT target_key+1 FROM profile_merge_ids WHERE source_id=?1 AND target_id=?2 AND table_name=?3 AND target_key >= 1 AND target_key < 9223372036854775807
         ) c WHERE NOT EXISTS(SELECT 1 FROM target.${q(table)} t WHERE t.${q(key)}=c.candidate)
           AND NOT EXISTS(SELECT 1 FROM profile_merge_ids m WHERE m.source_id=?1 AND m.target_id=?2 AND m.table_name=?3 AND m.target_key=c.candidate)
       ) FROM source.${q(table)} s
       WHERE NOT EXISTS(SELECT 1 FROM profile_merge_ids m WHERE m.source_id=?1 AND m.target_id=?2 AND m.table_name=?3 AND m.source_key=s.${q(key)})
       ORDER BY s.${q(key)} LIMIT 1`,
      sourceId,
      targetId,
      table,
    );
    if (!result.changes) break;
  }
}
async function copy(
  db: SQLiteDatabase,
  sourceId: number,
  targetId: number,
  table: string,
  key: string | null,
  refs: Record<string, string>,
): Promise<void> {
  const names = await columns(db, table);
  const values = names.map((column) => {
    if (column === key) return mapped(table, column, sourceId, targetId);
    if (refs[column]) return mapped(refs[column], column, sourceId, targetId);
    return `s.${q(column)}`;
  });
  // Check every non-null reference before insertion; nullable references must not vanish.
  for (const [column, parent] of Object.entries(refs)) {
    const missing = await db.getFirstAsync(
      `SELECT 1 FROM source.${q(table)} s WHERE s.${q(column)} IS NOT NULL AND ${mapped(parent, column, sourceId, targetId)} IS NULL LIMIT 1`,
    );
    if (missing) throw new Error(`Missing ${table}.${column} mapping`);
  }
  await db.execAsync(
    `INSERT INTO target.${q(table)} (${names.map(q).join(',')}) SELECT ${values.join(',')} FROM source.${q(table)} s`,
  );
  const missing = await db.getFirstAsync(
    `SELECT 1 FROM (SELECT ${values.join(',')} FROM source.${q(table)} s EXCEPT SELECT ${names.map(q).join(',')} FROM target.${q(table)}) LIMIT 1`,
  );
  if (missing) throw new Error(`Profile merge verification failed in ${table}`);
}

/** Called inside one multi-file transaction with source and target attached. */
export async function mergeProfiles(
  db: SQLiteDatabase,
  sourceId: number,
  targetId: number,
): Promise<void> {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS profile_merge_ids (
    source_id INTEGER NOT NULL, target_id INTEGER NOT NULL, table_name TEXT NOT NULL,
    source_key INTEGER NOT NULL, target_key INTEGER NOT NULL,
    PRIMARY KEY(source_id,target_id,table_name,source_key), UNIQUE(source_id,target_id,table_name,target_key)
  ) STRICT`);
  for (const [table, definition] of Object.entries(entities)) {
    await allocate(db, sourceId, targetId, table, definition.key);
  }
  await db.execAsync('PRAGMA defer_foreign_keys=ON');
  // Membership first avoids their revision triggers modifying imported parents.
  await copy(db, sourceId, targetId, 'recipients', 'local_id', {});
  for (const table of ['event_recipients', 'occurrence_recipients']) {
    await copy(db, sourceId, targetId, table, null, joins[table]);
  }
  for (const [table, definition] of Object.entries(entities)) {
    if (table !== 'recipients') {
      await copy(db, sourceId, targetId, table, definition.key, definition.refs ?? {});
    }
  }
  await copy(db, sourceId, targetId, 'notification_schedules', null, joins.notification_schedules);
  // Keyed metadata can share a key only if its complete value agrees.
  for (const table of ['app_settings_local', 'ai_cache', 'sync_state']) {
    const names = await columns(db, table);
    const key = names[0];
    const mismatch = await db.getFirstAsync(
      `SELECT 1 FROM source.${q(table)} s JOIN target.${q(table)} t ON s.${q(key)}=t.${q(key)} WHERE ${names.map((c) => `s.${q(c)} IS NOT t.${q(c)}`).join(' OR ')} LIMIT 1`,
    );
    if (mismatch) throw new Error(`Conflicting profile metadata in ${table}`);
    await db.execAsync(
      `INSERT INTO target.${q(table)} (${names.map(q).join(',')}) SELECT ${names.map((c) => `s.${q(c)}`).join(',')} FROM source.${q(table)} s WHERE NOT EXISTS(SELECT 1 FROM target.${q(table)} t WHERE t.${q(key)}=s.${q(key)})`,
    );
  }
  const outbox = await db.getFirstAsync('SELECT 1 FROM source.sync_outbox LIMIT 1');
  if (outbox) throw new Error('Cannot merge an active sync outbox while sync is disabled');
  const legacy = await db.getFirstAsync(
    "SELECT 1 FROM source.sqlite_master WHERE type='table' AND name='legacy_sync_outbox_v1'",
  );
  if (legacy) {
    const exists = await db.getFirstAsync(
      "SELECT 1 FROM target.sqlite_master WHERE type='table' AND name='legacy_sync_outbox_v1'",
    );
    if (!exists) {
      await db.execAsync(
        'CREATE TABLE target.legacy_sync_outbox_v1 AS SELECT * FROM source.legacy_sync_outbox_v1 WHERE 0',
      );
    }
    await allocate(db, sourceId, targetId, 'legacy_sync_outbox_v1', 'seq');
    const names = await columns(db, 'legacy_sync_outbox_v1');
    const polymorphic = `(SELECT target_key FROM profile_merge_ids m WHERE m.source_id=${sourceId} AND m.target_id=${targetId} AND m.table_name=s.entity_type AND m.source_key=s.local_id_v2)`;
    const missing = await db.getFirstAsync(
      `SELECT 1 FROM source.legacy_sync_outbox_v1 s WHERE s.local_id_v2 IS NOT NULL AND ${polymorphic} IS NULL LIMIT 1`,
    );
    if (missing) throw new Error('Missing legacy snapshot mapping');
    const values = names.map((column) =>
      column === 'seq'
        ? mapped('legacy_sync_outbox_v1', column, sourceId, targetId)
        : column === 'local_id_v2'
          ? polymorphic
          : `s.${q(column)}`,
    );
    await db.execAsync(
      `INSERT INTO target.legacy_sync_outbox_v1 (${names.map(q).join(',')}) SELECT ${values.join(',')} FROM source.legacy_sync_outbox_v1 s`,
    );
  }
  const violations = await db.getAllAsync('PRAGMA target.foreign_key_check');
  if (violations.length) throw new Error('Profile merge has invalid foreign keys');
}
