import { normalizeTags } from './recipientForm';

export type PreferencePolarity = 'LIKE' | 'AVOID';

export interface ExistingPreference {
  id: string;
  value: string;
  polarity: string;
  /** Đang hiển thị: chưa xóa mềm và còn hiệu lực. */
  isLive: boolean;
}

export interface PreferenceSyncPlan {
  revive: string[];
  remove: string[];
  insert: { value: string; polarity: PreferencePolarity }[];
}

function key(polarity: string, value: string): string {
  return `${polarity}|${value.trim().toLowerCase()}`;
}

/**
 * So khớp danh sách mong muốn với các dòng đã có. Khóa duy nhất của bảng gồm cả dòng xóa mềm,
 * nên giá trị từng bị gỡ rồi thêm lại phải được "hồi sinh" thay vì chèn mới.
 */
export function planPreferenceSync(
  existing: readonly ExistingPreference[],
  likes: readonly string[],
  avoids: readonly string[],
): PreferenceSyncPlan {
  const wanted = new Map<string, { value: string; polarity: PreferencePolarity }>();
  for (const value of normalizeTags(likes)) {
    wanted.set(key('LIKE', value), { value, polarity: 'LIKE' });
  }
  for (const value of normalizeTags(avoids)) {
    wanted.set(key('AVOID', value), { value, polarity: 'AVOID' });
  }

  const plan: PreferenceSyncPlan = { revive: [], remove: [], insert: [] };
  const handled = new Set<string>();
  for (const row of existing) {
    if (row.polarity !== 'LIKE' && row.polarity !== 'AVOID') continue;
    const rowKey = key(row.polarity, row.value);
    if (handled.has(rowKey)) continue;
    if (wanted.has(rowKey)) {
      handled.add(rowKey);
      if (!row.isLive) plan.revive.push(row.id);
    } else if (row.isLive) {
      plan.remove.push(row.id);
    }
  }
  for (const [wantedKey, item] of wanted) {
    if (!handled.has(wantedKey)) plan.insert.push(item);
  }
  return plan;
}
