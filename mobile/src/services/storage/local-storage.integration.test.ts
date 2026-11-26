/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as mockJoin } from 'node:path';
import { DatabaseSync as MockDatabaseSync } from 'node:sqlite';
import { Worker as MockWorker } from 'node:worker_threads';

import {
  getTrialUsage,
  guardedCreate,
  linkGuestProfile,
  openGuestProfile,
  openAccountProfile,
  scheduleReminder,
  reconcileReminders,
} from './local-storage';

jest.setTimeout(30000);

const mockDirectory = mkdtempSync(mockJoin(tmpdir(), 'giftmate-sqlite-'));

jest.mock('expo-sqlite', () => ({
  get defaultDatabaseDirectory() {
    return mockDirectory;
  },
  openDatabaseAsync: async (name: string) => {
    const worker = new MockWorker(
      `
      const { parentPort, workerData } = require('node:worker_threads');
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(workerData);
      parentPort.on('message', ({ id, action, sql, params }) => {
        try {
          let value;
          if (action === 'exec') db.exec(sql);
          if (action === 'run') { const r = db.prepare(sql).run(...params); value = { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) }; }
          if (action === 'first') value = db.prepare(sql).get(...params) ?? null;
          if (action === 'all') value = db.prepare(sql).all(...params);
          if (action === 'close') db.close();
          parentPort.postMessage({ id, value });
        } catch (error) { parentPort.postMessage({ id, error: String(error) }); }
      });
    `,
      { eval: true, workerData: mockJoin(mockDirectory, name) },
    );
    let next = 0;
    const pending = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
    worker.on('message', ({ id, value, error }) => {
      const request = pending.get(id);
      pending.delete(id);
      if (error) request?.reject(new Error(error));
      else request?.resolve(value);
    });
    const call = (action: string, sql = '', params: (string | number | null)[] = []) =>
      new Promise<unknown>((resolve, reject) => {
        const id = next++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, action, sql, params });
      });
    return {
      execAsync: (sql: string) => call('exec', sql),
      runAsync: (sql: string, ...params: (string | number | null)[]) => call('run', sql, params),
      getFirstAsync: (sql: string, ...params: (string | number | null)[]) =>
        call('first', sql, params),
      getAllAsync: (sql: string, ...params: (string | number | null)[]) => call('all', sql, params),
      closeAsync: async () => {
        await call('close');
        await worker.terminate();
      },
    };
  },
}));

beforeEach(() => {
  for (const file of readdirSync(mockDirectory)) {
    rmSync(mockJoin(mockDirectory, file), { force: true });
  }
});

afterAll(() => rmSync(mockDirectory, { recursive: true, force: true }));

const recipient = (id: string) => ({
  sql: "INSERT INTO profile.recipients(local_id,name,relationship) VALUES(?,?,'FRIEND')",
  params: [id, 'Friend'],
});
const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

test('quota, idempotence, rollback, and cross-file profile merge use real SQLite', async () => {
  const guest = await openGuestProfile();
  const create = (n: number) =>
    guardedCreate({
      profile: guest,
      kind: 'recipient',
      operationId: `r${n}`,
      statements: [recipient(uuid(n))],
    });
  expect(
    await create(1).catch((e) => {
      throw new Error('first recipient: ' + e.message);
    }),
  ).toBe('created');
  expect(await create(1)).toBe('already-created');
  await expect(
    guardedCreate({
      profile: guest,
      kind: 'recipient',
      operationId: 'bad',
      statements: [recipient(uuid(2)), recipient(uuid(2))],
    }),
  ).rejects.toThrow();
  expect((await getTrialUsage()).recipient).toBe(1);
  expect((await Promise.all([create(2), create(3)])).sort()).toEqual(['created', 'limit-reached']);
  const account = await linkGuestProfile('9007199254740993');
  const guest2 = await openGuestProfile();
  const source = new MockDatabaseSync(mockJoin(mockDirectory, guest2.dbName));
  source.exec(`PRAGMA foreign_keys=ON; BEGIN;
    INSERT INTO recipients(local_id,name,relationship) VALUES ('${uuid(10)}','Second','FAMILY');
    INSERT INTO events(local_id,anchor_recipient_id,title,event_type,original_day,original_month) VALUES ('${uuid(11)}','${uuid(10)}','Birthday','BIRTHDAY',1,1);
    INSERT INTO event_recipients(event_id,recipient_id) VALUES ('${uuid(11)}','${uuid(10)}');
    INSERT INTO event_occurrences(local_id,event_id,anchor_recipient_id,local_date) VALUES ('${uuid(12)}','${uuid(11)}','${uuid(10)}','2027-01-01');
    INSERT INTO occurrence_recipients(occurrence_id,recipient_id) VALUES ('${uuid(12)}','${uuid(10)}');
    INSERT INTO reminder_rules(local_id,event_id,days_before) VALUES ('${uuid(13)}','${uuid(11)}',1);
    INSERT INTO notification_schedules(occurrence_id,days_before,event_id,scheduled_at,local_notification_id,status) VALUES ('${uuid(12)}',1,'${uuid(11)}','2026-12-31T09:00:00Z','os-123','SCHEDULED');
    INSERT INTO gifts(local_id,recipient_id,name) VALUES ('${uuid(14)}','${uuid(10)}','Gift'); COMMIT;`);
  source.close();
  const reminder = {
    profile: guest2,
    operationId: 'reminder-recover',
    request: { date: '2027-01-01' },
    statements: [
      {
        sql: 'INSERT INTO profile.reminder_rules(local_id,event_id,days_before) VALUES(?,?,?)',
        params: [uuid(15), uuid(11), 3],
      },
    ],
  };
  const rejected = { ...reminder, operationId: 'reminder-rejected' };
  expect(
    await scheduleReminder(rejected, {
      ensureScheduled: async () => false,
      cancelScheduled: async () => true,
    }),
  ).toBe('rejected');
  let calls = 0;
  const scheduler = {
    ensureScheduled: async () => {
      calls++;
      if (calls === 1) throw new Error('unknown outcome');
      return true;
    },
    cancelScheduled: async () => true,
  };
  await expect(scheduleReminder(reminder, scheduler)).rejects.toThrow('unknown outcome');
  await reconcileReminders(scheduler);
  expect(await scheduleReminder(reminder, scheduler)).toBe('already-created');
  expect((await getTrialUsage()).reminder).toBe(1);
  // Simulate a prior complete import with the same rows and OS notification ID.
  const preexisting = new MockDatabaseSync(mockJoin(mockDirectory, account.dbName));
  preexisting.exec('PRAGMA foreign_keys=ON');
  preexisting.prepare('ATTACH DATABASE ? AS source').run(mockJoin(mockDirectory, guest2.dbName));
  preexisting.exec('BEGIN; PRAGMA defer_foreign_keys=ON');
  for (const table of [
    'recipients',
    'event_recipients',
    'events',
    'occurrence_recipients',
    'event_occurrences',
    'reminder_rules',
    'notification_schedules',
    'gifts',
  ]) {
    const columns = preexisting
      .prepare(`PRAGMA source.table_info(${table})`)
      .all()
      .map((row) => `"${row.name}"`)
      .join(',');
    preexisting.exec(
      `INSERT INTO main.${table} (${columns}) SELECT ${columns} FROM source.${table}`,
    );
  }
  preexisting.exec('COMMIT');
  preexisting.close();
  expect((await linkGuestProfile('9007199254740993', guest2)).dbName).toBe(account.dbName);
  const freshGuest = await openGuestProfile();
  expect((await linkGuestProfile('9007199254740993', guest2)).dbName).toBe(account.dbName);
  expect((await openGuestProfile()).dbName).toBe(freshGuest.dbName);
  await expect(linkGuestProfile('999', guest2)).rejects.toThrow('another account');
  const db = new MockDatabaseSync(mockJoin(mockDirectory, account.dbName));
  expect(db.prepare('SELECT server_user_id FROM local_profile').get()?.server_user_id).toBe(
    '9007199254740993',
  );
  expect(db.prepare('SELECT count(*) AS count FROM recipients').get()?.count).toBe(3);
  expect(
    db.prepare('SELECT local_notification_id FROM notification_schedules').get()
      ?.local_notification_id,
  ).toBe('os-123');
  expect(db.prepare('SELECT count(*) AS count FROM gifts').get()?.count).toBe(1);
  expect(db.prepare('SELECT count(*) AS count FROM notification_schedules').get()?.count).toBe(1);
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  db.close();
});

test('event, idea and reminder trial boundaries, races and compensation', async () => {
  const profile = await openGuestProfile();
  const source = new MockDatabaseSync(mockJoin(mockDirectory, profile.dbName));
  source.exec(
    `INSERT INTO recipients(local_id,name,relationship) VALUES ('${uuid(100)}','Seed','FRIEND')`,
  );
  source.close();
  const event = (n: number) =>
    guardedCreate({
      profile,
      kind: 'event',
      operationId: `e${n}`,
      statements: [
        {
          sql: "INSERT INTO profile.events(local_id,anchor_recipient_id,title,event_type,original_day,original_month) VALUES(?,?,'Event','BIRTHDAY',1,1)",
          params: [uuid(n), uuid(100)],
        },
        {
          sql: 'INSERT INTO profile.event_recipients(event_id,recipient_id) VALUES(?,?)',
          params: [uuid(n), uuid(100)],
        },
      ],
    });
  expect(await event(101)).toBe('created');
  expect(await event(101)).toBe('already-created');
  expect(await event(102)).toBe('created');
  expect((await Promise.all([event(103), event(104)])).sort()).toEqual([
    'created',
    'limit-reached',
  ]);
  expect(await event(105)).toBe('limit-reached');
  const idea = (n: number) =>
    guardedCreate({
      profile,
      kind: 'idea',
      operationId: `i${n}`,
      statements: [
        {
          sql: "INSERT INTO profile.gifts(local_id,recipient_id,name) VALUES(?,?,'Gift')",
          params: [uuid(n), uuid(100)],
        },
      ],
    });
  for (const n of [110, 111, 112, 113]) expect(await idea(n)).toBe('created');
  expect(await idea(110)).toBe('already-created');
  expect((await Promise.all([idea(114), idea(115)])).sort()).toEqual(['created', 'limit-reached']);
  expect(await idea(116)).toBe('limit-reached');
  const scheduler = { ensureScheduled: async () => true, cancelScheduled: async () => true };
  const reminder = (n: number, days: number) => ({
    profile,
    operationId: `rem${n}`,
    request: { days },
    statements: [
      {
        sql: 'INSERT INTO profile.reminder_rules(local_id,event_id,days_before) VALUES(?,?,?)',
        params: [uuid(n), uuid(101), days],
      },
    ],
  });
  const failed = reminder(120, 7);
  failed.statements.push({
    sql: 'INSERT INTO profile.reminder_rules(local_id,event_id,days_before) VALUES(?,?,?)',
    params: [uuid(120), uuid(101), 7],
  });
  await expect(scheduleReminder(failed, scheduler)).rejects.toThrow();
  expect((await getTrialUsage()).reminder).toBe(0);
  const uncancelled = { ...failed, operationId: 'uncancelled' };
  await expect(
    scheduleReminder(uncancelled, { ...scheduler, cancelScheduled: async () => false }),
  ).rejects.toThrow();
  // An uncertain OS cancellation retains a reservation and cannot silently spend it twice.
  expect((await getTrialUsage()).reminder).toBe(0);
  const registry = new MockDatabaseSync(mockJoin(mockDirectory, 'giftmate-installation.db'));
  expect(
    registry.prepare("SELECT state FROM operations WHERE operation_id='uncancelled'").get()?.state,
  ).toBe('pending');
  registry.close();
  // Recover after the scheduler can confirm cancellation.
  await expect(reconcileReminders(scheduler)).rejects.toThrow();
  for (const [n, days] of [
    [121, 14],
    [122, 3],
    [123, 0],
  ]) {
    expect(await scheduleReminder(reminder(n, days), scheduler)).toBe('created');
  }
  expect(await scheduleReminder(reminder(121, 14), scheduler)).toBe('already-created');
  expect(await scheduleReminder(reminder(124, 1), scheduler)).toBe('limit-reached');
  expect(await getTrialUsage()).toEqual({ recipient: 0, event: 3, idea: 5, reminder: 3 });
});

test('process crash during attached database transaction leaves no partial record or quota', async () => {
  const profile = await openGuestProfile();
  const registry = mockJoin(mockDirectory, 'giftmate-installation.db');
  const file = mockJoin(mockDirectory, profile.dbName);
  const script = `
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(process.argv[1]);
    db.exec("PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON");
    db.prepare("ATTACH DATABASE ? AS profile").run(process.argv[2]);
    db.exec("PRAGMA profile.journal_mode=DELETE; BEGIN IMMEDIATE");
    db.prepare("INSERT INTO profile.recipients(local_id,name,relationship) VALUES(?,'Crash','FRIEND')").run(process.argv[3]);
    db.prepare("INSERT INTO operations(operation_id,kind,profile_id,state,charged) VALUES('crash-op','recipient',(SELECT id FROM profiles WHERE is_guest=1),'confirmed',1)").run();
    process.kill(process.pid, 'SIGKILL');
  `;
  const child = spawnSync(process.execPath, ['-e', script, registry, file, uuid(200)]);
  expect(child.signal).toBe('SIGKILL');
  expect((await getTrialUsage()).recipient).toBe(0);
  const db = new MockDatabaseSync(file);
  expect(db.prepare('SELECT count(*) AS count FROM recipients').get()?.count).toBe(0);
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  db.close();
});

test('account A and B reopen separate profiles while installation usage persists', async () => {
  const guestA = await openGuestProfile();
  expect(
    await guardedCreate({
      profile: guestA,
      kind: 'recipient',
      operationId: 'account-a-recipient',
      statements: [recipient(uuid(301))],
    }),
  ).toBe('created');
  const accountA = await linkGuestProfile('1001', guestA);
  const guestB = await openGuestProfile();
  expect(
    await guardedCreate({
      profile: guestB,
      kind: 'recipient',
      operationId: 'account-b-recipient',
      statements: [recipient(uuid(302))],
    }),
  ).toBe('created');
  const accountB = await linkGuestProfile('1002', guestB);
  expect(accountA.dbName).not.toBe(accountB.dbName);
  expect((await openAccountProfile('1001')).dbName).toBe(accountA.dbName);
  expect((await openAccountProfile('1002')).dbName).toBe(accountB.dbName);
  const dbA = new MockDatabaseSync(mockJoin(mockDirectory, accountA.dbName));
  const dbB = new MockDatabaseSync(mockJoin(mockDirectory, accountB.dbName));
  expect(
    dbA
      .prepare('SELECT local_id FROM recipients')
      .all()
      .map((row) => row.local_id),
  ).toEqual([uuid(301)]);
  expect(
    dbB
      .prepare('SELECT local_id FROM recipients')
      .all()
      .map((row) => row.local_id),
  ).toEqual([uuid(302)]);
  dbA.close();
  dbB.close();
  const nextGuest = await openGuestProfile();
  expect((await getTrialUsage()).recipient).toBe(2);
  expect(
    await guardedCreate({
      profile: nextGuest,
      kind: 'recipient',
      operationId: 'third-recipient',
      statements: [recipient(uuid(303))],
    }),
  ).toBe('limit-reached');
});

test('same key with differing source data aborts merge without losing either row', async () => {
  const original = await openGuestProfile();
  const first = new MockDatabaseSync(mockJoin(mockDirectory, original.dbName));
  first
    .prepare(
      "INSERT INTO recipients(local_id,name,relationship) VALUES(?, 'Account value', 'FRIEND')",
    )
    .run(uuid(400));
  first.close();
  const account = await linkGuestProfile('4001', original);
  const guest = await openGuestProfile();
  const second = new MockDatabaseSync(mockJoin(mockDirectory, guest.dbName));
  second
    .prepare(
      "INSERT INTO recipients(local_id,name,relationship) VALUES(?, 'Guest value', 'FRIEND')",
    )
    .run(uuid(400));
  second.close();
  await expect(linkGuestProfile('4001', guest)).rejects.toThrow(
    'Profile merge conflict in recipients',
  );
  expect((await openGuestProfile()).dbName).toBe(guest.dbName);
  const dbA = new MockDatabaseSync(mockJoin(mockDirectory, account.dbName));
  const dbG = new MockDatabaseSync(mockJoin(mockDirectory, guest.dbName));
  expect(dbA.prepare('SELECT name FROM recipients').get()?.name).toBe('Account value');
  expect(dbG.prepare('SELECT name FROM recipients').get()?.name).toBe('Guest value');
  dbA.close();
  dbG.close();
});
