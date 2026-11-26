import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuthStore } from '@/store/auth.store';

import { getRecipientDetail, listGiftIdeas, listGivenGifts } from '../api/recipients.api';
import type { GiftIdea, GivenGift, RecipientDetail } from '../types/recipients.types';

type ProfileStatus = 'loading' | 'ready' | 'notFound' | 'error';

interface RecipientProfileState {
  status: ProfileStatus;
  detail: RecipientDetail | null;
  gifts: GivenGift[];
  ideas: GiftIdea[];
  reload: () => void;
}

export function useRecipientProfile(id: string): RecipientProfileState {
  const profile = useAuthStore((state) => state.profile);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [detail, setDetail] = useState<RecipientDetail | null>(null);
  const [gifts, setGifts] = useState<GivenGift[]>([]);
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);

  const reload = useCallback(() => {
    if (!profile) return;
    void (async () => {
      try {
        const found = await getRecipientDetail(profile, id);
        if (!found) {
          setStatus('notFound');
          return;
        }
        const [givenGifts, giftIdeas] = await Promise.all([
          listGivenGifts(profile, id),
          listGiftIdeas(profile, id),
        ]);
        setDetail(found);
        setGifts(givenGifts);
        setIdeas(giftIdeas);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    })();
  }, [profile, id]);

  useFocusEffect(reload);

  return { status, detail, gifts, ideas, reload };
}
