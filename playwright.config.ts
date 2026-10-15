import { defineConfig } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT || '4321';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      process.env.PLAYWRIGHT_WORKER === 'true'
        ? `node node_modules/wrangler/bin/wrangler.js dev --local --ip 127.0.0.1 --port ${port} --log-level error`
        : `npm run preview -- --port ${port}`,
    env: { WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_SEND_METRICS: 'false' },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
