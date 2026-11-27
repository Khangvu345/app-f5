export type EventType =
  'BIRTHDAY' | 'ANNIVERSARY' | 'WEDDING' | 'GRADUATION' | 'HOLIDAY' | 'CUSTOM';
export type OccasionType = 'BIRTHDAY' | 'ANNIVERSARY' | 'HOLIDAY' | 'OTHER';
export type CalendarType = 'SOLAR' | 'LUNAR';
export type LeapDayPolicy = 'FEB28' | 'MAR01' | 'SKIP';
export type OccurrenceStatus =
  'PLANNED' | 'PREPARING' | 'COMPLETED' | 'SKIPPED' | 'ACTIVE' | 'CANCELLED';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BIRTHDAY: 'Sinh nhật',
  ANNIVERSARY: 'Kỷ niệm',
  WEDDING: 'Đám cưới',
  GRADUATION: 'Tốt nghiệp',
  HOLIDAY: 'Ngày lễ',
  CUSTOM: 'Khác',
};

export const LEAP_DAY_POLICY_LABELS: Record<LeapDayPolicy, string> = {
  FEB28: 'Ngày 28/2',
  MAR01: 'Ngày 1/3',
  SKIP: 'Bỏ qua năm không nhuận',
};

export const EVENT_TYPE_ICONS = {
  BIRTHDAY: 'gift-outline',
  ANNIVERSARY: 'heart-outline',
  WEDDING: 'rose-outline',
  GRADUATION: 'school-outline',
  HOLIDAY: 'flag-outline',
  CUSTOM: 'calendar-outline',
} as const satisfies Record<EventType, string>;

/** Quy tắc sinh các lần diễn ra của một sự kiện. */
export interface RecurrenceRule {
  calendarType: CalendarType;
  day: number;
  month: number;
  year: number | null;
  isLeapMonth: boolean;
  isRecurring: boolean;
  leapDayPolicy: LeapDayPolicy | null;
  endDate: string | null;
}

export interface EventRecipient {
  id: string;
  name: string;
  isPrimary: boolean;
}

export interface EventRecord extends RecurrenceRule {
  id: string;
  title: string;
  eventType: EventType;
  defaultBudget: number | null;
  notes: string;
  recipients: EventRecipient[];
}

/** Dữ liệu biểu mẫu tạo/sửa sự kiện. */
export interface EventDraft extends RecurrenceRule {
  title: string;
  eventType: EventType;
  recipientIds: string[];
  primaryRecipientId: string;
  defaultBudget: number | null;
  notes: string;
}

/** Một lần diễn ra hiển thị trên Trang chủ / Lịch. */
export interface OccurrenceItem {
  id: string;
  eventId: string;
  title: string;
  eventType: EventType;
  date: string;
  status: OccurrenceStatus;
  recipientNames: string[];
  primaryRecipientName: string;
  openTaskCount: number;
  doneTaskCount: number;
}

export type CreateEventResult =
  | { status: 'created'; eventId: string | null; isReminderSaved: boolean }
  | { status: 'limit-reached' };

export interface EventTask {
  id: string;
  occurrenceId: string;
  title: string;
  dueOn: string | null;
  isDone: boolean;
  eventTitle: string;
}

export interface GiftIdeaItem {
  id: string;
  name: string;
  status: string;
  estimatedAmount: number | null;
  recipientName: string;
}

export interface OccurrenceBudget {
  planned: number | null;
  spent: number;
}

/** Giá trị đang nhập trong biểu mẫu (chuỗi cho các ô số). */
export interface EventFormFields {
  title: string;
  eventType: EventType;
  recipientIds: string[];
  primaryRecipientId: string;
  calendarType: CalendarType;
  day: string;
  month: string;
  year: string;
  isLeapMonth: boolean;
  isRecurring: boolean;
  leapDayPolicy: LeapDayPolicy;
  budget: string;
  notes: string;
}
