import type {
  EventDraft,
  EventFormFields,
  EventRecord,
  EventType,
  OccasionType,
  RecurrenceRule,
} from '../types/events.types';

import { isValidYmd } from './dates';

export type DraftErrors = Partial<
  Record<'title' | 'recipients' | 'date' | 'year' | 'budget' | 'notes', string>
>;

export function occasionTypeFor(eventType: EventType): OccasionType {
  if (eventType === 'BIRTHDAY') return 'BIRTHDAY';
  if (eventType === 'ANNIVERSARY' || eventType === 'WEDDING') return 'ANNIVERSARY';
  if (eventType === 'HOLIDAY') return 'HOLIDAY';
  return 'OTHER';
}

export function ruleFromDraft(draft: EventDraft): RecurrenceRule {
  return {
    calendarType: draft.calendarType,
    day: draft.day,
    month: draft.month,
    year: draft.year,
    isLeapMonth: draft.calendarType === 'LUNAR' && draft.isLeapMonth,
    isRecurring: draft.isRecurring,
    leapDayPolicy: draft.leapDayPolicy,
    endDate: draft.endDate,
  };
}

export function isLeapDayRule(rule: RecurrenceRule): boolean {
  return rule.calendarType === 'SOLAR' && rule.month === 2 && rule.day === 29;
}

export function validateEventDraft(draft: EventDraft): DraftErrors {
  const errors: DraftErrors = {};
  const title = draft.title.trim();
  if (title.length === 0) errors.title = 'Vui lòng nhập tiêu đề sự kiện';
  else if (title.length > 150) errors.title = 'Tiêu đề tối đa 150 ký tự';

  if (draft.recipientIds.length === 0) errors.recipients = 'Chọn ít nhất một người nhận';
  else if (!draft.recipientIds.includes(draft.primaryRecipientId)) {
    errors.recipients = 'Chọn một người nhận chính';
  }

  const isYearOptional = draft.isRecurring;
  if (draft.year === null && !isYearOptional) {
    errors.year = 'Sự kiện không lặp cần có năm';
  } else if (draft.year !== null && !(draft.year >= 1 && draft.year <= 9999)) {
    errors.year = 'Năm không hợp lệ';
  }
  if (draft.calendarType === 'SOLAR') {
    const checkYear = draft.year ?? 2000;
    if (!isValidYmd(checkYear, draft.month, draft.day)) {
      errors.date = 'Ngày dương lịch không hợp lệ';
    }
  } else if (
    !Number.isInteger(draft.day) ||
    !Number.isInteger(draft.month) ||
    draft.day < 1 ||
    draft.day > 30 ||
    draft.month < 1 ||
    draft.month > 12
  ) {
    errors.date = 'Ngày âm lịch không hợp lệ';
  }

  if (draft.defaultBudget !== null && !(draft.defaultBudget > 0)) {
    errors.budget = 'Ngân sách phải lớn hơn 0';
  }
  if (draft.notes.length > 500) errors.notes = 'Ghi chú tối đa 500 ký tự';
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

function parseIntOrNaN(text: string): number {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
}

export function emptyFormFields(today: string): EventFormFields {
  const [year] = today.split('-');
  return {
    title: '',
    eventType: 'BIRTHDAY',
    recipientIds: [],
    primaryRecipientId: '',
    calendarType: 'SOLAR',
    day: '',
    month: '',
    year: year ?? '',
    isLeapMonth: false,
    isRecurring: true,
    leapDayPolicy: 'FEB28',
    budget: '',
    notes: '',
  };
}

export function fieldsFromEvent(event: EventRecord): EventFormFields {
  return {
    title: event.title,
    eventType: event.eventType,
    recipientIds: event.recipients.map((recipient) => recipient.id),
    primaryRecipientId: event.recipients.find((recipient) => recipient.isPrimary)?.id ?? '',
    calendarType: event.calendarType,
    day: String(event.day),
    month: String(event.month),
    year: event.year === null ? '' : String(event.year),
    isLeapMonth: event.isLeapMonth,
    isRecurring: event.isRecurring,
    leapDayPolicy: event.leapDayPolicy ?? 'FEB28',
    budget: event.defaultBudget === null ? '' : String(event.defaultBudget),
    notes: event.notes,
  };
}

/** Chuyển giá trị nhập sang `EventDraft`; ô số sai định dạng thành NaN để bị `validateEventDraft` bắt. */
export function draftFromFields(fields: EventFormFields): EventDraft {
  const budgetDigits = fields.budget.replace(/[^\d]/g, '');
  return {
    title: fields.title,
    eventType: fields.eventType,
    recipientIds: fields.recipientIds,
    primaryRecipientId: fields.primaryRecipientId,
    calendarType: fields.calendarType,
    day: parseIntOrNaN(fields.day),
    month: parseIntOrNaN(fields.month),
    year: fields.year.trim() === '' ? null : parseIntOrNaN(fields.year),
    isLeapMonth: fields.isLeapMonth,
    isRecurring: fields.isRecurring,
    leapDayPolicy: fields.leapDayPolicy,
    endDate: null,
    defaultBudget: budgetDigits === '' ? null : Number(budgetDigits),
    notes: fields.notes,
  };
}
