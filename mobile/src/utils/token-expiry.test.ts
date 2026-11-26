import { tokenExpiry } from './token-expiry';

test('reads expiry in seconds without losing the bound', () => {
  const payload = Buffer.from(JSON.stringify({ exp: 1700000000 })).toString('base64url');
  expect(tokenExpiry(`header.${payload}.signature`)).toBe(1700000000000);
});

test('rejects malformed tokens and missing expiry', () => {
  expect(tokenExpiry('abc')).toBeNull();
  expect(tokenExpiry('a.e30.b')).toBeNull();
});
