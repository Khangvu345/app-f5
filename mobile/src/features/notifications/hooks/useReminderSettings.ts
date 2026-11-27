import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '@/store/auth.store';

import { getNotificationPermission } from '../api/notification.permission';
import {
  getNextReminderDays,
  getReminderEventInfo,
  getReminderTrialRemaining,
  listKnownReminderDays,
  listReminderRules,
  saveReminderRules,
  snoozeNextReminder,
} from '../api/reminders.api';
import { useNotificationPrefsStore } from '../store/notification-prefs.store';
import type {
  ReminderDays,
  ReminderEventInfo,
  SnoozeOption,
  SnoozeResult,
} from '../types/notifications.types';
import { DEFAULT_REMINDER_TIME, isValidReminderTime, REMINDER_DAYS } from '../utils/reminderTime';

type LoadStatus = 'loading' | 'ready' | 'error';
export type SaveNotice = 'saved' | 'limit-reached' | 'permission-denied' | 'error' | null;

/** Khách mới chọn sẵn các mốc gần ngày nhất vì chỉ có tối đa 3 mốc nhắc. */
const GUEST_DEFAULT_DAYS: readonly ReminderDays[] = [7, 3, 1];

function sortDays(days: readonly ReminderDays[]): ReminderDays[] {
  return REMINDER_DAYS.filter((day) => days.includes(day));
}

export function useReminderSettings(eventId: string) {
  const profile = useAuthStore((state) => state.profile);
  const isPrivate = useNotificationPrefsStore((state) => state.isPrivate);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [info, setInfo] = useState<ReminderEventInfo | null>(null);
  const [knownDays, setKnownDays] = useState<ReminderDays[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [nextDays, setNextDays] = useState<number | null>(null);
  const [isEnabled, setEnabled] = useState(true);
  const [days, setDays] = useState<ReminderDays[]>([]);
  const [time, setTime] = useState(DEFAULT_REMINDER_TIME);
  const [isSaving, setSaving] = useState(false);
  const [notice, setNotice] = useState<SaveNotice>(null);
  const [snoozeResult, setSnoozeResult] = useState<SnoozeResult | null>(null);
  const [isSaved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!profile) return null;
    const [eventInfo, rules, known, quota, next] = await Promise.all([
      getReminderEventInfo(profile, eventId),
      listReminderRules(profile, eventId),
      listKnownReminderDays(profile, eventId),
      getReminderTrialRemaining(profile),
      getNextReminderDays(profile, eventId),
    ]);
    return { profile, eventInfo, rules, known, quota, next };
  }, [profile, eventId]);

  const apply = useCallback((data: Awaited<ReturnType<typeof fetchSettings>>) => {
    if (!data) return;
    const { profile: owner, eventInfo, rules, known, quota, next } = data;
    if (!eventInfo) {
      setStatus('error');
      return;
    }
    setInfo(eventInfo);
    setKnownDays(known);
    setRemaining(quota);
    setNextDays(next);
    if (rules.length > 0) {
      setEnabled(rules.some((rule) => rule.isEnabled));
      setDays(sortDays(rules.map((rule) => rule.daysBefore)));
      setTime(rules[0].reminderTime);
    } else {
      setEnabled(true);
      setDays(
        sortDays(
          owner.serverUserId === null
            ? GUEST_DEFAULT_DAYS.slice(0, quota ?? GUEST_DEFAULT_DAYS.length)
            : REMINDER_DAYS,
        ),
      );
      setTime(DEFAULT_REMINDER_TIME);
    }
    setStatus('ready');
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await fetchSettings());
    } catch {
      setStatus('error');
    }
  }, [apply, fetchSettings]);

  const reload = useCallback(async () => {
    setStatus('loading');
    await load();
  }, [load]);

  useEffect(() => {
    void useNotificationPrefsStore.getState().load();
    let isActive = true;
    fetchSettings()
      .then((data) => {
        if (isActive) apply(data);
      })
      .catch(() => {
        if (isActive) setStatus('error');
      });
    return () => {
      isActive = false;
    };
  }, [fetchSettings, apply]);

  const newDaysCount = useMemo(
    () => days.filter((day) => !knownDays.includes(day)).length,
    [days, knownDays],
  );
  /** Chọn thêm mốc chưa từng tạo sẽ vượt hạn mức dùng thử của khách. */
  const isTrialExhausted = remaining !== null && newDaysCount >= remaining;
  const isTimeValid = isValidReminderTime(time);

  const toggleDay = useCallback(
    (day: ReminderDays) => {
      setSaved(false);
      if (days.includes(day)) {
        setNotice(null);
        setDays(days.filter((item) => item !== day));
      } else if (!knownDays.includes(day) && isTrialExhausted) {
        setNotice('limit-reached');
      } else {
        setNotice(null);
        setDays(sortDays([...days, day]));
      }
    },
    [days, knownDays, isTrialExhausted],
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (!profile || !isTimeValid) return false;
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveReminderRules(
        profile,
        eventId,
        days.map((daysBefore) => ({ daysBefore, reminderTime: time, isEnabled })),
        { isPrivate },
      );
      setNotice(result.outcome === 'saved' ? 'saved' : result.outcome);
      setSaved(result.outcome === 'saved');
      await load();
      return result.outcome === 'saved';
    } catch {
      setNotice('error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [profile, eventId, days, time, isEnabled, isPrivate, isTimeValid, load]);

  /** Kiểm tra quyền trước khi lưu mốc bật; trả false nếu cần hiện sheet xin quyền. */
  const hasPermissionToSave = useCallback(async (): Promise<boolean> => {
    if (!isEnabled || days.length === 0) return true;
    try {
      return (await getNotificationPermission()).status === 'granted';
    } catch {
      return false;
    }
  }, [isEnabled, days.length]);

  const snooze = useCallback(
    async (option: SnoozeOption) => {
      if (!profile) return;
      try {
        setSnoozeResult(await snoozeNextReminder(profile, eventId, option, { isPrivate }));
        setNextDays(await getNextReminderDays(profile, eventId));
      } catch {
        setSnoozeResult('unavailable');
      }
    },
    [profile, eventId, isPrivate],
  );

  return {
    status,
    info,
    isEnabled,
    days,
    time,
    isTimeValid,
    isSaving,
    isSaved,
    isTrialExhausted,
    notice,
    nextDays,
    snoozeResult,
    setEnabled: (value: boolean) => {
      setSaved(false);
      setEnabled(value);
    },
    setTime: (value: string) => {
      setSaved(false);
      setTime(value);
    },
    toggleDay,
    save,
    hasPermissionToSave,
    snooze,
    reload,
  };
}
