import { useCallback, useEffect, useState } from 'react';

import {
  getNotificationPermission,
  openSystemSettings,
  requestNotificationPermission,
  type PermissionState,
} from '../api/notification.permission';

const INITIAL: PermissionState = { status: 'unknown', canAskAgain: true };

export function useNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState>(INITIAL);

  const refresh = useCallback(async (): Promise<PermissionState> => {
    try {
      const next = await getNotificationPermission();
      setPermission(next);
      return next;
    } catch {
      return INITIAL;
    }
  }, []);

  const request = useCallback(async (): Promise<PermissionState> => {
    try {
      const next = await requestNotificationPermission();
      setPermission(next);
      return next;
    } catch {
      return INITIAL;
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    getNotificationPermission()
      .then((next) => {
        if (isActive) setPermission(next);
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, []);

  return { permission, refresh, request, openSettings: openSystemSettings };
}
