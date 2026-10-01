import { defineConfig } from 'vitest/config';

// Security-rules tests run against the Firebase Realtime Database emulator (see `npm run test:rules`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/**/*.test.js'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
