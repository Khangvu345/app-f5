import { useEffect, useState } from 'react';

import { listRecipientSummaries } from '@/features/recipients/api/recipients.api';
import type { RecipientSummary } from '@/features/recipients/types/recipients.types';
import type { LocalProfile } from '@/services/storage/local-storage';

import { listOccurrenceOptions } from '../api/gifts.api';
import type { OccurrenceOption } from '../types/gifts.types';

// Hợp đồng chia sẻ: feature recipients cung cấp danh sách người nhận.

interface Options {
  recipients: RecipientSummary[];
  occurrences: OccurrenceOption[];
  isLoading: boolean;
}

/** Danh sách người nhận và các dịp của người nhận đang chọn cho form quà. */
export function useGiftFormOptions(
  profile: LocalProfile | null,
  recipientId: string | null,
): Options {
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [occurrences, setOccurrences] = useState<OccurrenceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let isActive = true;
    listRecipientSummaries(profile)
      .then((rows) => {
        if (isActive) setRecipients(rows);
      })
      .catch(() => {
        if (isActive) setRecipients([]);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || !recipientId) return;
    let isActive = true;
    listOccurrenceOptions(profile, recipientId)
      .then((rows) => {
        if (isActive) setOccurrences(rows);
      })
      .catch(() => {
        if (isActive) setOccurrences([]);
      });
    return () => {
      isActive = false;
    };
  }, [profile, recipientId]);

  return { recipients, occurrences: recipientId ? occurrences : [], isLoading };
}
