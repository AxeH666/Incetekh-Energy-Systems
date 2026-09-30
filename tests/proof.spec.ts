import { test, expect } from '@playwright/test';

// Temporary copy is a private prelaunch design fixture, not verified evidence.
test('homepage contains ten distinct photo reviews without invented attribution', async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const section = page.locator('[data-review-status="illustrative"]');
  await expect(section.locator('.review')).toHaveCount(10);
  await expect(
    section.locator('blockquote, cite, [itemtype*="Review"]'),
  ).toHaveCount(0);
  await expect(section).not.toContainText(
    /sample review|sample copy|testimonial to be added|lorem ipsum|five.star|verified customer/i,
  );
  await expect(section.locator('.review img')).toHaveCount(10);
  expect(
    new Set(
      await section
        .locator('.review img')
        .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src'))),
    ).size,
  ).toBe(10);
  for (const img of await section.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('width', '640');
    await expect(img).toHaveAttribute('height', /^(320|640)$/);
    await expect(img).toHaveAttribute('srcset', /320w.*640w/);
    await expect
      .poll(() =>
        img.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
    const response = await request.get((await img.getAttribute('src'))!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/webp');
  }
});

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`feedback track can be read with keyboard at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const track = page.getByRole('region', {
      name: 'Customer feedback',
      exact: true,
    });
    await track.focus();
    await expect(track).toBeFocused();
    await expect(track).toHaveCSS('outline-style', 'solid');
    expect(await track.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true,
    );
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => track.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    // Hidden scrollbars retain native touch/trackpad and direct end positioning.
    await track.evaluate((el) =>
      el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }),
    );
    await expect(page.locator('.review').last()).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press('Tab');
    await expect(
      page.locator('.site-visit').getByRole('link', {
        name: 'Talk to an expert on WhatsApp',
        exact: true,
      }),
    ).toBeFocused();
  });
}

test('feedback supports reduced motion, no JavaScript and mobile swipe', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/');
  const track = page.getByRole('region', {
    name: 'Customer feedback',
    exact: true,
  });
  await track.scrollIntoViewIfNeeded();
  await expect(track).toHaveCSS('scroll-snap-type', 'none');
  await expect(track).toHaveCSS('scroll-behavior', 'auto');
  const box = (await track.boundingBox())!;
  const session = await context.newCDPSession(page);
  const y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width - 20, y }],
  });
  for (let i = 1; i <= 8; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width - 20 - i * 30, y }],
    });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(100);
  await context.close();
});

test('old reviews destination redirects to the homepage section and leaves sitemap', async ({
  page,
  request,
  baseURL,
}) => {
  const html = await (await request.get('/reviews/')).text();
  expect(html).toContain('http-equiv="refresh"');
  expect(html).toContain('/#reviews');
  await page.goto('/reviews/');
  await expect(page).toHaveURL(`${baseURL}/#reviews`);
  await expect(page.locator('#reviews-heading')).toBeInViewport();
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain(
    '/reviews/',
  );
});

test('automatic scrolling continues on hover and pauses for focus, button and reduced motion', async ({
  page,
}) => {
  await page.goto('/');
  const track = page.locator('.review-track');
  const toggle = page.getByRole('button', {
    name: /^(Pause|Resume) scrolling$/,
  });
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(1439, 999);
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(8);
  await track.hover();
  const hoverPosition = await track.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(
    hoverPosition + 5,
  );
  await page.mouse.move(1439, 999);
  await track.focus();
  const focusPosition = await track.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(focusPosition);
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-label', 'Resume scrolling');
  await page.mouse.move(1439, 999);
  await toggle.evaluate((el) => el.blur());
  const pausedPosition = await track.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(pausedPosition);
  await toggle.focus();
  await toggle.press('Enter');
  await page.mouse.move(1439, 999);
  await toggle.evaluate((el) => el.blur());
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(pausedPosition + 5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toBeHidden();
  const reducedPosition = await track.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(reducedPosition);
});

test('floating reviews cross the loop boundary and expose each entry once to assistive technology', async ({
  page,
}) => {
  await page.goto('/');
  const track = page.locator('.review-track');
  const toggle = page.locator('.review-toggle');
  await track.scrollIntoViewIfNeeded();
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-label', 'Resume scrolling');
  await expect(track.getByRole('listitem')).toHaveCount(10);
  await expect(
    track.locator(
      '.review-list[aria-hidden="true"] a, .review-list[aria-hidden="true"] button, .review-list[aria-hidden="true"] [tabindex]',
    ),
  ).toHaveCount(0);
  const cycle = await track.evaluate(
    (el) =>
      el.querySelector('ul')!.getBoundingClientRect().width +
      parseFloat(getComputedStyle(el).columnGap),
  );
  await track.evaluate((el, x) => (el.scrollLeft = x), cycle - 4);
  await toggle.focus();
  await toggle.press('Enter');
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeLessThan(50);
  const afterWrap = await track.evaluate((el) => el.scrollLeft);
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(afterWrap + 8);
  await expect(toggle).toHaveAttribute('aria-label', 'Pause scrolling');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track.locator('.review-list')).toHaveCount(1);
});

test('touch interaction stops automatic movement until Resume is chosen', async ({
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
  const track = page.locator('.review-track');
  const toggle = page.locator('.review-toggle');
  await track.scrollIntoViewIfNeeded();
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(8);
  await track.tap();
  await expect(toggle).toHaveAttribute('aria-label', 'Resume scrolling');
  const paused = await track.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await track.evaluate((el) => el.scrollLeft)).toBe(paused);
  await toggle.focus();
  await toggle.press('Enter');
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(paused + 8);
  await context.close();
});

for (const width of [390, 1440, 3840]) {
  test(`loop seam is visually identical and has enough content at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const track = page.locator('.review-track');
    await track.scrollIntoViewIfNeeded();
    await page.locator('.review-toggle').focus();
    await page.locator('.review-toggle').press('Enter');
    for (const img of await track.locator('img').all()) {
      await img.evaluate((el: HTMLImageElement) => {
        el.loading = 'eager';
        return el.decode();
      });
    }
    const cycle = await track.evaluate(
      (el) =>
        el.querySelector('ul')!.getBoundingClientRect().width +
        parseFloat(getComputedStyle(el).columnGap),
    );
    expect(
      await track.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeGreaterThanOrEqual(cycle);
    await track.evaluate((el) => (el.scrollLeft = 0));
    const box = (await track.boundingBox())!;
    const clip = {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height - 32,
    };
    const start = await page.screenshot({ clip });
    await track.evaluate((el, x) => (el.scrollLeft = x), cycle);
    const loop = await page.screenshot({ clip });
    expect(start.equals(loop)).toBe(true);
  });
}
