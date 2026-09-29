import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const routes = [
  '/',
  '/about/',
  '/services/',
  '/projects/',
  '/contact/',
  '/privacy/',
];
const launch = process.env.PUBLIC_SITE_INDEXABLE === 'true';
const token = launch ? process.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN : '';

test('every public page has unique metadata, working local resources and safe configuration', async ({
  page,
  request,
}) => {
  // Never contact a real analytics service from this test, including launch-mode tests.
  let beaconRequests = 0;
  await page.route(
    'https://static.cloudflareinsights.com/**',
    async (route) => {
      beaconRequests++;
      await route.fulfill({
        contentType: 'application/javascript',
        body: '/* local test substitute */',
      });
    },
  );
  await page.route('https://cloudflareinsights.com/**', (route) =>
    route.abort(),
  );
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of routes) {
    await page.goto(path);
    titles.add(await page.title());
    descriptions.add(
      (await page.locator('meta[name="description"]').getAttribute('content'))!,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://incetekhenergy.com${path}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      launch ? 'index, follow' : 'noindex, follow',
    );
    await expect(
      page.locator('meta[http-equiv="content-security-policy"]'),
    ).toHaveAttribute('content', /object-src 'none'/);
    await expect(page.locator('script[src]')).toHaveCount(token ? 1 : 0);
    if (token)
      await expect(page.locator('script[data-cf-beacon]')).toHaveAttribute(
        'data-cf-beacon',
        JSON.stringify({ token }),
      );
    if (process.env.PUBLIC_GOOGLE_SITE_VERIFICATION)
      await expect(
        page.locator('meta[name="google-site-verification"]'),
      ).toHaveAttribute('content', process.env.PUBLIC_GOOGLE_SITE_VERIFICATION);
    for (const href of await page
      .locator('a[href^="/"], link[rel="stylesheet"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!))) {
      expect((await request.get(href)).status()).toBe(200);
    }
  }
  expect(titles.size).toBe(routes.length);
  expect(descriptions.size).toBe(routes.length);
  expect(beaconRequests).toBe(token ? routes.length : 0);
  expect(errors).toEqual([]);
  await expect(page.getByRole('main')).toContainText(
    token
      ? 'Cloudflare Web Analytics is enabled'
      : 'Website analytics is currently disabled',
  );
});

test('sitemap and robots agree with indexing mode and exclude error pages', async ({
  request,
}) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(urls).toEqual(
    launch ? routes.map((path) => `https://incetekhenergy.com${path}`) : [],
  );
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /');
  expect(
    robots.includes('Sitemap: https://incetekhenergy.com/sitemap.xml'),
  ).toBe(launch);
  expect(robots).not.toContain('Disallow: /');
});

test('organization schema uses confirmed identity and never sample reviews', async ({
  page,
}) => {
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/');
  const raw = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const schema = JSON.parse(raw!);
  expect(schema['@graph'][0]).toMatchObject({
    '@type': 'Organization',
    name: 'Incetekh Energy',
    telephone: '+919441259786',
    url: 'https://incetekhenergy.com/',
  });
  expect(schema['@graph'][0].logo).toBe(
    await page.locator('meta[property="og:image"]').getAttribute('content'),
  );
  expect(raw).not.toMatch(
    /Review|AggregateRating|address|foundingDate|award|sameAs|email/,
  );
  const response = await page.goto('/missing-page/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, follow',
  );
  await expect(page.locator('link[rel="canonical"], script')).toHaveCount(0);
});

test('deployment header file sets bounded security and hashed-asset caching', async () => {
  const headers = (await readFile('dist/_headers', 'utf8')).replace(
    /\r\n/g,
    '\n',
  );
  expect(headers).toContain('X-Content-Type-Options: nosniff');
  expect(headers).toContain('X-Frame-Options: DENY');
  expect(headers).toContain(
    '/_astro/*\n  Cache-Control: public, max-age=31536000, immutable',
  );
});
