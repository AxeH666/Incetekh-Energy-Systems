import { test, expect } from '@playwright/test';

test('four photos float, loop, pause and respect reduced motion', async ({
  page,
}) => {
  await page.goto('/');
  const track = page.getByRole('region', { name: 'Solar photo gallery' });
  const toggle = page.locator('.gallery-toggle');
  await expect(track.getByRole('listitem')).toHaveCount(4);
  await expect(track.getByRole('img', { name: /Illustrative/ })).toHaveCount(3);
  expect(
    new Set(
      await track
        .getByRole('img')
        .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src'))),
    ).size,
  ).toBe(4);
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(8);
  await toggle.click();
  await expect(toggle).toHaveText('Resume gallery');
  const paused = await track.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(paused);
  const cycle = await track.evaluate(
    (el) =>
      el.querySelector('ul')!.getBoundingClientRect().width +
      parseFloat(getComputedStyle(el).columnGap),
  );
  await track.evaluate((el, x) => {
    el.scrollLeft = x;
  }, cycle - 4);
  await toggle.click();
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeLessThan(40);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toBeHidden();
  await expect(track.locator('ul')).toHaveCount(1);
  await track.focus();
  const before = await track.evaluate((el) => el.scrollLeft);
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before);
});

test('individual original and repeated review cards lift without vertical clipping', async ({
  page,
}) => {
  await page.goto('/');
  const track = page.locator('.review-track');
  await track.scrollIntoViewIfNeeded();
  await page.locator('.review-toggle').click();
  for (const list of await track.locator('ul').all()) {
    const card = list.locator('.review').nth(1);
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const before = (await card.boundingBox())!;
    await card.hover();
    await expect
      .poll(async () => (await card.boundingBox())!.width)
      .toBeGreaterThan(before.width + 5);
    const after = (await card.boundingBox())!;
    const bounds = (await track.boundingBox())!;
    expect(after.y).toBeLessThan(before.y - 4);
    expect(after.y).toBeGreaterThanOrEqual(bounds.y);
    expect(after.y + after.height).toBeLessThan(bounds.y + bounds.height);
    await expect(card).not.toHaveCSS('box-shadow', 'none');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const first = track.locator('.review').first();
  await first.hover();
  await expect(first).toHaveCSS('transform', 'none');
});

test('linked headings lift on hover and focus; footer and WhatsApp are consistent on every route', async ({
  page,
}) => {
  await page.goto('/');
  const service = page.locator('.free-service-list > a').first();
  await service.hover();
  await expect(service).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -5)');
  await page.mouse.move(0, 0);
  await service.focus();
  await expect(service).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -5)');
  for (const route of [
    '/',
    '/about/',
    '/services/',
    '/projects/',
    '/contact/',
    '/privacy/',
    '/404.html',
  ]) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('\u2197');
    const footerLink = page.locator('.site-footer nav a').first();
    await footerLink.hover();
    await expect(footerLink).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, -3)',
    );
    for (const link of await page.locator('.whatsapp-link').all()) {
      await expect(link).toHaveAttribute('href', 'https://wa.me/919441259786');
      const icon = (await link.locator('img').boundingBox())!;
      expect(icon.width).toBe(22);
      expect(icon.height).toBe(22);
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const footerLink = page.locator('.site-footer nav a').first();
  await footerLink.hover();
  await expect(footerLink).toHaveCSS('transform', 'none');
});

test('gallery remains manually browsable without JavaScript on mobile', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/');
  const track = page.getByRole('region', { name: 'Solar photo gallery' });
  await expect(page.locator('.gallery-toggle')).toBeHidden();
  await expect(track.getByRole('img')).toHaveCount(4);
  await track.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await track.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await expect(track.getByRole('img').last()).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
