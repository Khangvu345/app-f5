import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import type { NotificationPermission } from '../types/notifications.types';

export interface PermissionState {
  status: NotificationPermission;
  /** false khi người dùng đã từ chối và hệ điều hành không hỏi lại nữa. */
  canAskAgain: boolean;
}

function toState(response: Notifications.NotificationPermissionsStatus): PermissionState {
  if (response.granted) return { status: 'granted', canAskAgain: true };
  if (response.status === Notifications.PermissionStatus.UNDETERMINED) {
    return { status: 'undetermined', canAskAgain: true };
  }
  return { status: 'denied', canAskAgain: response.canAskAgain };
}

export async function getNotificationPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  return toState(await Notifications.requestPermissionsAsync());
}

export function openSystemSettings(): Promise<void> {
  return Linking.openSettings();
}
