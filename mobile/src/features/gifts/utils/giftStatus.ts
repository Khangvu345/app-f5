import type { GiftReaction, GiftStatus } from '../types/gifts.types';

/** Khớp trigger `gifts_check_status` trong schema SQLite. */
export const GIFT_STATUS_TRANSITIONS: Record<GiftStatus, readonly GiftStatus[]> = {
  IDEA: ['CONSIDERING', 'SELECTED', 'CANCELLED'],
  CONSIDERING: ['IDEA', 'SELECTED', 'CANCELLED'],
  SELECTED: ['CONSIDERING', 'PURCHASED', 'CANCELLED'],
  PURCHASED: ['GIVEN', 'RETURNED', 'CANCELLED'],
  GIVEN: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
  IDEA: 'Ý tưởng',
  CONSIDERING: 'Đang cân nhắc',
  SELECTED: 'Đã chọn',
  PURCHASED: 'Đã mua',
  GIVEN: 'Đã tặng',
  RETURNED: 'Đã trả lại',
  CANCELLED: 'Đã huỷ',
};

export const GIFT_STATUS_HINTS: Record<GiftStatus, string> = {
  IDEA: 'Mới lưu lại',
  CONSIDERING: 'So sánh với ý tưởng khác',
  SELECTED: 'Quyết định tặng món này',
  PURCHASED: 'Cần nhập giá thực tế',
  GIVEN: 'Lưu vào lịch sử quà',
  RETURNED: 'Món quà được trả lại',
  CANCELLED: 'Không tặng món này nữa',
};

export const GIFT_REACTION_LABELS: Record<GiftReaction, string> = {
  LOVED: 'Rất thích',
  LIKED: 'Thích',
  NEUTRAL: 'Bình thường',
  UNKNOWN: 'Chưa biết',
};

export const GIFT_REACTIONS: readonly GiftReaction[] = ['LOVED', 'LIKED', 'NEUTRAL', 'UNKNOWN'];

export function getNextStatuses(from: GiftStatus): readonly GiftStatus[] {
  return GIFT_STATUS_TRANSITIONS[from];
}

export function canTransition(from: GiftStatus, to: GiftStatus): boolean {
  return GIFT_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Chuỗi trạng thái ngắn nhất cần đi qua (không gồm `from`) để tới `to`,
 * hoặc null nếu không thể. Dùng khi ghi nhận "đã tặng" cho món chưa được mua.
 */
export function getTransitionPath(from: GiftStatus, to: GiftStatus): GiftStatus[] | null {
  if (from === to) return [];
  const queue: GiftStatus[][] = [[from]];
  const visited = new Set<GiftStatus>([from]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const last = path[path.length - 1];
    for (const next of GIFT_STATUS_TRANSITIONS[last]) {
      if (visited.has(next)) continue;
      const candidate = [...path, next];
      if (next === to) return candidate.slice(1);
      visited.add(next);
      queue.push(candidate);
    }
  }
  return null;
}

export type GiftTab = 'IDEA' | 'SELECTED' | 'PURCHASED' | 'GIVEN';

export const GIFT_TABS: readonly { value: GiftTab; label: string }[] = [
  { value: 'IDEA', label: 'Ý tưởng' },
  { value: 'SELECTED', label: 'Đã chọn' },
  { value: 'PURCHASED', label: 'Đã mua' },
  { value: 'GIVEN', label: 'Đã tặng' },
];

/** Tab hiển thị của một trạng thái; món đã huỷ không nằm trong tab nào. */
export function tabOfStatus(status: GiftStatus): GiftTab | null {
  if (status === 'IDEA' || status === 'CONSIDERING') return 'IDEA';
  if (status === 'SELECTED') return 'SELECTED';
  if (status === 'PURCHASED') return 'PURCHASED';
  if (status === 'GIVEN' || status === 'RETURNED') return 'GIVEN';
  return null;
}
