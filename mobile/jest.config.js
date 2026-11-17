/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Tests live next to the code they test. Never put them inside src/app (those files are routes).
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/app/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
