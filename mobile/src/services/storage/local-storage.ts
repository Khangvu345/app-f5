import * as SQLite from 'expo-sqlite';

import type {
  GuardedWrite,
  LocalProfile,
  ReminderScheduler,
  ReminderWrite,
  TrialKind,
} from '@/types/local-storage';

import { LOCAL_SCHEMA } from './local-schema';

export type { LocalProfile } from '@/types/local-storage';

const REGISTRY = 'giftmate-installation.db';
const LIMITS: Record<TrialKind, number> = { recipient: 2, event: 3, reminder: 3, idea: 5 };
const TABLES = [
  'app_settings_local',
  'recipients',
  'recipient_preferences',
  'event_recipients',
  'events',
  'occurrence_recipients',
  'event_occurrences',
  'reminder_rules',
  'notification_schedules',
  'gifts',
  'budgets',
  'expenses',
  'occurrence_tasks',
  'draft_preferences',
  'ai_draft',
  'ai_cache',
  'image_cache',
  'sync_state',
  'sync_outbox',
];

async function registry(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(REGISTRY, { useNewConnection: true });
  await db.execAsync(`PRAGMA busy_timeout=10000; PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT UNIQUE, is_guest INTEGER NOT NULL DEFAULT 0);
    CREATE UNIQUE INDEX IF NOT EXISTS one_guest ON profiles(is_guest) WHERE is_guest=1;
    CREATE TABLE IF NOT EXISTS link_intents (source_id INTEGER PRIMARY KEY, owner TEXT NOT NULL, FOREIGN KEY(source_id) REFERENCES profiles(id));
    CREATE TABLE IF NOT EXISTS link_history (source_id INTEGER PRIMARY KEY, owner TEXT NOT NULL, target_id INTEGER NOT NULL, FOREIGN KEY(source_id) REFERENCES profiles(id), FOREIGN KEY(target_id) REFERENCES profiles(id));
    CREATE TABLE IF NOT EXISTS operations (operation_id TEXT PRIMARY KEY, kind TEXT NOT NULL, profile_id INTEGER NOT NULL, state TEXT NOT NULL, charged INTEGER NOT NULL DEFAULT 1, payload TEXT, FOREIGN KEY(profile_id) REFERENCES profiles(id));`);
  return db;
}
function name(id: number): string {
  return `giftmate-profile-${id}.db`;
}
function idFromProfile(profile: LocalProfile): number {
  const match = /^giftmate-profile-([1-9][0-9]*)\.db$/.exec(profile.dbName);
  if (!match) throw new Error('Invalid profile');
  return Number(match[1]);
}
function validOwner(owner: string): void {
  if (
    !/^[1-9][0-9]*$/.test(owner) ||
    owner.length > 19 ||
    (owner.length === 19 && owner > '9223372036854775807')
  ) {
    throw new Error('Invalid account ID');
  }
}
async function initialize(id: number): Promise<void> {
  const db = await SQLite.openDatabaseAsync(name(id), { useNewConnection: true });
  try {
    await db.execAsync(
      'PRAGMA busy_timeout=10000; PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON',
    );
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (version?.user_version === 0) {
      try {
        await db.execAsync(LOCAL_SCHEMA);
      } catch (error) {
        await db.execAsync('ROLLBACK').catch(() => undefined);
        const current = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        if (current?.user_version !== 1) throw error;
      }
    } else if (version?.user_version !== 1) throw new Error('Unsupported profile schema');
  } finally {
    await db.closeAsync();
  }
}
async function attach(db: SQLite.SQLiteDatabase, id: number, alias: string): Promise<void> {
  await db.runAsync(
    `ATTACH DATABASE ? AS ${alias}`,
    `${SQLite.defaultDatabaseDirectory}/${name(id)}`,
  );
  await db.execAsync(`PRAGMA ${alias}.journal_mode=DELETE`);
}
async function tx<T>(db: SQLite.SQLiteDatabase, fn: () => Promise<T>): Promise<T> {
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    const value = await fn();
    await db.execAsync('COMMIT');
    return value;
  } catch (error) {
    await db.execAsync('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
async function profileRow(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<{ owner: string | null; is_guest: number } | null> {
  return db.getFirstAsync('SELECT owner, is_guest FROM profiles WHERE id=?', id);
}
export async function openGuestProfile(): Promise<LocalProfile> {
  const db = await registry();
  try {
    const id = await tx(db, async () => {
      let row = await db.getFirstAsync<{ id: number }>('SELECT id FROM profiles WHERE is_guest=1');
      if (!row) {
        const result = await db.runAsync('INSERT INTO profiles(is_guest) VALUES(1)');
        row = { id: result.lastInsertRowId };
      }
      return row.id;
    });
    await initialize(id);
    return { dbName: name(id), serverUserId: null };
  } finally {
    await db.closeAsync();
  }
}
export async function openAccountProfile(serverUserId: string): Promise<LocalProfile> {
  validOwner(serverUserId);
  const db = await registry();
  try {
    const row = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM profiles WHERE owner=?',
      serverUserId,
    );
    if (!row) throw new Error('Account profile not found');
    await initialize(row.id);
    return { dbName: name(row.id), serverUserId };
  } finally {
    await db.closeAsync();
  }
}
export async function linkGuestProfile(
  serverUserId: string,
  sourceProfile?: LocalProfile,
): Promise<LocalProfile> {
  validOwner(serverUserId);
  // Ensure both files exist before entering the multi-database transaction.
  const guest = sourceProfile ?? (await openGuestProfile());
  if (guest.serverUserId !== null) throw new Error('Source must be a guest profile');
  const sourceId = idFromProfile(guest);
  const db = await registry();
  try {
    const linked = await tx(db, async () => {
      const completed = await db.getFirstAsync<{ owner: string; target_id: number }>(
        'SELECT owner,target_id FROM link_history WHERE source_id=?',
        sourceId,
      );
      if (completed) {
        if (completed.owner !== serverUserId) {
          throw new Error('Guest profile already linked to another account');
        }
        return completed.target_id;
      }
      const pending = await db.getFirstAsync<{ owner: string }>(
        'SELECT owner FROM link_intents WHERE source_id=?',
        sourceId,
      );
      if (pending && pending.owner !== serverUserId) {
        throw new Error('Guest profile is awaiting another account');
      }
      if (!pending) {
        await db.runAsync('INSERT INTO link_intents VALUES(?,?)', sourceId, serverUserId);
      }
      return null;
    });
    if (linked !== null) return { dbName: name(linked), serverUserId };
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM profiles WHERE owner=?',
      serverUserId,
    );
    await attach(db, sourceId, 'source');
    if (existing && existing.id !== sourceId) {
      await initialize(existing.id);
      await attach(db, existing.id, 'target');
    }
    return await tx(db, async () => {
      const source = await profileRow(db, sourceId);
      const account = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM profiles WHERE owner=?',
        serverUserId,
      );
      if (
        !source ||
        source.is_guest !== 1 ||
        source.owner !== null ||
        (account && account.id !== existing?.id)
      ) {
        throw new Error('Profile changed; retry');
      }
      const pendingReminder = await db.getFirstAsync(
        "SELECT 1 FROM operations WHERE profile_id=? AND kind='reminder' AND state='pending'",
        sourceId,
      );
      if (pendingReminder) throw new Error('Reconcile pending reminders before linking');
      if (!account) {
        await db.runAsync(
          'UPDATE source.local_profile SET server_user_id=?, sync_enabled=0 WHERE slot=1 AND server_user_id IS NULL',
          serverUserId,
        );
        await db.runAsync(
          'UPDATE profiles SET owner=?, is_guest=0 WHERE id=?',
          serverUserId,
          sourceId,
        );
        await db.runAsync(
          'INSERT INTO link_history VALUES(?,?,?)',
          sourceId,
          serverUserId,
          sourceId,
        );
        await db.runAsync('DELETE FROM link_intents WHERE source_id=?', sourceId);
        return { dbName: name(sourceId), serverUserId };
      }
      // Deferred foreign keys permit membership rows before their parent. This also avoids
      // membership triggers changing imported parent revisions during the copy.
      await db.execAsync('PRAGMA defer_foreign_keys=ON');
      for (const table of TABLES) {
        const columns = await db.getAllAsync<{ name: string }>(
          `PRAGMA source.table_info(${table})`,
        );
        const names = columns.map((column) => `"${column.name}"`).join(',');
        await db.execAsync(
          `INSERT OR IGNORE INTO target.${table} (${names}) SELECT ${names} FROM source.${table}`,
        );
        // A matching key alone is insufficient: a different source row must not disappear.
        const missing = await db.getFirstAsync<{ count: number }>(
          `SELECT count(*) AS count FROM (SELECT ${names} FROM source.${table} EXCEPT SELECT ${names} FROM target.${table})`,
        );
        if (missing?.count) throw new Error(`Profile merge conflict in ${table}`);
      }
      const violations = await db.getAllAsync('PRAGMA target.foreign_key_check');
      if (violations.length) throw new Error('Profile merge has invalid foreign keys');
      await db.runAsync(
        'UPDATE operations SET profile_id=? WHERE profile_id=?',
        account.id,
        sourceId,
      );
      await db.runAsync('UPDATE profiles SET is_guest=0 WHERE id=?', sourceId);
      await db.runAsync(
        'INSERT INTO link_history VALUES(?,?,?)',
        sourceId,
        serverUserId,
        account.id,
      );
      await db.runAsync('DELETE FROM link_intents WHERE source_id=?', sourceId);
      return { dbName: name(account.id), serverUserId };
    });
  } finally {
    await db.closeAsync();
  }
}

/** Statements must write to the attached `profile` schema, in a single logical creation. */
export async function guardedCreate(
  input: GuardedWrite,
): Promise<'created' | 'already-created' | 'limit-reached'> {
  if (!input.operationId.trim() || input.statements.length === 0) {
    throw new Error('An operation ID and statements are required');
  }
  const table = { recipient: 'recipients', event: 'events', idea: 'gifts' }[input.kind];
  if (
    !new RegExp(`^\\s*INSERT\\s+INTO\\s+profile\\.${table}\\s*\\(`, 'i').test(
      input.statements[0].sql,
    )
  ) {
    throw new Error('First insert must create the requested record');
  }
  const id = idFromProfile(input.profile);
  const db = await registry();
  try {
    await initialize(id);
    await attach(db, id, 'profile');
    return await tx(db, async () => {
      const profile = await profileRow(db, id);
      if (
        !profile ||
        profile.owner !== input.profile.serverUserId ||
        (!profile.owner && !profile.is_guest)
      ) {
        throw new Error('Profile is no longer active');
      }
      const previous = await db.getFirstAsync<{ kind: string; profile_id: number }>(
        'SELECT kind, profile_id FROM operations WHERE operation_id=?',
        input.operationId,
      );
      if (previous) {
        if (previous.kind !== input.kind || previous.profile_id !== id) {
          throw new Error('Operation ID already used');
        }
        return 'already-created';
      }
      if (!profile.owner) {
        const count = await db.getFirstAsync<{ count: number }>(
          'SELECT count(*) AS count FROM operations WHERE kind=? AND charged=1',
          input.kind,
        );
        if ((count?.count ?? 0) >= LIMITS[input.kind]) return 'limit-reached';
      }
      const before = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) AS count FROM profile.${table}`,
      );
      const manualBefore =
        input.kind === 'idea'
          ? await db.getFirstAsync<{ count: number }>(
              "SELECT count(*) AS count FROM profile.gifts WHERE source='MANUAL'",
            )
          : null;
      for (const statement of input.statements) {
        if (!/^\s*INSERT\s+INTO\s+profile\./i.test(statement.sql)) {
          throw new Error('Only profile inserts are supported');
        }
        await db.runAsync(statement.sql, ...(statement.params ?? []));
      }
      const after = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) AS count FROM profile.${table}`,
      );
      if ((after?.count ?? 0) !== (before?.count ?? 0) + 1) {
        throw new Error('A creation must add exactly one record');
      }
      if (input.kind === 'idea') {
        const manualAfter = await db.getFirstAsync<{ count: number }>(
          "SELECT count(*) AS count FROM profile.gifts WHERE source='MANUAL'",
        );
        if ((manualAfter?.count ?? 0) !== (manualBefore?.count ?? 0) + 1) {
          throw new Error('Trial ideas must be manual');
        }
      }
      await db.runAsync(
        'INSERT INTO operations(operation_id,kind,profile_id,state,charged) VALUES(?,?,?,?,?)',
        input.operationId,
        input.kind,
        id,
        'confirmed',
        profile.owner ? 0 : 1,
      );
      return 'created';
    });
  } finally {
    await db.closeAsync();
  }
}

export async function getTrialUsage(): Promise<Record<TrialKind, number>> {
  const db = await registry();
  try {
    const rows = await db.getAllAsync<{ kind: TrialKind; count: number }>(
      `SELECT kind, count(*) AS count FROM operations WHERE charged=1 AND state='confirmed' GROUP BY kind`,
    );
    const usage: Record<TrialKind, number> = { recipient: 0, event: 0, reminder: 0, idea: 0 };
    for (const row of rows) usage[row.kind] = row.count;
    return usage;
  } finally {
    await db.closeAsync();
  }
}

/** Schedule with an idempotent adapter. An ambiguous OS result remains pending for retry. */
export async function scheduleReminder(
  input: ReminderWrite,
  scheduler: ReminderScheduler,
): Promise<'created' | 'already-created' | 'limit-reached' | 'rejected'> {
  if (!input.operationId.trim() || input.statements.length === 0) {
    throw new Error('Missing reminder operation');
  }
  if (
    !/^\s*INSERT\s+INTO\s+profile\.reminder_rules\s*\(/i.test(input.statements[0].sql) ||
    input.statements.some((statement) => !/^\s*INSERT\s+INTO\s+profile\./i.test(statement.sql))
  ) {
    throw new Error('Reminder statements must create a rule in the profile');
  }
  const id = idFromProfile(input.profile);
  const db = await registry();
  try {
    await initialize(id);
    await attach(db, id, 'profile');
    const state = await tx(db, async () => {
      const profile = await profileRow(db, id);
      if (
        !profile ||
        profile.owner !== input.profile.serverUserId ||
        (!profile.owner && !profile.is_guest)
      ) {
        throw new Error('Profile is no longer active');
      }
      const previous = await db.getFirstAsync<{
        kind: string;
        profile_id: number;
        state: string;
        payload: string;
      }>(
        'SELECT kind,profile_id,state,payload FROM operations WHERE operation_id=?',
        input.operationId,
      );
      const payload = JSON.stringify({ statements: input.statements, request: input.request });
      if (previous) {
        if (
          previous.kind !== 'reminder' ||
          previous.profile_id !== id ||
          previous.payload !== payload
        ) {
          throw new Error('Operation ID already used');
        }
        return previous.state;
      }
      if (!profile.owner) {
        const count = await db.getFirstAsync<{ count: number }>(
          "SELECT count(*) AS count FROM operations WHERE kind='reminder' AND charged=1",
        );
        if ((count?.count ?? 0) >= LIMITS.reminder) return 'limit-reached';
      }
      await db.runAsync(
        'INSERT INTO operations(operation_id,kind,profile_id,state,charged,payload) VALUES(?,?,?,?,?,?)',
        input.operationId,
        'reminder',
        id,
        'pending',
        profile.owner ? 0 : 1,
        payload,
      );
      return 'pending';
    });
    if (state === 'confirmed') return 'already-created';
    if (state === 'limit-reached') return 'limit-reached';
    let isAccepted = false;
    try {
      return await tx(db, async () => {
        const current = await db.getFirstAsync<{ state: string }>(
          'SELECT state FROM operations WHERE operation_id=?',
          input.operationId,
        );
        if (!current) throw new Error('Reminder reservation missing');
        if (current.state === 'confirmed') return 'already-created';
        isAccepted = await scheduler.ensureScheduled(input.operationId, input.request);
        if (!isAccepted) {
          await db.runAsync('DELETE FROM operations WHERE operation_id=?', input.operationId);
          return 'rejected';
        }
        const before = await db.getFirstAsync<{ count: number }>(
          'SELECT count(*) AS count FROM profile.reminder_rules',
        );
        for (const statement of input.statements) {
          await db.runAsync(statement.sql, ...(statement.params ?? []));
        }
        const after = await db.getFirstAsync<{ count: number }>(
          'SELECT count(*) AS count FROM profile.reminder_rules',
        );
        if ((after?.count ?? 0) !== (before?.count ?? 0) + 1) {
          throw new Error('A reminder must add exactly one rule');
        }
        const violations = await db.getAllAsync('PRAGMA profile.foreign_key_check');
        if (violations.length) throw new Error('Reminder has invalid foreign keys');
        await db.runAsync(
          "UPDATE operations SET state='confirmed' WHERE operation_id=?",
          input.operationId,
        );
        return 'created';
      });
    } catch (error) {
      if (isAccepted) {
        await tx(db, async () => {
          const current = await db.getFirstAsync<{ state: string }>(
            'SELECT state FROM operations WHERE operation_id=?',
            input.operationId,
          );
          if (
            current?.state === 'pending' &&
            (await scheduler.cancelScheduled(input.operationId))
          ) {
            await db.runAsync('DELETE FROM operations WHERE operation_id=?', input.operationId);
          }
        });
      }
      throw error;
    }
  } finally {
    await db.closeAsync();
  }
}

/** Retry every unresolved OS scheduling call after restart. */
export async function reconcileReminders(scheduler: ReminderScheduler): Promise<void> {
  const db = await registry();
  try {
    const rows = await db.getAllAsync<{
      operation_id: string;
      profile_id: number;
      owner: string | null;
      payload: string;
    }>(
      "SELECT o.operation_id,o.profile_id,p.owner,o.payload FROM operations o JOIN profiles p ON p.id=o.profile_id WHERE o.kind='reminder' AND o.state='pending'",
    );
    for (const row of rows) {
      const saved: Pick<ReminderWrite, 'statements' | 'request'> = JSON.parse(row.payload);
      await scheduleReminder(
        {
          profile: { dbName: name(row.profile_id), serverUserId: row.owner },
          operationId: row.operation_id,
          ...saved,
        },
        scheduler,
      );
    }
  } finally {
    await db.closeAsync();
  }
}
