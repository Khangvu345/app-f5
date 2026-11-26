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

// Jest permits mock-prefixed variables in the hoisted module factory.
// eslint-disable-next-line @typescript-eslint/naming-convention
let mockShouldFailMergeCommit = false;

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
    let isTargetAttached = false;
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
        if (action === 'run' && /ATTACH DATABASE .* AS target/i.test(sql)) isTargetAttached = true;
        if (
          action === 'exec' &&
          sql === 'COMMIT' &&
          isTargetAttached &&
          mockShouldFailMergeCommit
        ) {
          mockShouldFailMergeCommit = false;
          reject(new Error('injected merge commit failure'));
          return;
        }
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
  mockShouldFailMergeCommit = false;
  for (const file of readdirSync(mockDirectory)) {
    rmSync(mockJoin(mockDirectory, file), { force: true });
  }
});

afterAll(() => rmSync(mockDirectory, { recursive: true, force: true }));

const recipient = (id: string) => ({
  sql: "INSERT INTO profile.recipients(local_id,name,relationship) VALUES(?,?,'FRIEND')",
  params: [id, 'Friend'],
});
const id = (n: number) => String(n);

test('quota, idempotence, rollback, and cross-file profile merge use real SQLite', async () => {
  const guest = await openGuestProfile();
  const create = (n: number) =>
    guardedCreate({
      profile: guest,
      kind: 'recipient',
      operationId: `r${n}`,
      statements: [recipient(id(n))],
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
      statements: [recipient(id(2)), recipient(id(2))],
    }),
  ).rejects.toThrow();
  expect((await getTrialUsage()).recipient).toBe(1);
  expect((await Promise.all([create(2), create(3)])).sort()).toEqual(['created', 'limit-reached']);
  const account = await linkGuestProfile('9007199254740993');
  const guest2 = await openGuestProfile();
  const source = new MockDatabaseSync(mockJoin(mockDirectory, guest2.dbName));
  source.exec(`PRAGMA foreign_keys=ON; BEGIN;
    INSERT INTO recipients(local_id,name,relationship) VALUES ('${id(10)}','Second','FAMILY');
    INSERT INTO events(local_id,anchor_recipient_id,title,event_type,original_day,original_month) VALUES ('${id(11)}','${id(10)}','Birthday','BIRTHDAY',1,1);
    INSERT INTO event_recipients(event_id,recipient_id) VALUES ('${id(11)}','${id(10)}');
    INSERT INTO event_occurrences(local_id,event_id,anchor_recipient_id,local_date) VALUES ('${id(12)}','${id(11)}','${id(10)}','2027-01-01');
    INSERT INTO occurrence_recipients(occurrence_id,recipient_id) VALUES ('${id(12)}','${id(10)}');
    INSERT INTO reminder_rules(local_id,event_id,days_before) VALUES ('${id(13)}','${id(11)}',1);
    INSERT INTO notification_schedules(occurrence_id,days_before,event_id,scheduled_at,local_notification_id,status) VALUES ('${id(12)}',1,'${id(11)}','2026-12-31T09:00:00Z','os-123','SCHEDULED');
    INSERT INTO gifts(local_id,recipient_id,name) VALUES ('${id(14)}','${id(10)}','Gift'); COMMIT;`);
  source.close();
  const reminder = {
    profile: guest2,
    operationId: 'reminder-recover',
    request: { date: '2027-01-01' },
    statements: [
      {
        sql: 'INSERT INTO profile.reminder_rules(local_id,event_id,days_before) VALUES(?,?,?)',
        params: [id(15), id(11), 3],
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
    `INSERT INTO recipients(local_id,name,relationship) VALUES ('${id(100)}','Seed','FRIEND')`,
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
          params: [id(n), id(100)],
        },
        {
          sql: 'INSERT INTO profile.event_recipients(event_id,recipient_id) VALUES(?,?)',
          params: [id(n), id(100)],
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
          params: [id(n), id(100)],
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
        params: [id(n), id(101), days],
      },
    ],
  });
  const failed = reminder(120, 7);
  failed.statements.push({
    sql: 'INSERT INTO profile.reminder_rules(local_id,event_id,days_before) VALUES(?,?,?)',
    params: [id(120), id(101), 7],
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
    require('node:fs').writeSync(1, 'transaction-open');
    process.kill(process.pid, 'SIGKILL');
  `;
  const child = spawnSync(process.execPath, ['-e', script, registry, file, id(200)]);
  expect(child.error).toBeUndefined();
  expect(child.stdout.toString()).toBe('transaction-open');
  if (process.platform === 'win32') {
    expect(child.status).toEqual(expect.any(Number));
    expect(child.status).not.toBe(0);
  } else {
    expect(child.signal).toBe('SIGKILL');
  }
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
      statements: [recipient(id(301))],
    }),
  ).toBe('created');
  const accountA = await linkGuestProfile('1001', guestA);
  const guestB = await openGuestProfile();
  expect(
    await guardedCreate({
      profile: guestB,
      kind: 'recipient',
      operationId: 'account-b-recipient',
      statements: [recipient(id(302))],
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
      .prepare('SELECT CAST(local_id AS TEXT) AS local_id FROM recipients')
      .all()
      .map((row) => row.local_id),
  ).toEqual([id(301)]);
  expect(
    dbB
      .prepare('SELECT CAST(local_id AS TEXT) AS local_id FROM recipients')
      .all()
      .map((row) => row.local_id),
  ).toEqual([id(302)]);
  dbA.close();
  dbB.close();
  const nextGuest = await openGuestProfile();
  expect((await getTrialUsage()).recipient).toBe(2);
  expect(
    await guardedCreate({
      profile: nextGuest,
      kind: 'recipient',
      operationId: 'third-recipient',
      statements: [recipient(id(303))],
    }),
  ).toBe('limit-reached');
});

test('colliding 64-bit IDs remap relationships and survive interrupted merge', async () => {
  const original = await openGuestProfile();
  const seed = (file: string, person: string, osId: string) => {
    const db = new MockDatabaseSync(mockJoin(mockDirectory, file));
    db.exec(`PRAGMA foreign_keys=ON; BEGIN;
      INSERT INTO recipients(local_id,name,relationship) VALUES(1,'${person}','FRIEND');
      INSERT INTO events(local_id,anchor_recipient_id,title,event_type,original_day,original_month)
        VALUES(9007199254740993,1,'${person} event','BIRTHDAY',1,1);
      INSERT INTO event_recipients(event_id,recipient_id) VALUES(9007199254740993,1);
      INSERT INTO event_occurrences(local_id,event_id,anchor_recipient_id,local_date)
        VALUES(9007199254740993,9007199254740993,1,'2027-01-01');
      INSERT INTO occurrence_recipients(occurrence_id,recipient_id) VALUES(9007199254740993,1);
      INSERT INTO reminder_rules(local_id,event_id,days_before) VALUES(9007199254740993,9007199254740993,1);
      INSERT INTO notification_schedules(occurrence_id,days_before,event_id,scheduled_at,local_notification_id,status)
        VALUES(9007199254740993,1,9007199254740993,'2026-12-31T09:00:00Z','${osId}','SCHEDULED');
      INSERT INTO gifts(local_id,recipient_id,occurrence_id,name) VALUES(9007199254740993,1,9007199254740993,'${person} gift');
      INSERT INTO expenses(local_id,gift_id,occurrence_id,expense_type,amount_x100,occurred_at) VALUES(9007199254740993,9007199254740993,9007199254740993,'GIFT',12345,'2027-01-01');
      INSERT INTO budgets(local_id,scope_type,occurrence_id,amount_x100) VALUES(9007199254740993,'EVENT',9007199254740993,54321);
      INSERT INTO occurrence_tasks(local_id,occurrence_id,gift_id,title) VALUES(9007199254740993,9007199254740993,9007199254740993,'${person} task'); COMMIT;`);
    db.close();
  };
  seed(original.dbName, 'Account', 'os-account');
  const account = await linkGuestProfile('9007199254740993', original);
  const guest = await openGuestProfile();
  seed(guest.dbName, 'Guest', 'os-guest');
  const extra = new MockDatabaseSync(mockJoin(mockDirectory, guest.dbName));
  extra.exec(
    "INSERT INTO recipients(local_id,name,relationship) VALUES(9007199254740995,'Large guest','FRIEND')",
  );
  extra.exec(
    "INSERT INTO recipients(local_id,name,relationship) VALUES(2,'Free key guest','FRIEND')",
  );
  extra.close();
  mockShouldFailMergeCommit = true;
  await expect(linkGuestProfile('9007199254740993', guest)).rejects.toThrow(
    'injected merge commit failure',
  );
  expect((await openGuestProfile()).dbName).toBe(guest.dbName);
  const interrupted = new MockDatabaseSync(mockJoin(mockDirectory, account.dbName));
  expect(interrupted.prepare('SELECT count(*) AS count FROM recipients').get()?.count).toBe(1);
  expect(interrupted.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  interrupted.close();
  expect((await linkGuestProfile('9007199254740993', guest)).dbName).toBe(account.dbName);
  expect((await linkGuestProfile('9007199254740993', guest)).dbName).toBe(account.dbName);
  const db = new MockDatabaseSync(mockJoin(mockDirectory, account.dbName));
  const rows = db
    .prepare(
      `SELECT r.name, g.name AS gift, e.title, ns.local_notification_id,
      CAST(r.local_id AS TEXT) AS recipient_id, CAST(e.local_id AS TEXT) AS event_id,
        ex.amount_x100, b.amount_x100 AS budget, task.title AS task
    FROM recipients r JOIN gifts g ON g.recipient_id=r.local_id
    JOIN event_recipients er ON er.recipient_id=r.local_id
    JOIN events e ON e.local_id=er.event_id AND e.anchor_recipient_id=r.local_id
    JOIN event_occurrences o ON o.event_id=e.local_id AND o.anchor_recipient_id=r.local_id AND g.occurrence_id=o.local_id
    JOIN expenses ex ON ex.gift_id=g.local_id AND ex.occurrence_id=o.local_id
    JOIN budgets b ON b.occurrence_id=o.local_id
    JOIN occurrence_tasks task ON task.gift_id=g.local_id AND task.occurrence_id=o.local_id
    JOIN occurrence_recipients ore ON ore.occurrence_id=o.local_id AND ore.recipient_id=r.local_id
    JOIN reminder_rules rr ON rr.event_id=e.local_id
    JOIN notification_schedules ns ON ns.event_id=e.local_id AND ns.occurrence_id=o.local_id AND ns.days_before=rr.days_before
    ORDER BY r.name`,
    )
    .all();
  expect(rows).toHaveLength(2);
  expect(
    rows.map(({ name, gift, title, local_notification_id: notificationId }) => ({
      name,
      gift,
      title,
      local_notification_id: notificationId,
    })),
  ).toEqual([
    {
      name: 'Account',
      gift: 'Account gift',
      title: 'Account event',
      local_notification_id: 'os-account',
    },
    { name: 'Guest', gift: 'Guest gift', title: 'Guest event', local_notification_id: 'os-guest' },
  ]);
  expect(
    rows.map(({ amount_x100: amount, budget, task }) => ({ amount_x100: amount, budget, task })),
  ).toEqual([
    { amount_x100: 12345, budget: 54321, task: 'Account task' },
    { amount_x100: 12345, budget: 54321, task: 'Guest task' },
  ]);
  expect(
    db.prepare("SELECT CAST(local_id AS TEXT) AS id FROM recipients WHERE name='Large guest'").get()
      ?.id,
  ).toBe('9007199254740995');
  expect(
    db
      .prepare("SELECT CAST(local_id AS TEXT) AS id FROM recipients WHERE name='Free key guest'")
      .get()?.id,
  ).toBe('2');
  expect(rows[0].event_id).toBe('9007199254740993');
  expect(rows[0].recipient_id).not.toBe(rows[1].recipient_id);
  expect(rows[0].event_id).not.toBe(rows[1].event_id);
  expect(db.prepare('SELECT count(*) AS count FROM notification_schedules').get()?.count).toBe(2);
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  db.close();
});
