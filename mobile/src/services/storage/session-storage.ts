import * as SecureStore from 'expo-secure-store';

import type { StoredSession } from '@/types/auth';
import { tokenExpiry } from '@/utils/token-expiry';

const SESSION_KEY = 'auth_session_v1';

export const sessionStorage = {
  async get(): Promise<StoredSession | null> {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (typeof value !== 'object' || value === null) return null;
      const session = value as Partial<StoredSession>;
      if (
        typeof session.accessToken !== 'string' ||
        typeof session.expiresAt !== 'number' ||
        typeof session.pendingLink !== 'boolean' ||
        (session.pendingLink &&
          (!session.pendingSource ||
            typeof session.pendingSource.dbName !== 'string' ||
            session.pendingSource.serverUserId !== null)) ||
        !session.user ||
        typeof session.user.id !== 'string' ||
        !/^\d+$/.test(session.user.id) ||
        typeof session.user.displayName !== 'string' ||
        (session.user.email !== null && typeof session.user.email !== 'string') ||
        !['FREE', 'PREMIUM'].includes(session.user.planType)
      ) {
        return null;
      }
      const expiry = tokenExpiry(session.accessToken);
      if (!expiry) return null;
      return { ...session, expiresAt: Math.min(session.expiresAt, expiry) } as StoredSession;
    } catch {
      return null;
    }
  },
  set: (session: StoredSession) => SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
  clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
};
