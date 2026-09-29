import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/about/',
  '/services/',
  '/projects/',
  '/contact/',
  '/privacy/',
  '/404.html',
];

test('confirmed proof and manufacturer relationships are visible and bounded', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.intro-copy')).toContainText(
    'More than 13 years of experience',
  );
  await expect(page.locator('.project-proof')).toHaveText(
    '500+ projects completed',
  );
  const manufacturers = page.locator('.manufacturers');
  await expect(manufacturers).toContainText(
    'through dealership and sales-channel relationships',
  );
  for (const name of ['Waaree', 'Adani Solar', 'Tata Power Solar']) {
    const logo = manufacturers.getByRole('img', { name, exact: true });
    await logo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        logo.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await expect(manufacturers).not.toContainText(
    /exclusive|strategic partner|endorsed|authori[sz]ed|tier/i,
  );
  await expect(page.locator('#reviews')).toBeVisible();
  await expect(
    page
      .locator('.site-header, .site-footer')
      .getByRole('link', { name: /reviews/i }),
  ).toHaveCount(0);
});

test('every visible action resolves, including service fragments and branded resources', async ({
  page,
  request,
  baseURL,
}) => {
  for (const path of routes) {
    await page.goto(path);
    for (const shell of ['.site-header', '.site-footer']) {
      const logo = page.locator(`${shell} .wordmark img`);
      await expect(logo).toHaveAttribute('alt', 'Incetekh Solar');
      await expect
        .poll(() =>
          logo.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await expect(
      page.locator(
        'button:not(.review-toggle), a:not([href]), a[href=""], a[href="#"], a[href^="javascript:"], a[href^="mailto:"]',
      ),
    ).toHaveCount(0);
    const links = await page
      .locator('a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!));
    for (const href of new Set(links)) {
      if (href.startsWith('tel:')) {
        expect(href).toBe('tel:+919441259786');
        continue;
      }
      const url = new URL(href, `${baseURL}${path}`);
      expect(url.origin).toBe(baseURL);
      if (url.hash) {
        expect(url.pathname).toBe(path);
        await expect(page.locator(url.hash)).toHaveCount(1);
      } else expect((await request.get(url.pathname)).status()).toBe(200);
    }
    for (const selector of [
      'link[rel="icon"]',
      'link[rel="apple-touch-icon"]',
      'meta[property="og:image"]',
    ]) {
      const element = page.locator(selector);
      const url =
        (await element.getAttribute('href')) ??
        (await element.getAttribute('content'))!;
      expect((await request.get(new URL(url, baseURL).pathname)).status()).toBe(
        200,
      );
    }
    await expect(page.locator('body')).not.toContainText(
      /approximately 15|\bMW\b|\bMWh\b|\bexclusive dealership\b/i,
    );
  }
  await page.goto('/services/');
  await page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'System care' })
    .click();
  await expect(page.locator('#checks-heading')).toBeInViewport();
});

for (const width of [390, 768, 1440, 1920]) {
  test(`compact header and image space remain stable at ${width}px`, async ({
    page,
  }) => {
    let releaseImages!: () => void;
    const imagesReady = new Promise<void>((resolve) => {
      releaseImages = resolve;
    });
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'image') await imagesReady;
      await route.continue();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const logo = page.locator('.site-header .wordmark img');
    const header = (await page.locator('.site-header').boundingBox())!;
    expect(header.height).toBeLessThan(width < 704 ? 142 : 90);
    expect((await logo.boundingBox())!.width).toBeLessThanOrEqual(88);
    const positions = () =>
      page.locator('img, #reviews, .site-footer').evaluateAll((els) =>
        els.map((el) => {
          const box = el.getBoundingClientRect();
          return [box.x, box.y + scrollY, box.width, box.height];
        }),
      );
    const before = await positions();
    releaseImages();
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((el: HTMLImageElement) => el.decode());
    }
    await page.locator('.review-track').evaluate((el) => {
      el.scrollLeft = 0;
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await positions()).toEqual(before);
  });
}
