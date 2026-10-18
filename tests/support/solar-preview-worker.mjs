import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

export function previewWorker(patch = {}) {
  return new Miniflare(
    convertV4MiniflareOptions({
      modules: [
        'index',
        'email',
        'solar',
        'solar-endpoint',
        'solar-page',
        'preview-context',
      ].map((name) => ({
        type: 'ESModule',
        path: `.wrangler/test-worker/${name}.js`,
      })),
      compatibilityDate: '2026-09-30',
      cf: false,
      telemetry: { enabled: false },
      bindings: {
        SOLAR_PREVIEW_ENABLED: 'true',
        SOLAR_ALLOWED_ORIGIN: 'https://incetekhenergy.com',
        SOLAR_MAPS_BROWSER_KEY: 'synthetic-public-browser-key',
        SOLAR_TURNSTILE_SITE_KEY: 'synthetic-public-widget',
        SOLAR_API_KEY: 'synthetic-private-solar-secret',
        TURNSTILE_SECRET_KEY: 'synthetic-private-challenge-secret',
        RATE_LIMIT_KEY_SECRET: 'synthetic-private-rate-secret-32-characters',
        SOLAR_DAILY_LIMIT: '50',
        SOLAR_MONTHLY_LIMIT: '300',
        ...patch,
      },
      d1Databases: { LEADS_DB: 'local-only-solar-page' },
      ratelimits: {
        SOLAR_RATE_LIMIT: {
          namespace_id: '1009',
          simple: { limit: 3, period: 60 },
        },
      },
      serviceBindings: {
        ASSETS: async () =>
          new Response(
            await readFile('dist/solar-preview/index.html', 'utf8'),
            { headers: { 'Content-Type': 'text/html' } },
          ),
      },
      outboundService: () => {
        throw new Error('External requests are forbidden in this test');
      },
    }),
  );
}
