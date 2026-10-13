import { isAllowedExternal } from './support/links';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

test('semantic shell, metadata, and main navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Incetekh Energy | Solar Engineering & EPC');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /solar engineering/i,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://incetekhenergy.com/',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, follow',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /^https:\/\/incetekhenergy\.com\/_astro\/.+\.jpg$/,
  );
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link'),
  ).toHaveText(['About', 'Services', 'Products', 'Projects', 'Contact']);
  await expect(
    page.getByRole('form', { name: 'Request a free site visit' }),
  ).toHaveCount(1);
  await expect(page.locator('script[src]:not([src^="/_astro/"])')).toHaveCount(
    0,
  );
  await expect(page.locator('script[type="module"]')).toHaveCount(4);
});

test('keyboard skip link and contact navigation work', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await expect(skip).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Contact', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/contact/');
  const call = page.getByRole('link', {
    name: 'Call +91 94412 59786',
    exact: true,
  });
  await call.focus();
  await expect(call).toBeFocused();
  await expect(call).toHaveAttribute('href', 'tel:+919441259786');
});

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`responsive shell and accessibility at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole('img', {
        name: 'Rows of solar panels mounted on raised frames above a concrete rooftop.',
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const link of await page.locator('a:visible').all()) {
      if ((await link.getAttribute('class')) === 'skip-link') continue;
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const image = page.getByRole('img', {
      name: 'Rows of solar panels mounted on raised frames above a concrete rooftop.',
      exact: true,
    });
    await expect(image).toHaveAttribute('srcset', /480w.*800w.*1280w/);
    expect(
      await image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    for (const photo of await page.locator('img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          photo.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await page.locator('[data-strip-track]').evaluateAll((els) => {
      els.forEach((el) => (el.scrollLeft = 0));
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`home-${width}.png`),
      fullPage: true,
    });
  });
}

test('all local links and assets resolve without external browser requests', async ({
  page,
  request,
  baseURL,
}) => {
  const failures: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== baseURL) external.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const hrefs = await page
    .locator('a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  for (const href of new Set(hrefs)) {
    if (href.startsWith('#')) await expect(page.locator(href)).toHaveCount(1);
    else if (href.startsWith('/'))
      expect((await request.get(href)).status()).toBe(200);
    else expect(isAllowedExternal(href)).toBe(true);
  }
  for (const selector of ['link[rel="icon"]', 'meta[property="og:image"]']) {
    const element = page.locator(selector);
    const url =
      (await element.getAttribute('href')) ??
      (await element.getAttribute('content'))!;
    expect(
      (
        await request.get(new URL(url, 'https://incetekhenergy.com').pathname)
      ).status(),
    ).toBe(200);
  }
  expect(failures).toEqual([]);
  expect(external).toEqual([]);
});

test('works without JavaScript and with reduced motion', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
    baseURL,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'WhatsApp', exact: true }),
  ).toHaveCSS('transition-duration', '0s');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Contact', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: 'Call +91 94412 59786', exact: true }),
  ).toBeInViewport();
  await context.close();
});

test('text scaling and forced-colors retain usable controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect(page.locator('html')).toHaveCSS('font-size', '32px');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(
    page.getByRole('link', { name: 'WhatsApp', exact: true }),
  ).toHaveCSS('border-top-style', 'solid');
});

test('missing page uses the shared accessible error shell', async ({
  page,
}) => {
  const response = await page.goto('/page-that-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Page not found.',
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
});

test('static output keeps planning and motion scripts small and local', async () => {
  const files: string[] = [];
  async function walk(path: string) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else files.push(child);
    }
  }
  await walk('dist');
  const scripts = files.filter((file) => file.endsWith('.js'));
  const scriptBytes = await Promise.all(
    scripts.map(async (file) => (await stat(file)).size),
  );
  expect(scriptBytes.reduce((sum, size) => sum + size, 0)).toBeLessThan(10_000);
  expect(
    files.some((file) => /review pictures|ChatGPT|hf_2026/.test(file)),
  ).toBe(false);
  // Translated HTML shares the same assets; cap asset size and each page separately.
  const assets = files.filter((file) => !file.endsWith('.html'));
  const bytes = await Promise.all(
    assets.map(async (file) => (await stat(file)).size),
  );
  expect(bytes.reduce((sum, size) => sum + size, 0)).toBeLessThan(2_100_000);
  for (const file of files.filter((file) => file.endsWith('.html'))) {
    expect((await stat(file)).size, file).toBeLessThan(400_000);
  }
});
