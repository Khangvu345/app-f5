import { authApi } from '@/services/api/auth.api';
import { tokenStorage } from '@/services/storage/token-storage';
import type { AuthResponse, User } from '@/types/auth';
import { ApiError } from '@/utils/api-error';

import { useAuthStore } from './auth.store';

jest.mock('@/services/api/auth.api', () => ({
  authApi: { login: jest.fn(), register: jest.fn(), me: jest.fn() },
}));
jest.mock('@/services/storage/token-storage', () => ({
  tokenStorage: { getAccessToken: jest.fn(), setAccessToken: jest.fn(), clear: jest.fn() },
}));

const api = jest.mocked(authApi);
const storage = jest.mocked(tokenStorage);

const user: User = { id: 'u-1', email: 'user@example.com', fullName: 'Test User' };
const authResponse: AuthResponse = { accessToken: 'token-123', user };

describe('auth store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useAuthStore.setState({ status: 'loading', user: null });
  });

  describe('hydrate', () => {
    it('becomes unauthenticated when there is no stored token', async () => {
      storage.getAccessToken.mockResolvedValue(null);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(api.me).not.toHaveBeenCalled();
    });

    it('restores the session when the stored token is valid', async () => {
      storage.getAccessToken.mockResolvedValue('token-123');
      api.me.mockResolvedValue(user);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user });
    });

    it('clears the token when the server rejects it with 401', async () => {
      storage.getAccessToken.mockResolvedValue('expired');
      api.me.mockRejectedValue(new ApiError('Unauthorized', 401));

      await useAuthStore.getState().hydrate();

      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });

    it('keeps the token when the failure is only a network error', async () => {
      storage.getAccessToken.mockResolvedValue('token-123');
      api.me.mockRejectedValue(new ApiError('offline', undefined, 'NETWORK_ERROR'));

      await useAuthStore.getState().hydrate();

      expect(storage.clear).not.toHaveBeenCalled();
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });

  describe('login / register', () => {
    it('stores the token and authenticates on login', async () => {
      api.login.mockResolvedValue(authResponse);

      await useAuthStore.getState().login({ email: user.email, password: 'password123' });

      expect(storage.setAccessToken).toHaveBeenCalledWith('token-123');
      expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user });
    });

    it('stores the token and authenticates on register', async () => {
      api.register.mockResolvedValue(authResponse);

      await useAuthStore
        .getState()
        .register({ email: user.email, password: 'password123', fullName: user.fullName });

      expect(storage.setAccessToken).toHaveBeenCalledWith('token-123');
      expect(useAuthStore.getState().status).toBe('authenticated');
    });

    it('stays unauthenticated and rethrows when login fails', async () => {
      api.login.mockRejectedValue(new ApiError('Sai mật khẩu', 401, 'INVALID_CREDENTIALS'));

      await expect(
        useAuthStore.getState().login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

      expect(storage.setAccessToken).not.toHaveBeenCalled();
      expect(useAuthStore.getState().status).not.toBe('authenticated');
    });
  });

  describe('logout', () => {
    it('clears the token and the user', async () => {
      useAuthStore.setState({ status: 'authenticated', user });

      await useAuthStore.getState().logout();

      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', user: null });
    });
  });
});
