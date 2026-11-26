import type { LocalStatement } from '@/types/local-storage';

import type { RecipientFormValues } from '../types/recipients.types';

export const NAME_MAX = 150;
export const NOTES_MAX = 500;
export const PREFERENCE_MAX = 200;
/** Danh mục cố định cho sở thích/điều cần tránh do người dùng nhập tay. */
export const PREFERENCE_CATEGORY = 'general';

export interface FormErrors {
  name?: string;
  birth?: string;
  notes?: string;
}

export interface BirthParts {
  day: number | null;
  month: number | null;
  year: number | null;
}

function parseInteger(text: string): number | null {
  const trimmed = text.trim();
  return /^[0-9]+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Ô trống hoàn toàn là hợp lệ (không có ngày sinh). Ngày và tháng phải đi cùng nhau. */
export function parseBirth(
  dayText: string,
  monthText: string,
  yearText: string,
): { parts: BirthParts; error: string | null } {
  const empty: BirthParts = { day: null, month: null, year: null };
  if (!dayText.trim() && !monthText.trim() && !yearText.trim()) {
    return { parts: empty, error: null };
  }
  if (!dayText.trim() || !monthText.trim()) {
    return { parts: empty, error: 'Hãy nhập cả ngày và tháng sinh.' };
  }
  const day = parseInteger(dayText);
  const month = parseInteger(monthText);
  const year = yearText.trim() ? parseInteger(yearText) : null;
  if (day === null || month === null || (yearText.trim() !== '' && year === null)) {
    return { parts: empty, error: 'Ngày sinh chỉ gồm chữ số.' };
  }
  if (year !== null && (year < 1 || year > 9999)) {
    return { parts: empty, error: 'Năm sinh không hợp lệ.' };
  }
  const probeYear = year ?? 2000;
  const probe = new Date(Date.UTC(2000, month - 1, day));
  probe.setUTCFullYear(probeYear, month - 1, day);
  const isValid =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    probe.getUTCFullYear() === probeYear &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day;
  if (!isValid) return { parts: empty, error: 'Ngày sinh không tồn tại.' };
  return { parts: { day, month, year }, error: null };
}

export function validateForm(values: RecipientFormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Hãy nhập tên hoặc cách gọi.';
  else if (name.length > NAME_MAX) errors.name = `Tên tối đa ${NAME_MAX} ký tự.`;
  const birthError = parseBirth(values.birthDay, values.birthMonth, values.birthYear).error;
  if (birthError) errors.birth = birthError;
  if (values.notes.length > NOTES_MAX) errors.notes = `Ghi chú tối đa ${NOTES_MAX} ký tự.`;
  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Bỏ mục trống, cắt khoảng trắng và loại trùng (không phân biệt hoa thường). */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const value = tag.trim();
    const key = value.toLowerCase();
    if (!value || value.length > PREFERENCE_MAX || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

const INSERT_PREFERENCE =
  'INSERT INTO profile.recipient_preferences (recipient_id, category, value, polarity) VALUES ((SELECT MAX(local_id) FROM profile.recipients), ?, ?, ?)';

/**
 * Câu lệnh cho `guardedCreate`: câu đầu tạo người nhận, các câu sau gắn sở thích vào người vừa tạo.
 * Mọi câu lệnh đều bắt đầu bằng `INSERT INTO profile.`.
 */
export function buildCreateStatements(values: RecipientFormValues): LocalStatement[] {
  const { parts } = parseBirth(values.birthDay, values.birthMonth, values.birthYear);
  const notes = values.notes.trim();
  const statements: LocalStatement[] = [
    {
      sql: 'INSERT INTO profile.recipients (name, relationship, age_group, birth_day, birth_month, birth_year, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [
        values.name.trim(),
        values.relationship,
        values.ageGroup,
        parts.day,
        parts.month,
        parts.year,
        notes ? notes : null,
      ],
    },
  ];
  for (const value of normalizeTags(values.likes)) {
    statements.push({ sql: INSERT_PREFERENCE, params: [PREFERENCE_CATEGORY, value, 'LIKE'] });
  }
  for (const value of normalizeTags(values.avoids)) {
    statements.push({ sql: INSERT_PREFERENCE, params: [PREFERENCE_CATEGORY, value, 'AVOID'] });
  }
  return statements;
}
