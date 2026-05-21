import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.js',
      '../scripts/__tests__/**/*.test.js',
    ],
    env: {
      JWT_SECRET: 'test-secret-for-vitest',
    },
  },
});
