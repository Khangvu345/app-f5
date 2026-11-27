import * as SQLite from 'expo-sqlite';

import type { LocalProfile, SqlValue } from '@/types/local-storage';

/**
 * Truy cập SQLite của hồ sơ hiện tại cho các thao tác đọc và sửa/xóa.
 * Thao tác TẠO bản ghi người nhận, sự kiện, ý tưởng quà và mốc nhắc phải đi qua
 * `guardedCreate` / `scheduleReminder` trong `local-storage.ts` để áp hạn mức dùng thử.
 */
export type ProfileDb = SQLite.SQLiteDatabase;

export async function withProfileDb<T>(
  profile: LocalProfile,
  work: (db: ProfileDb) => Promise<T>,
): Promise<T> {
  const db = await SQLite.openDatabaseAsync(profile.dbName, { useNewConnection: true });
  try {
    await db.execAsync('PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON');
    return await work(db);
  } finally {
    await db.closeAsync();
  }
}

export async function queryAll<T>(
  profile: LocalProfile,
  sql: string,
  params: SqlValue[] = [],
): Promise<T[]> {
  return withProfileDb(profile, (db) => db.getAllAsync<T>(sql, params));
}

export async function queryFirst<T>(
  profile: LocalProfile,
  sql: string,
  params: SqlValue[] = [],
): Promise<T | null> {
  return withProfileDb(profile, (db) => db.getFirstAsync<T>(sql, params));
}

/** Chạy nhiều câu lệnh trong một giao dịch. Lỗi sẽ rollback toàn bộ. */
export async function runInTransaction(
  profile: LocalProfile,
  work: (db: ProfileDb) => Promise<void>,
): Promise<void> {
  await withProfileDb(profile, async (db) => {
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      await work(db);
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK').catch(() => undefined);
      throw error;
    }
  });
}

/** ID cục bộ là số nguyên 64 bit; ở biên TypeScript luôn dùng chuỗi thập phân. */
export function toLocalId(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error('ID không hợp lệ');
  return Number(value);
}

/** Số tiền lưu dạng nguyên = số tiền × 100. */
export function toAmountX100(amount: number): number {
  return Math.round(amount * 100);
}

export function fromAmountX100(amountX100: number): number {
  return amountX100 / 100;
}

export function newOperationId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
