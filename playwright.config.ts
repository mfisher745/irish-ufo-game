import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  use: { baseURL: 'http://localhost:4173/irish-ufo-game/' },
  webServer: {
    command: 'pnpm build && pnpm exec vite preview',
    url: 'http://localhost:4173/irish-ufo-game/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
