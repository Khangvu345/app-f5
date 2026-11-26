import type { EventDraft } from '../types/events.types';

import { buildCreateEventStatements } from './event-statements';

const draft: EventDraft = {
  title: ' Sinh nhật mẹ ',
  eventType: 'BIRTHDAY',
  recipientIds: ['3', '5'],
  primaryRecipientId: '5',
  calendarType: 'SOLAR',
  day: 15,
  month: 6,
  year: null,
  isLeapMonth: false,
  isRecurring: true,
  leapDayPolicy: null,
  endDate: null,
  defaultBudget: 500000,
  notes: '',
};

describe('buildCreateEventStatements', () => {
  const statements = buildCreateEventStatements(draft, ['2026-06-15', '2027-06-15']);

  it('starts with the events insert and only inserts into profile tables', () => {
    expect(statements[0].sql).toMatch(/^\s*INSERT\s+INTO\s+profile\.events\s*\(/i);
    for (const statement of statements) {
      expect(statement.sql).toMatch(/^\s*INSERT\s+INTO\s+profile\./i);
    }
  });

  it('binds the anchor, trimmed title and budget x100', () => {
    expect(statements[0].params?.slice(0, 2)).toEqual([5, 'Sinh nhật mẹ']);
    expect(statements[0].params).toContain(50000000);
    expect(statements[0].params).toContain('ANNUAL');
  });

  it('links every recipient with exactly one primary', () => {
    const members = statements.filter((s) => s.sql.includes('profile.event_recipients'));
    expect(members.map((s) => s.params)).toEqual([
      [3, 0],
      [5, 1],
    ]);
  });

  it('creates occurrences and their recipients for each date', () => {
    expect(
      statements.filter((s) => /^INSERT INTO profile\.event_occurrences/.test(s.sql)),
    ).toHaveLength(2);
    expect(statements.filter((s) => s.sql.includes('profile.occurrence_recipients'))).toHaveLength(
      4,
    );
  });
});
