import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.playwright', 'auth.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'https://epuredrive.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    extraHTTPHeaders: {
      'x-bypass-token': process.env.PLAYWRIGHT_BYPASS_TOKEN || '',
    },
  },
  projects: [
    // Auth setup — runs first to create session
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Public tests — no auth needed
    {
      name: 'chromium',
      testIgnore: /dashboard.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Dashboard tests — reuse saved auth session
    {
      name: 'chromium-auth',
      testMatch: /dashboard.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
      testIgnore: /dashboard.*\.spec\.ts/,
    },
  ],
});
