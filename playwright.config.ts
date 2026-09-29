import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: 'http://127.0.0.1:4321',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
  },
});
