import { test, expect } from '@playwright/test';

test('local Wrangler preserves static pages and closes the unconfigured API', async ({
  request,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_WORKER !== 'true',
    'Requires the local Worker runtime',
  );
  const api = await request.get('/api/site-visits');
  expect(api.status()).toBe(405);
  expect(api.headers()['cache-control']).toBe('no-store');
  expect(api.headers()['x-robots-tag']).toContain('noindex');
  expect((await request.post('/api/site-visits', { data: {} })).status()).toBe(
    403,
  );
  expect((await request.get('/api/missing')).status()).toBe(404);
  expect((await request.get('/privacy/')).status()).toBe(200);
  expect((await request.get('/synthetic-missing-page/')).status()).toBe(404);
  const redirected = await request.get('/reviews/', { maxRedirects: 0 });
  // Astro's existing static redirect is an HTML refresh, not an edge 301.
  expect(redirected.status()).toBe(200);
  expect(await redirected.text()).toContain('url=/#reviews');
});
