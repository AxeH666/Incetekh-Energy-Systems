import { test, expect } from '@playwright/test';

test('gallery shows one photo at a time with automatic fading and dot selection', async ({
  page,
}) => {
  await page.goto('/');
  const gallery = page.locator('.project-gallery');
  const track = page.getByRole('region', { name: 'Solar photo gallery' });
  const slides = gallery.locator('.gallery-slide');
  const toggle = gallery.locator('.gallery-toggle');
  const dots = gallery.locator('.gallery-dot');
  await expect(track.getByRole('img')).toHaveCount(1);
  await expect(slides).toHaveCount(4);
  expect(
    new Set(
      await slides
        .locator('img')
        .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src'))),
    ).size,
  ).toBe(4);
  await expect(slides.nth(1)).toHaveAttribute('data-active', '', {
    timeout: 7000,
  });
  await expect(slides.nth(1)).toHaveCSS('opacity', '1');
  await expect(slides.first()).toHaveCSS('opacity', '0');
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
  await dots.nth(3).click();
  await expect(dots.nth(3)).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Resume gallery');
  await expect(track.getByRole('img')).toHaveAttribute(
    'alt',
    /Illustrative scene of workers/,
  );
  await toggle.click();
  await expect(slides.first()).toHaveAttribute('data-active', '', {
    timeout: 7000,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toBeHidden();
  await track.focus();
  await page.keyboard.press('ArrowRight');
  await expect(dots.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(slides.nth(1)).toHaveCSS('transition-duration', '0s');
  await expect(track.getByRole('img')).toHaveCount(1);
});

test('photo captions, pause text and scrollbar chrome are absent', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.locator('.project-gallery figcaption, .gallery-heading'),
  ).toHaveCount(0);
  for (const selector of ['.gallery-toggle', '.review-toggle']) {
    const button = page.locator(selector);
    await expect(button).toHaveText('');
    await expect(button).toHaveAccessibleName(/Pause/);
  }
  for (const selector of ['.gallery-track', '.review-track']) {
    await expect(page.locator(selector)).toHaveCSS('scrollbar-width', 'none');
  }
});

test('mobile swipes change one photo and keep playback paused', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  const track = page.locator('.gallery-track');
  await track.scrollIntoViewIfNeeded();
  const box = (await track.boundingBox())!;
  const session = await context.newCDPSession(page);
  const y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width - 30, y }],
  });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width - 30 - i * 30, y }],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(page.locator('.gallery-dot').nth(1)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.gallery-toggle')).toHaveAttribute(
    'aria-label',
    'Resume gallery',
  );
  await page.waitForTimeout(5200);
  await expect(page.locator('.gallery-dot').nth(1)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
  await context.close();
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
