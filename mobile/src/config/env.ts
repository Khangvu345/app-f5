// Expo inlines EXPO_PUBLIC_* at build time, so each variable must be
// referenced statically as `process.env.EXPO_PUBLIC_XXX` (no dynamic lookup).
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing env var ${name}. Copy .env.example to .env and restart Expo.`);
  }
  return value;
}

export const env = {
  apiBaseUrl: required(process.env.EXPO_PUBLIC_API_BASE_URL, 'EXPO_PUBLIC_API_BASE_URL'),
  apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000),
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  appleEnabled: process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === 'true',
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
