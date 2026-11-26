import { create } from 'zustand';

import { authApi } from '@/services/api/auth.api';
import {
  linkGuestProfile,
  openAccountProfile,
  openGuestProfile,
} from '@/services/storage/local-storage';
import type { LocalProfile } from '@/services/storage/local-storage';
import { sessionStorage } from '@/services/storage/session-storage';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  StoredSession,
  User,
} from '@/types/auth';
import { ApiError, toApiError } from '@/utils/api-error';
import { tokenExpiry } from '@/utils/token-expiry';

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'error';
interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: LocalProfile | null;
  pendingLink: boolean;
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  providerLogin: (provider: 'google' | 'apple', idToken: string, nonce?: string) => Promise<void>;
  retryLink: () => Promise<void>;
  invalidate: (token: string) => Promise<void>;
  checkExpiry: () => Promise<void>;
  logout: () => Promise<void>;
}

let generation = 0;
let isAuthenticating = false;
let shouldClearSession = false;
let writes: Promise<void> = Promise.resolve();
function persist(session: StoredSession | null, current: number): Promise<void> {
  const write = writes.then(async () => {
    if (current !== generation) return;
    if (session) await sessionStorage.set(session);
    else await sessionStorage.clear();
  });
  writes = write.catch(() => {});
  return write;
}
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

export const useAuthStore = create<AuthState>((set, get) => {
  const scheduleExpiry = (session: StoredSession) => {
    if (expiryTimer) clearTimeout(expiryTimer);
    const delay = Math.max(0, session.expiresAt - Date.now());
    expiryTimer = setTimeout(
      () => {
        if (Date.now() >= session.expiresAt) {
          void get()
            .invalidate(session.accessToken)
            .catch(() => {});
        } else scheduleExpiry(session);
      },
      Math.min(delay, 2147483647),
    );
  };
  const finishLink = async (session: StoredSession, current: number) => {
    if (!session.pendingSource) throw new Error('Missing source profile');
    const profile = await linkGuestProfile(session.user.id, session.pendingSource);
    if (current !== generation) return;
    if (session.expiresAt <= Date.now()) {
      await get().invalidate(session.accessToken);
      return;
    }
    const linked = { ...session, pendingLink: false, pendingSource: null };
    await persist(linked, current);
    if (current !== generation) return;
    set({ status: 'authenticated', user: linked.user, profile, pendingLink: false });
    scheduleExpiry(linked);
  };
  const accept = async (response: AuthResponse) => {
    const jwtExpiry = tokenExpiry(response.accessToken);
    if (
      !jwtExpiry ||
      jwtExpiry <= Date.now() ||
      !/^\d+$/.test(response.user.id) ||
      !Number.isFinite(response.expiresIn) ||
      response.expiresIn <= 0
    ) {
      throw new ApiError('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
    }
    const source = get().profile;
    if (!source || source.serverUserId !== null) throw new ApiError('Không tìm thấy hồ sơ khách.');
    const current = ++generation;
    const session: StoredSession = {
      accessToken: response.accessToken,
      expiresAt: Math.min(jwtExpiry, Date.now() + response.expiresIn * 1000),
      user: response.user,
      pendingLink: true,
      pendingSource: source,
    };
    await persist(session, current);
    if (current !== generation) return;
    set({ pendingLink: true });
    scheduleExpiry(session);
    try {
      await finishLink(session, current);
    } catch {
      throw new ApiError(
        'Đăng nhập thành công nhưng chưa nhập được dữ liệu trên máy. Vui lòng thử lại.',
        undefined,
        'LOCAL_LINK_FAILED',
      );
    }
  };
  const authenticate = async (request: () => Promise<AuthResponse>) => {
    if (isAuthenticating || get().pendingLink) {
      throw new ApiError('Vui lòng hoàn tất lần đăng nhập trước.');
    }
    isAuthenticating = true;
    const current = generation;
    try {
      const response = await request();
      if (current !== generation) return;
      await accept(response);
    } finally {
      isAuthenticating = false;
    }
  };
  return {
    status: 'loading',
    user: null,
    profile: null,
    pendingLink: false,
    hydrate: async () => {
      const current = ++generation;
      if (shouldClearSession) {
        await persist(null, current);
        if (current !== generation) return;
        shouldClearSession = false;
      }
      const guest = await openGuestProfile();
      const session = await sessionStorage.get();
      if (current !== generation) return;
      if (!session || session.expiresAt <= Date.now()) {
        if (session) await persist(null, current);
        if (current === generation) {
          set({ status: 'guest', user: null, profile: guest, pendingLink: false });
        }
        return;
      }
      set({ status: 'guest', profile: guest, user: null, pendingLink: session.pendingLink });
      scheduleExpiry(session);
      let user = session.user;
      try {
        user = await authApi.me();
        if (current !== generation) return;
        if (user.id !== session.user.id) throw new ApiError('Sai hồ sơ phiên.', 401);
      } catch (error) {
        if (current !== generation) return;
        if (toApiError(error).status === 401) {
          await get().invalidate(session.accessToken);
          return;
        }
      }
      if (current !== generation) return;
      if (session.expiresAt <= Date.now()) {
        await get().invalidate(session.accessToken);
        return;
      }
      if (session.pendingLink) {
        try {
          await finishLink({ ...session, user }, current);
        } catch {
          /* Retry remains available. */
        }
        return;
      }
      const profile = await openAccountProfile(user.id);
      if (current !== generation) return;
      if (session.expiresAt <= Date.now()) {
        await get().invalidate(session.accessToken);
        return;
      }
      const updated = { ...session, user };
      await persist(updated, current);
      if (current !== generation) return;
      set({ status: 'authenticated', user, profile, pendingLink: false });
      scheduleExpiry(updated);
    },
    login: async (payload) => authenticate(() => authApi.login(payload)),
    register: async (payload) => authenticate(() => authApi.register(payload)),
    providerLogin: async (provider, idToken, nonce) =>
      authenticate(() => authApi.provider(provider, idToken, nonce)),
    retryLink: async () => {
      const session = await sessionStorage.get();
      if (!session?.pendingLink || session.expiresAt <= Date.now()) {
        if (session) await get().invalidate(session.accessToken);
        throw new ApiError('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
      }
      try {
        await finishLink(session, generation);
      } catch {
        throw new ApiError(
          'Chưa nhập được dữ liệu trên máy. Vui lòng thử lại.',
          undefined,
          'LOCAL_LINK_FAILED',
        );
      }
    },
    checkExpiry: async () => {
      const current = generation;
      try {
        const session = await sessionStorage.get();
        if (current !== generation) return;
        if (!session && get().status === 'authenticated') await get().logout();
        else if (session && session.expiresAt <= Date.now()) {
          await get().invalidate(session.accessToken);
        }
      } catch (error) {
        if (current === generation) set({ status: 'error', user: null, profile: null });
        throw error;
      }
    },
    invalidate: async (token) => {
      const current = generation;
      let session: StoredSession | null;
      try {
        session = await sessionStorage.get();
      } catch (error) {
        if (current === generation) set({ status: 'error', user: null, profile: null });
        throw error;
      }
      if (current !== generation) return;
      if (!session && get().status === 'authenticated') {
        await get().logout();
        return;
      }
      if (session?.accessToken !== token) return;
      await get().logout();
    },
    logout: async () => {
      const current = ++generation;
      shouldClearSession = true;
      if (expiryTimer) clearTimeout(expiryTimer);
      set({ status: 'loading', user: null, profile: null, pendingLink: false });
      try {
        await persist(null, current);
        if (current !== generation) return;
        shouldClearSession = false;
        const profile = await openGuestProfile();
        if (current === generation) {
          set({ status: 'guest', user: null, profile, pendingLink: false });
        }
      } catch (error) {
        if (current === generation) set({ status: 'error', user: null, profile: null });
        throw error;
      }
    },
  };
});
