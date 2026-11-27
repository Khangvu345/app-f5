import type { RecipientFormValues } from '../types/recipients.types';

import { buildCreateStatements, normalizeTags, parseBirth, validateForm } from './recipientForm';

const BASE: RecipientFormValues = {
  name: ' Mẹ ',
  relationship: 'FAMILY',
  ageGroup: null,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  likes: ['Trồng cây', 'trồng cây', ' '],
  avoids: ['Đồ ngọt'],
  notes: '',
};

describe('recipientForm', () => {
  it('requires a name', () => {
    expect(validateForm({ ...BASE, name: '  ' }).name).toBeDefined();
  });

  it('accepts an empty birth date', () => {
    expect(parseBirth('', '', '').error).toBeNull();
  });

  it('requires day and month together', () => {
    expect(parseBirth('3', '', '').error).not.toBeNull();
  });

  it('rejects a date that does not exist', () => {
    expect(parseBirth('31', '2', '').error).not.toBeNull();
    expect(parseBirth('29', '2', '2023').error).not.toBeNull();
  });

  it('accepts 29/2 without a year', () => {
    expect(parseBirth('29', '2', '').parts).toEqual({ day: 29, month: 2, year: null });
  });

  it('removes blank and duplicate tags', () => {
    expect(normalizeTags(['A', 'a', ' ', 'B'])).toEqual(['A', 'B']);
  });

  it('builds statements that all insert into the profile schema', () => {
    const statements = buildCreateStatements(BASE);
    expect(statements).toHaveLength(3);
    expect(statements[0].sql).toMatch(/^INSERT INTO profile\.recipients \(/);
    for (const statement of statements) {
      expect(statement.sql).toMatch(/^INSERT INTO profile\./);
    }
    expect(statements[0].params?.[0]).toBe('Mẹ');
    expect(statements[2].params).toEqual(['general', 'Đồ ngọt', 'AVOID']);
  });
});
