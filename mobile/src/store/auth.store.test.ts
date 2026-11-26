import { authApi } from '@/services/api/auth.api';
import {
  linkGuestProfile,
  openAccountProfile,
  openGuestProfile,
} from '@/services/storage/local-storage';
import { sessionStorage } from '@/services/storage/session-storage';
import type { StoredSession, User } from '@/types/auth';
import { ApiError } from '@/utils/api-error';

import { useAuthStore } from './auth.store';

jest.mock('@/services/api/auth.api', () => ({
  authApi: { login: jest.fn(), register: jest.fn(), provider: jest.fn(), me: jest.fn() },
}));
jest.mock('@/services/storage/local-storage', () => ({
  openGuestProfile: jest.fn(),
  openAccountProfile: jest.fn(),
  linkGuestProfile: jest.fn(),
}));
jest.mock('@/services/storage/session-storage', () => ({
  sessionStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
}));
const api = jest.mocked(authApi);
const storage = jest.mocked(sessionStorage);
const guest = { dbName: 'guest.db', serverUserId: null };
const account = { dbName: 'account.db', serverUserId: '9007199254740993' };
const user: User = {
  id: '9007199254740993',
  email: null,
  displayName: 'Người dùng',
  planType: 'FREE',
};
const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')}.signature`;
const session: StoredSession = {
  user,
  accessToken: jwt,
  expiresAt: Date.now() + 60000,
  pendingLink: false,
  pendingSource: null,
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  jest.mocked(openGuestProfile).mockResolvedValue(guest);
  jest.mocked(openAccountProfile).mockResolvedValue(account);
  jest.mocked(linkGuestProfile).mockResolvedValue(account);
  useAuthStore.setState({ status: 'loading', user: null, profile: null, pendingLink: false });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('opens a guest profile on first launch without network', async () => {
  storage.get.mockResolvedValue(null);
  await useAuthStore.getState().hydrate();
  expect(useAuthStore.getState()).toMatchObject({ status: 'guest', profile: guest });
  expect(api.me).not.toHaveBeenCalled();
});

test('restores exact account profile offline while session remains valid', async () => {
  storage.get.mockResolvedValue(session);
  api.me.mockRejectedValue(new ApiError('offline', undefined, 'NETWORK_ERROR'));
  await useAuthStore.getState().hydrate();
  expect(openAccountProfile).toHaveBeenCalledWith('9007199254740993');
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    user,
    profile: account,
  });
});

test('expired session returns to guest without opening account data', async () => {
  storage.get.mockResolvedValue({ ...session, expiresAt: Date.now() - 1 });
  await useAuthStore.getState().hydrate();
  expect(storage.clear).toHaveBeenCalled();
  expect(openAccountProfile).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe('guest');
});

test('wrong login preserves guest data and session', async () => {
  useAuthStore.setState({ status: 'guest', profile: guest });
  api.login.mockRejectedValue(new ApiError('Sai mật khẩu', 401));
  await expect(
    useAuthStore.getState().login({ email: 'a@b.com', password: 'wrong' }),
  ).rejects.toThrow();
  expect(storage.clear).not.toHaveBeenCalled();
  expect(useAuthStore.getState().profile).toEqual(guest);
});

test('failed local link keeps successful login pending for the same account', async () => {
  useAuthStore.setState({ status: 'guest', profile: guest });
  api.login.mockResolvedValue({ accessToken: jwt, expiresIn: 60, user });
  jest.mocked(linkGuestProfile).mockRejectedValueOnce(new Error('disk'));
  await expect(
    useAuthStore.getState().login({ email: 'a@b.com', password: 'correct' }),
  ).rejects.toMatchObject({ code: 'LOCAL_LINK_FAILED' });
  expect(useAuthStore.getState()).toMatchObject({
    status: 'guest',
    profile: guest,
    pendingLink: true,
  });
  storage.get.mockResolvedValue({ ...session, pendingLink: true, pendingSource: guest });
  await useAuthStore.getState().retryLink();
  expect(linkGuestProfile).toHaveBeenLastCalledWith(user.id, guest);
  expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', profile: account });
});

test('a stale 401 cannot invalidate a newer token', async () => {
  storage.get.mockResolvedValue({ ...session, accessToken: 'new-token' });
  useAuthStore.setState({ status: 'authenticated', profile: account, user });
  await useAuthStore.getState().invalidate('old-token');
  expect(storage.clear).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe('authenticated');
});

test('a logout during login prevents the delayed response from selecting an account', async () => {
  let resolveLogin:
    ((value: { accessToken: string; expiresIn: number; user: User }) => void) | undefined;
  api.login.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
  );
  useAuthStore.setState({ status: 'guest', profile: guest });
  const request = useAuthStore.getState().login({ email: 'a@b.com', password: 'correct' });
  await useAuthStore.getState().logout();
  if (!resolveLogin) throw new Error('Login did not start');
  resolveLogin({ accessToken: jwt, expiresIn: 60, user });
  await request;
  expect(linkGuestProfile).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe('guest');
});

test('an online rejection of a pending link requires reauthentication', async () => {
  storage.get.mockResolvedValue({ ...session, pendingLink: true, pendingSource: guest });
  api.me.mockRejectedValue(new ApiError('revoked', 401));
  await useAuthStore.getState().hydrate();
  expect(storage.clear).toHaveBeenCalled();
  expect(linkGuestProfile).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe('guest');
});

test('does not open account data if the session expires while checking the server', async () => {
  storage.get.mockResolvedValue({ ...session, expiresAt: Date.now() + 1000 });
  api.me.mockImplementation(async () => {
    jest.setSystemTime(Date.now() + 2000);
    return user;
  });
  await useAuthStore.getState().hydrate();
  expect(openAccountProfile).not.toHaveBeenCalled();
  expect(useAuthStore.getState().status).toBe('guest');
  expect(storage.clear).toHaveBeenCalled();
});

test('foreground check clears an expired session', async () => {
  storage.get.mockResolvedValue({ ...session, expiresAt: Date.now() - 1 });
  useAuthStore.setState({ status: 'authenticated', profile: account, user });
  await useAuthStore.getState().checkExpiry();
  expect(storage.clear).toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({ status: 'guest', profile: guest });
});

test('failed secure deletion immediately closes account access and retries clearing before restore', async () => {
  useAuthStore.setState({ status: 'authenticated', profile: account, user });
  storage.clear
    .mockRejectedValueOnce(new Error('secure store unavailable'))
    .mockResolvedValue(undefined);
  await expect(useAuthStore.getState().logout()).rejects.toThrow();
  expect(useAuthStore.getState()).toMatchObject({ status: 'error', user: null, profile: null });
  storage.get.mockResolvedValue(null);
  await useAuthStore.getState().hydrate();
  expect(storage.clear).toHaveBeenCalledTimes(2);
  expect(useAuthStore.getState().status).toBe('guest');
});

test('missing secure session closes account access on foreground', async () => {
  storage.get.mockResolvedValue(null);
  useAuthStore.setState({ status: 'authenticated', profile: account, user });
  await useAuthStore.getState().checkExpiry();
  expect(useAuthStore.getState()).toMatchObject({ status: 'guest', user: null, profile: guest });
});
