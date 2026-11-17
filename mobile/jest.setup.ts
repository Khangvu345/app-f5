// Runs before every test file. `src/config/env.ts` reads these at import time.
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080/api/v1';
process.env.EXPO_PUBLIC_API_TIMEOUT_MS = '1000';
process.env.EXPO_PUBLIC_APP_ENV = 'test';
