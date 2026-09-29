import { test, expect } from '@playwright/test';

// Temporary copy is a private prelaunch design fixture, not verified evidence.
test('homepage feedback is centralized, unattributed and separate from archive photographs', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const section = page.locator('[data-review-status="illustrative"]');
  await expect(section.locator('.review')).toHaveCount(13);
  await expect(
    section.locator('.review img, blockquote, cite, [itemtype*="Review"]'),
  ).toHaveCount(0);
  await expect(section).not.toContainText(
    /sample review|sample copy|testimonial to be added|lorem ipsum|five.star|verified customer/i,
  );
  await expect(section.locator('.review-archive')).toContainText(
    'Incetekh installation archive',
  );
  for (const img of await section.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('width', '800');
    await expect(img).toHaveAttribute('height', '800');
    await expect(img).toHaveAttribute('srcset', /160w.*320w.*800w/);
    await expect
      .poll(() =>
        img.evaluate(
          (el: HTMLImageElement) =>
            el.complete && el.naturalWidth === el.naturalHeight,
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
    // Native horizontal scrollbars support touch/trackpad and direct end positioning too.
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
      page.getByRole('link', { name: 'Call +91 94412 59786', exact: true }),
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
