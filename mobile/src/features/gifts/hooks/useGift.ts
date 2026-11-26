import { useCallback, useEffect, useState } from 'react';

import type { LocalProfile } from '@/services/storage/local-storage';

import { getGift } from '../api/gifts.api';
import type { Gift } from '../types/gifts.types';

interface Result {
  gift: Gift | null;
  isLoading: boolean;
  errorMessage: string | null;
  /** Tải lại ngầm (không bật trạng thái đang tải). */
  reload: () => void;
}

/** Tải một món quà theo id; `gift` là null khi không tồn tại hoặc đã xóa. */
export function useGift(profile: LocalProfile | null, id: string | undefined): Result {
  const [gift, setGift] = useState<Gift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!profile || !id) return;
    let isActive = true;
    getGift(profile, id)
      .then((row) => {
        if (!isActive) return;
        setGift(row);
        setErrorMessage(null);
      })
      .catch(() => {
        if (isActive) setErrorMessage('Không tải được món quà. Vui lòng thử lại.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [profile, id, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { gift, isLoading, errorMessage, reload };
}
