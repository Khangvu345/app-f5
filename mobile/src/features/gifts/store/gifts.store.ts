import { create } from 'zustand';

import type { LocalProfile } from '@/services/storage/local-storage';

import { deleteGift, listGifts, transitionGift } from '../api/gifts.api';
import type { Gift, GiftTransitionInput } from '../types/gifts.types';

interface GiftsState {
  gifts: Gift[];
  isLoading: boolean;
  errorMessage: string | null;
  load: (profile: LocalProfile) => Promise<void>;
  transition: (profile: LocalProfile, id: string, input: GiftTransitionInput) => Promise<void>;
  remove: (profile: LocalProfile, id: string) => Promise<void>;
  reset: () => void;
}

export const useGiftsStore = create<GiftsState>((set, get) => ({
  gifts: [],
  isLoading: false,
  errorMessage: null,

  async load(profile) {
    set({ isLoading: true, errorMessage: null });
    try {
      set({ gifts: await listGifts(profile), isLoading: false });
    } catch {
      set({ isLoading: false, errorMessage: 'Không tải được bộ sưu tập quà. Vui lòng thử lại.' });
    }
  },

  async transition(profile, id, input) {
    await transitionGift(profile, id, input);
    await get().load(profile);
  },

  async remove(profile, id) {
    await deleteGift(profile, id);
    await get().load(profile);
  },

  reset() {
    set({ gifts: [], isLoading: false, errorMessage: null });
  },
}));
