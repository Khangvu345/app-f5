import { useCallback } from 'react';

import type { LocalProfile } from '@/types/local-storage';

import { ensureOccurrences, listOccurrencesInMonth } from '../api/events.api';
import type { OccurrenceItem } from '../types/events.types';
import { todayVn } from '../utils/dates';

import { useProfileQuery } from './useProfileQuery';

export function groupByDate(items: readonly OccurrenceItem[]): Record<string, OccurrenceItem[]> {
  const grouped: Record<string, OccurrenceItem[]> = {};
  for (const item of items) {
    grouped[item.date] = [...(grouped[item.date] ?? []), item];
  }
  return grouped;
}

export function useCalendarMonth(year: number, month: number) {
  const load = useCallback(
    async (profile: LocalProfile) => {
      await ensureOccurrences(profile, todayVn());
      return listOccurrencesInMonth(profile, year, month);
    },
    [year, month],
  );
  return useProfileQuery(load);
}
