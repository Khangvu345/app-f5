import { create } from 'zustand';

import { authApi } from '@/services/api/auth.api';
import { tokenStorage } from '@/services/storage/token-storage';
import type { LoginPayload, RegisterPayload, User } from '@/types/auth';
import { toApiError } from '@/utils/api-error';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  // Runs once on app start: restore the session from the stored token.
  hydrate: async () => {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ status: 'authenticated', user });
    } catch (error) {
      // Only drop the token when the server says it is invalid, not on network errors.
      if (toApiError(error).status === 401) {
        await tokenStorage.clear();
      }
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (payload) => {
    const { accessToken, user } = await authApi.login(payload);
    await tokenStorage.setAccessToken(accessToken);
    set({ status: 'authenticated', user });
  },

  register: async (payload) => {
    const { accessToken, user } = await authApi.register(payload);
    await tokenStorage.setAccessToken(accessToken);
    set({ status: 'authenticated', user });
  },

  logout: async () => {
    await tokenStorage.clear();
    set({ status: 'unauthenticated', user: null });
  },
}));
