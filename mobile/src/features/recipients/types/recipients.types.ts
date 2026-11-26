export type Relationship = 'FAMILY' | 'FRIEND' | 'PARTNER' | 'COLLEAGUE' | 'TEACHER' | 'OTHER';

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  FAMILY: 'Gia đình',
  FRIEND: 'Bạn bè',
  PARTNER: 'Người yêu',
  COLLEAGUE: 'Đồng nghiệp',
  TEACHER: 'Thầy cô',
  OTHER: 'Khác',
};

export const RELATIONSHIPS: readonly Relationship[] = [
  'FAMILY',
  'FRIEND',
  'PARTNER',
  'COLLEAGUE',
  'TEACHER',
  'OTHER',
];

export type AgeGroup = 'CHILD' | 'TEEN' | 'ADULT' | 'SENIOR';

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  CHILD: 'Trẻ em',
  TEEN: 'Thiếu niên',
  ADULT: 'Người lớn',
  SENIOR: 'Cao tuổi',
};

export interface RecipientSummary {
  id: string;
  name: string;
  relationship: Relationship;
}

/** Dịp gần nhất của một người nhận (từ sự kiện hoặc ngày sinh). */
export interface NextOccasion {
  label: string;
  /** Ngày dương YYYY-MM-DD. */
  date: string;
  daysUntil: number;
}

export interface RecipientListItem extends RecipientSummary {
  nextOccasion: NextOccasion | null;
}

export interface RecipientFormValues {
  name: string;
  relationship: Relationship;
  ageGroup: AgeGroup | null;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  likes: string[];
  avoids: string[];
  notes: string;
}

export interface RecipientDetail extends RecipientSummary {
  ageGroup: AgeGroup | null;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: number | null;
  notes: string | null;
  likes: string[];
  avoids: string[];
  nextOccasion: NextOccasion | null;
}

export interface GivenGift {
  id: string;
  name: string;
  givenOn: string | null;
  occasion: string | null;
  amount: number | null;
  note: string | null;
}

export interface GiftIdea {
  id: string;
  name: string;
  status: string;
}

export interface DeleteImpact {
  eventCount: number;
  giftCount: number;
}

export type CreateOutcome = 'created' | 'limit-reached';
