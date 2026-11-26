import { create } from 'zustand';

import type { LocalProfile } from '@/types/local-storage';

import { listRecipientItems } from '../api/recipients.api';
import type { Relationship, RecipientListItem } from '../types/recipients.types';

type ListStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RecipientsState {
  items: RecipientListItem[];
  status: ListStatus;
  query: string;
  relationship: Relationship | null;
  load: (profile: LocalProfile) => Promise<void>;
  setQuery: (query: string) => void;
  setRelationship: (relationship: Relationship | null) => void;
  reset: () => void;
}

const INITIAL = {
  items: [] as RecipientListItem[],
  status: 'idle' as ListStatus,
  query: '',
  relationship: null as Relationship | null,
};

export const useRecipientsStore = create<RecipientsState>((set, get) => ({
  ...INITIAL,
  async load(profile) {
    // Giữ danh sách cũ khi tải lại để không nhấp nháy.
    if (get().status !== 'ready') set({ status: 'loading' });
    try {
      const items = await listRecipientItems(profile);
      set({ items, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },
  setQuery: (query) => set({ query }),
  setRelationship: (relationship) => set({ relationship }),
  reset: () => set(INITIAL),
}));

/** Lọc theo tên (không phân biệt hoa thường, bỏ dấu cách thừa) và theo quan hệ. */
export function filterRecipients(
  items: readonly RecipientListItem[],
  query: string,
  relationship: Relationship | null,
): RecipientListItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (relationship === null || item.relationship === relationship) &&
      (needle === '' || item.name.toLowerCase().includes(needle)),
  );
}
