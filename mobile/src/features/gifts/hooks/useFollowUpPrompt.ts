import { useCallback, useEffect, useState } from 'react';

import type { LocalProfile } from '@/services/storage/local-storage';

import { dismissFollowUp, listFollowUpCandidates, markFollowUpPrompted } from '../api/gifts.api';
import type { Gift } from '../types/gifts.types';
import { todayIso } from '../utils/giftDate';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface Result {
  gift: Gift | null;
  /** Ghi nhận đã hỏi (cột follow_up_prompted_at) rồi đóng hộp thoại. */
  snooze: () => Promise<void>;
  /** Người dùng chọn "Năm nay không tặng" (cột follow_up_dismissed_at). */
  dismiss: () => Promise<void>;
}

/** Quà đầu tiên cần hỏi lại sau sự kiện, hoặc null khi không có gì để hỏi. */
export function useFollowUpPrompt(profile: LocalProfile | null): Result {
  const [gift, setGift] = useState<Gift | null>(null);

  useEffect(() => {
    if (!profile) return;
    let isActive = true;
    const now = new Date();
    listFollowUpCandidates(
      profile,
      todayIso(now),
      new Date(now.getTime() - COOLDOWN_MS).toISOString(),
    )
      .then((rows) => {
        if (isActive) setGift(rows[0] ?? null);
      })
      .catch(() => {
        if (isActive) setGift(null);
      });
    return () => {
      isActive = false;
    };
  }, [profile]);

  const snooze = useCallback(async () => {
    const current = gift;
    setGift(null);
    if (profile && current) {
      await markFollowUpPrompted(profile, current.id, new Date().toISOString());
    }
  }, [gift, profile]);

  const dismiss = useCallback(async () => {
    const current = gift;
    setGift(null);
    if (profile && current) {
      await dismissFollowUp(profile, current.id, new Date().toISOString());
    }
  }, [gift, profile]);

  return { gift, snooze, dismiss };
}
