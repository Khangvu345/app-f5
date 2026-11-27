import { useCallback } from 'react';

import type { LocalProfile } from '@/types/local-storage';

import { getAnnualBudget, type AnnualBudget } from '../../budget/api/budget.api';
import { listTasksDue } from '../api/event-detail.api';
import { countActiveEvents, ensureOccurrences, listOccurrencesBetween } from '../api/events.api';
import type { EventTask, OccurrenceItem } from '../types/events.types';
import { addDays, parseYmd, todayVn } from '../utils/dates';

import { useProfileQuery } from './useProfileQuery';

const UPCOMING_WINDOW_DAYS = 30;
const LOOKAHEAD_DAYS = 400;

export interface HomeData {
  today: string;
  next: OccurrenceItem | null;
  upcoming: OccurrenceItem[];
  tasks: EventTask[];
  budget: AnnualBudget;
  hasEvents: boolean;
}

const INACTIVE = ['COMPLETED', 'SKIPPED', 'CANCELLED'];

export function splitUpcoming(
  items: readonly OccurrenceItem[],
  today: string,
): Pick<HomeData, 'next' | 'upcoming'> {
  const active = items.filter((item) => !INACTIVE.includes(item.status));
  const next = active[0] ?? null;
  const limit = addDays(today, UPCOMING_WINDOW_DAYS);
  const upcoming = active.filter((item) => item !== next && item.date <= limit);
  return { next, upcoming };
}

async function loadHome(profile: LocalProfile): Promise<HomeData> {
  const today = todayVn();
  await ensureOccurrences(profile, today);
  const [items, tasks, budget, eventCount] = await Promise.all([
    listOccurrencesBetween(profile, today, addDays(today, LOOKAHEAD_DAYS)),
    listTasksDue(profile, today),
    getAnnualBudget(profile, parseYmd(today).year),
    countActiveEvents(profile),
  ]);
  return { today, ...splitUpcoming(items, today), tasks, budget, hasEvents: eventCount > 0 };
}

export function useHome() {
  const load = useCallback((profile: LocalProfile) => loadHome(profile), []);
  return useProfileQuery(load);
}
