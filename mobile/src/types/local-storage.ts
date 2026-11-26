export interface LocalProfile {
  dbName: string;
  serverUserId: string | null;
}

export type TrialKind = 'recipient' | 'event' | 'reminder' | 'idea';
export type SqlValue = string | number | null;
export interface LocalStatement {
  sql: string;
  params?: SqlValue[];
}
export interface GuardedWrite {
  profile: LocalProfile;
  kind: Exclude<TrialKind, 'reminder'>;
  operationId: string;
  statements: LocalStatement[];
}

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface ReminderWrite {
  profile: LocalProfile;
  operationId: string;
  request: JsonValue;
  statements: LocalStatement[];
}

/** Implementations must use operationId as a stable OS identifier and find an existing
 * schedule before creating one, including after an interrupted call. False means the
 * OS definitively rejected the schedule; throw when the outcome is unknown. */
export interface ReminderScheduler {
  ensureScheduled(operationId: string, request: JsonValue): Promise<boolean>;
  /** True only after the OS schedule is known to be absent. */
  cancelScheduled(operationId: string): Promise<boolean>;
}
