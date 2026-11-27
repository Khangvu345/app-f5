export type GiftStatus =
  'IDEA' | 'CONSIDERING' | 'SELECTED' | 'PURCHASED' | 'GIVEN' | 'RETURNED' | 'CANCELLED';

export type GiftReaction = 'LOVED' | 'LIKED' | 'NEUTRAL' | 'UNKNOWN';
export type GiftSource = 'MANUAL' | 'AI';

export interface Gift {
  id: string;
  recipientId: string;
  recipientName: string;
  occurrenceId: string | null;
  occasionTitle: string | null;
  /** Ngày diễn ra của dịp, dạng YYYY-MM-DD. */
  occasionDate: string | null;
  name: string;
  category: string | null;
  source: GiftSource;
  status: GiftStatus;
  productUrl: string | null;
  estimatedAmountX100: number | null;
  /** Tổng các khoản chi thực tế loại GIFT của món quà. */
  actualAmountX100: number | null;
  purchasedOn: string | null;
  givenOn: string | null;
  reaction: GiftReaction | null;
  note: string | null;
  followUpPromptedAt: string | null;
  followUpDismissedAt: string | null;
}

export interface OccurrenceOption {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface GiftIdeaInput {
  recipientId: string;
  occurrenceId: string | null;
  name: string;
  category: string | null;
  estimatedVnd: number | null;
  productUrl: string | null;
  note: string | null;
}

export interface GiftTransitionInput {
  to: GiftStatus;
  /** Ngày mua (khi chuyển PURCHASED) hoặc ngày tặng (khi chuyển GIVEN), YYYY-MM-DD. */
  date: string;
  /** Giá thực tế (VND). */
  amountVnd?: number | null;
  /** Chi phí phụ (VND). */
  extraVnd?: number | null;
  reaction?: GiftReaction | null;
  note?: string | null;
}

export interface NewGivenGiftInput {
  recipientId: string;
  occurrenceId: string | null;
  name: string;
  givenOn: string;
  amountVnd: number | null;
  extraVnd: number | null;
  reaction: GiftReaction | null;
  note: string | null;
}

export type CreateGiftResult = 'created' | 'already-created' | 'limit-reached';
