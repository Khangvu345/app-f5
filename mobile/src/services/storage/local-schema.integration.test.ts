/** @jest-environment node */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as mockJoin } from 'node:path';
import { DatabaseSync as MockDatabaseSync } from 'node:sqlite';

import {
  LOCAL_MIGRATION_PREPARE_V1,
  LOCAL_MIGRATION_RESTORE_V2,
  LOCAL_SCHEMA,
} from './local-schema';
import { openAccountProfile, openGuestProfile } from './local-storage';

const mockDirectory = mkdtempSync(mockJoin(tmpdir(), 'giftmate-upgrade-'));

jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: mockDirectory,
  openDatabaseAsync: async (name: string) => {
    const db = new MockDatabaseSync(mockJoin(mockDirectory, name));
    return {
      execAsync: async (sql: string) => db.exec(sql),
      runAsync: async (sql: string, ...params: (string | number | null)[]) => {
        const result = db.prepare(sql).run(...params);
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      },
      getFirstAsync: async (sql: string, ...params: (string | number | null)[]) =>
        db.prepare(sql).get(...params) ?? null,
      getAllAsync: async (sql: string, ...params: (string | number | null)[]) =>
        db.prepare(sql).all(...params),
      closeAsync: async () => db.close(),
    };
  },
}));

beforeEach(() => {
  for (const file of readdirSync(mockDirectory)) {
    rmSync(mockJoin(mockDirectory, file), { force: true });
  }
});
afterAll(() => rmSync(mockDirectory, { recursive: true, force: true }));

const setupDir = mockJoin(__dirname, '../../../../backend/src/main/resources/db/setup');
const v1 = readFileSync(mockJoin(__dirname, '__fixtures__/schema-v1.sql'), 'utf8');
const uid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

function registerProfile(owner: string | null = null) {
  const registry = new MockDatabaseSync(mockJoin(mockDirectory, 'giftmate-installation.db'));
  registry.exec(
    'CREATE TABLE profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT UNIQUE, is_guest INTEGER NOT NULL DEFAULT 0)',
  );
  registry
    .prepare('INSERT INTO profiles(id,owner,is_guest) VALUES(1,?,?)')
    .run(owner, owner ? 0 : 1);
  registry.close();
}

function seedV1(db: MockDatabaseSync) {
  db.exec(v1);
  db.exec(`PRAGMA foreign_keys=ON; BEGIN;
    INSERT INTO recipients(local_id,name,relationship) VALUES ('${uid(1)}','Ada','FRIEND');
    INSERT INTO events(local_id,anchor_recipient_id,title,event_type,original_day,original_month) VALUES ('${uid(1)}','${uid(1)}','Birthday','BIRTHDAY',1,1);
    INSERT INTO event_recipients(event_id,recipient_id) VALUES ('${uid(1)}','${uid(1)}');
    INSERT INTO event_occurrences(local_id,event_id,anchor_recipient_id,local_date) VALUES ('${uid(2)}','${uid(1)}','${uid(1)}','2027-01-01');
    INSERT INTO occurrence_recipients(occurrence_id,recipient_id) VALUES ('${uid(2)}','${uid(1)}');
    INSERT INTO reminder_rules(local_id,event_id,days_before) VALUES ('${uid(3)}','${uid(1)}',1);
    INSERT INTO notification_schedules(occurrence_id,days_before,event_id,scheduled_at,local_notification_id,status) VALUES ('${uid(2)}',1,'${uid(1)}','2026-12-31T09:00:00Z','os-123','SCHEDULED');
    INSERT INTO gifts(local_id,recipient_id,name) VALUES ('${uid(4)}','${uid(1)}','Gift'); COMMIT;`);
}

test('bundled SQL exactly matches canonical scripts', () => {
  expect(LOCAL_SCHEMA).toBe(readFileSync(mockJoin(setupDir, '03-local.sql'), 'utf8'));
  expect(LOCAL_MIGRATION_PREPARE_V1).toBe(
    readFileSync(mockJoin(setupDir, '05-chuan-bi-v1.sql'), 'utf8'),
  );
  expect(LOCAL_MIGRATION_RESTORE_V2).toBe(
    readFileSync(mockJoin(setupDir, '06-khoi-phuc-v2.sql'), 'utf8'),
  );
});

test('profile open upgrades a populated UUID file and preserves relationships and OS schedule', async () => {
  const path = mockJoin(mockDirectory, 'giftmate-profile-1.db');
  const old = new MockDatabaseSync(path);
  seedV1(old);
  old.exec("UPDATE local_profile SET server_user_id='9007199254740993'");
  old.close();
  registerProfile('9007199254740993');
  await openAccountProfile('9007199254740993');
  const db = new MockDatabaseSync(path);
  expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 2 });
  expect(db.prepare('SELECT server_user_id FROM local_profile').get()).toEqual({
    server_user_id: '9007199254740993',
  });
  expect(
    db
      .prepare(
        `SELECT r.name,g.name AS gift,e.title,n.local_notification_id
    FROM recipients r JOIN gifts g ON g.recipient_id=r.local_id
    JOIN event_recipients er ON er.recipient_id=r.local_id JOIN events e ON e.local_id=er.event_id
    JOIN notification_schedules n ON n.event_id=e.local_id`,
      )
      .get(),
  ).toEqual({ name: 'Ada', gift: 'Gift', title: 'Birthday', local_notification_id: 'os-123' });
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  db.close();
});

test('interrupted upgrade rolls back and can be retried', async () => {
  const path = mockJoin(mockDirectory, 'giftmate-profile-1.db');
  const db = new MockDatabaseSync(path);
  seedV1(db);
  registerProfile();
  db.exec(LOCAL_MIGRATION_PREPARE_V1);
  db.exec(LOCAL_SCHEMA);
  db.close();
  const reopened = new MockDatabaseSync(path);
  expect(reopened.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 });
  expect(reopened.prepare('SELECT local_id FROM recipients').get()).toEqual({ local_id: uid(1) });
  reopened.close();
  await openGuestProfile();
  const upgraded = new MockDatabaseSync(path);
  expect(upgraded.prepare('PRAGMA user_version').get()).toEqual({ user_version: 2 });
  expect(upgraded.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  upgraded.close();
});

test('new and upgraded files have the same schema and preserve 64-bit IDs', async () => {
  const path = mockJoin(mockDirectory, 'giftmate-profile-1.db');
  const old = new MockDatabaseSync(path);
  seedV1(old);
  old.close();
  registerProfile();
  await openGuestProfile();
  const upgraded = new MockDatabaseSync(path);
  const fresh = new MockDatabaseSync(':memory:');
  fresh.exec(LOCAL_SCHEMA);
  const schema = (db: MockDatabaseSync) =>
    db
      .prepare(
        "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name <> 'legacy_sync_outbox_v1' ORDER BY type,name",
      )
      .all();
  expect(schema(upgraded)).toEqual(schema(fresh));
  fresh.exec(
    "INSERT INTO recipients(local_id,name,relationship) VALUES (9007199254740993,'Large','FRIEND')",
  );
  expect(fresh.prepare('SELECT CAST(local_id AS TEXT) AS id FROM recipients').get()).toEqual({
    id: '9007199254740993',
  });
  upgraded.close();
  fresh.close();
});

test('a failed upgrade leaves the original file intact for a later retry', async () => {
  const path = mockJoin(mockDirectory, 'giftmate-profile-1.db');
  const db = new MockDatabaseSync(path);
  seedV1(db);
  registerProfile();
  db.exec(`PRAGMA foreign_keys=OFF; DELETE FROM recipients WHERE local_id='${uid(1)}'`);
  db.close();
  await expect(openGuestProfile()).rejects.toThrow();
  const failed = new MockDatabaseSync(path);
  expect(failed.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 });
  expect(failed.prepare('SELECT local_id FROM events').get()).toEqual({ local_id: uid(1) });
  failed.exec(
    `INSERT INTO recipients(local_id,name,relationship) VALUES ('${uid(1)}','Ada','FRIEND')`,
  );
  failed.close();
  await openGuestProfile();
  const upgraded = new MockDatabaseSync(path);
  expect(upgraded.prepare('PRAGMA user_version').get()).toEqual({ user_version: 2 });
  expect(upgraded.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  upgraded.close();
});

test('skips an orphan and refuses mismatched profile files without modifying them', async () => {
  const path = mockJoin(mockDirectory, 'giftmate-profile-1.db');
  const db = new MockDatabaseSync(path);
  seedV1(db);
  db.close();
  const guest = await openGuestProfile();
  expect(guest.dbName).toBe('giftmate-profile-2.db');
  expect(await openGuestProfile()).toEqual(guest);
  const registry = new MockDatabaseSync(mockJoin(mockDirectory, 'giftmate-installation.db'));
  registry.exec("INSERT INTO profiles(id,owner,is_guest) VALUES(1,'123',0)");
  registry.close();
  await expect(openAccountProfile('123')).rejects.toThrow('owner does not match');
  const unchanged = new MockDatabaseSync(path);
  expect(unchanged.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 });
  expect(unchanged.prepare('SELECT local_id FROM recipients').get()).toEqual({ local_id: uid(1) });
  unchanged.close();
});
