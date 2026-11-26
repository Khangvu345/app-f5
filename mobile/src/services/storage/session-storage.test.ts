import * as SecureStore from 'expo-secure-store';

import { sessionStorage } from './session-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

test('restores a provider session with no email and preserves the guest source', async () => {
  const payload = Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url');
  const session = {
    accessToken: `a.${payload}.c`,
    expiresAt: 2100000000000,
    user: { id: '9007199254740993', email: null, displayName: 'Khách', planType: 'FREE' },
    pendingLink: true,
    pendingSource: { dbName: 'profile-1.db', serverUserId: null },
  };
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(session));
  expect(await sessionStorage.get()).toEqual({ ...session, expiresAt: 2000000000000 });
});
