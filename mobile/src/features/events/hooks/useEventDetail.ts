import { useCallback } from 'react';

import type { LocalProfile } from '@/types/local-storage';

import { listReminderRules } from '../../notifications/api/reminders.api';
import type { ReminderRule } from '../../notifications/types/notifications.types';
import { getOccurrenceBudget, listOccurrenceGifts, listTasks } from '../api/event-detail.api';
import { getEvent, getFocusOccurrence, getOccurrence } from '../api/events.api';
import type {
  EventRecord,
  EventTask,
  GiftIdeaItem,
  OccurrenceBudget,
  OccurrenceItem,
} from '../types/events.types';

import { useProfileQuery } from './useProfileQuery';

export interface EventDetailData {
  event: EventRecord;
  occurrence: OccurrenceItem | null;
  tasks: EventTask[];
  gifts: GiftIdeaItem[];
  budget: OccurrenceBudget;
  reminders: ReminderRule[];
}

async function loadDetail(
  profile: LocalProfile,
  eventId: string,
  occurrenceId: string | null,
): Promise<EventDetailData | null> {
  const event = await getEvent(profile, eventId);
  if (!event) return null;
  const picked = occurrenceId ? await getOccurrence(profile, occurrenceId) : null;
  const occurrence =
    picked && picked.eventId === eventId ? picked : await getFocusOccurrence(profile, eventId);
  const reminders = await listReminderRules(profile, eventId);
  if (!occurrence) {
    return {
      event,
      occurrence,
      tasks: [],
      gifts: [],
      budget: { planned: event.defaultBudget, spent: 0 },
      reminders,
    };
  }
  const [tasks, gifts, budget] = await Promise.all([
    listTasks(profile, occurrence.id),
    listOccurrenceGifts(profile, occurrence.id),
    getOccurrenceBudget(profile, occurrence.id, event.defaultBudget),
  ]);
  return { event, occurrence, tasks, gifts, budget, reminders };
}

export function useEventDetail(eventId: string, occurrenceId: string | null) {
  const load = useCallback(
    (profile: LocalProfile) => loadDetail(profile, eventId, occurrenceId),
    [eventId, occurrenceId],
  );
  return useProfileQuery(load);
}
