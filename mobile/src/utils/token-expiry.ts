/** Read only the expiry bound from the server-issued JWT; the server verifies its signature. */
export function tokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  let bits = 0;
  let buffer = 0;
  let decoded = '';
  for (const char of payload) {
    const index = alphabet.indexOf(char);
    if (index < 0) return null;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      decoded += String.fromCharCode((buffer >> bits) & 255);
    }
  }
  try {
    const claims: unknown = JSON.parse(decoded);
    if (typeof claims !== 'object' || claims === null || !('exp' in claims)) return null;
    const exp = claims.exp;
    return typeof exp === 'number' && Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}
