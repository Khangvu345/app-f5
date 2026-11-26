import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { newOperationId } from '@/services/storage/local-db';
import { useAuthStore } from '@/store/auth.store';
import type { LocalProfile } from '@/types/local-storage';

import { listRecipientSummaries } from '../../recipients/api/recipients.api';
import type { RecipientSummary } from '../../recipients/types/recipients.types';
import { createEvent, deleteEvent, getEvent, updateEvent } from '../api/events.api';
import type { DeleteScope } from '../api/events.api';
import type { EventFormFields, EventRecord } from '../types/events.types';
import { todayVn } from '../utils/dates';
import {
  draftFromFields,
  emptyFormFields,
  fieldsFromEvent,
  hasErrors,
  validateEventDraft,
  type DraftErrors,
} from '../utils/eventDraft';

import { useProfileQuery } from './useProfileQuery';

const NO_RECIPIENTS: RecipientSummary[] = [];

export type FormStatus = 'loading' | 'ready' | 'error' | 'not-found';

interface Options {
  /** null = tạo mới. */
  eventId: string | null;
  initialRecipientId?: string | null;
  occurrenceId?: string | null;
}

interface FormSource {
  recipients: RecipientSummary[];
  event: EventRecord | null;
}

export function useEventForm({ eventId, initialRecipientId, occurrenceId }: Options) {
  const profile = useAuthStore((s) => s.profile);
  const [fields, setFields] = useState<EventFormFields>(() => emptyFormFields(todayVn()));
  const [isSeeded, setIsSeeded] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const operationId = useRef(newOperationId('event'));

  const loadSource = useCallback(
    async (current: LocalProfile): Promise<FormSource> => ({
      recipients: await listRecipientSummaries(current),
      event: eventId ? await getEvent(current, eventId) : null,
    }),
    [eventId],
  );
  const { state, reload } = useProfileQuery(loadSource);

  const source = state.status === 'ready' ? state.data : null;
  const recipients = source?.recipients ?? NO_RECIPIENTS;
  let status: FormStatus = state.status;
  if (source && eventId && !source.event) status = 'not-found';

  // Điền sẵn biểu mẫu một lần khi dữ liệu đầu tiên tải xong (không ghi đè khi quay lại màn hình).
  if (source && !isSeeded && status === 'ready') {
    setIsSeeded(true);
    if (source.event) {
      setFields(fieldsFromEvent(source.event));
    } else if (
      initialRecipientId &&
      source.recipients.some((item) => item.id === initialRecipientId)
    ) {
      setFields((current) => ({
        ...current,
        recipientIds: [initialRecipientId],
        primaryRecipientId: initialRecipientId,
      }));
    }
  }

  function setField<K extends keyof EventFormFields>(key: K, value: EventFormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function toggleRecipient(id: string) {
    setFields((current) => {
      const isSelected = current.recipientIds.includes(id);
      const recipientIds = isSelected
        ? current.recipientIds.filter((item) => item !== id)
        : [...current.recipientIds, id];
      const primaryRecipientId = recipientIds.includes(current.primaryRecipientId)
        ? current.primaryRecipientId
        : (recipientIds[0] ?? '');
      return { ...current, recipientIds, primaryRecipientId };
    });
  }

  async function submit() {
    if (!profile || isSaving) return;
    const draft = draftFromFields(fields);
    const found = validateEventDraft(draft);
    setErrors(found);
    setSubmitError(null);
    if (hasErrors(found)) return;
    setIsSaving(true);
    try {
      if (eventId) {
        await updateEvent(profile, eventId, draft);
        router.back();
        return;
      }
      const result = await createEvent(profile, draft, operationId.current);
      if (result.status === 'limit-reached') {
        setIsLimitReached(true);
        return;
      }
      if (result.eventId) router.replace(`/events/${result.eventId}`);
      else router.back();
    } catch {
      setSubmitError('Không lưu được sự kiện. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(scope: DeleteScope): Promise<boolean> {
    if (!profile || !eventId) return false;
    setIsSaving(true);
    try {
      await deleteEvent(profile, eventId, scope, occurrenceId ?? null);
      router.replace('/(app)/(tabs)');
      return true;
    } catch {
      setSubmitError('Không xóa được sự kiện. Vui lòng thử lại.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    fields,
    recipients,
    status,
    errors,
    isSaving,
    submitError,
    isLimitReached,
    closeLimit: () => setIsLimitReached(false),
    setField,
    toggleRecipient,
    submit,
    remove,
    reload,
  };
}
