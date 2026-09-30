import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cities, cityPath } from '../src/data/cities';

test('every city opens a complete local guide with working actions and unique metadata', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/');
  const links = page.locator('.city-links a');
  await expect(links).toHaveCount(13);
  expect(
    await links.evaluateAll((els) => els.map((el) => el.getAttribute('href'))),
  ).toEqual(cities.map((city) => cityPath(city.slug)));
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const city of cities) {
    await page
      .locator('.city-links')
      .getByRole('link', { name: city.name, exact: true })
      .click();
    await expect(page).toHaveURL(`${baseURL}${cityPath(city.slug)}`);
    await expect(page.locator('h1')).toHaveText(
      `Rooftop solar in ${city.name}.`,
    );
    await expect(page.locator('.city-links a[aria-current="page"]')).toHaveText(
      city.name,
    );
    titles.add(await page.title());
    descriptions.add(
      (await page.locator('meta[name="description"]').getAttribute('content'))!,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://incetekhenergy.com${cityPath(city.slug)}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      process.env.PUBLIC_SITE_INDEXABLE === 'true'
        ? 'index, follow'
        : 'noindex, follow',
    );
    await expect(page.locator('.product-card')).toHaveCount(3);
    await expect(page.locator('.subsidy-grid dd')).toHaveText([
      '₹30,000',
      '₹60,000',
      '₹78,000',
    ]);
    await expect(page.locator('.size-card')).toHaveCount(4);
    await expect(page.locator('.process-grid li')).toHaveCount(4);
    await expect(page.locator('.availability')).toContainText(
      'confirmed when you enquire',
    );
    const cta = page.getByRole('link', {
      name: 'Plan a free site visit',
      exact: true,
    });
    await cta.click();
    await expect(page).toHaveURL(
      new RegExp(`${cityPath(city.slug)}#city-enquiry$`),
    );
    await expect(page.locator('#city-enquiry-heading')).toBeInViewport();
    const whatsapp = new URL(
      (await page
        .locator('#city-enquiry .whatsapp-link')
        .getAttribute('href'))!,
    );
    expect(whatsapp.origin).toBe('https://wa.me');
    expect(whatsapp.searchParams.get('text')).toContain(city.name);
    // Check every internal action, including category fragments, without contacting external services.
    for (const href of new Set(
      await page
        .locator('main a')
        .evaluateAll((els) => els.map((el) => el.getAttribute('href')!)),
    )) {
      const url = new URL(href, page.url());
      if (url.origin !== baseURL) continue;
      const response = await request.get(url.pathname);
      expect(response.status(), href).toBe(200);
      if (url.hash)
        expect(await response.text(), href).toContain(
          `id="${url.hash.slice(1)}"`,
        );
    }
  }
  expect(titles.size).toBe(13);
  expect(descriptions.size).toBe(13);
});

for (const width of [320, 390, 768, 1440]) {
  test(`all page layouts stay aligned and contained at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of [
      '/',
      '/about/',
      '/services/',
      '/products/',
      '/projects/',
      '/contact/',
      '/solar-guide/',
      '/financing/',
      '/terms/',
      '/privacy/',
      '/404.html',
      '/solar-in/nellore/',
      '/solar-in/visakhapatnam/',
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      // Every button stays within its containing block, including long product/city labels.
      const buttonIssues = await page.locator('.button').evaluateAll((els) =>
        els.flatMap((el) => {
          const box = el.getBoundingClientRect();
          const parent = el.parentElement!.getBoundingClientRect();
          return box.width > parent.width + 1 ||
            box.height < 44 ||
            box.x < 0 ||
            box.right > innerWidth + 1
            ? [el.textContent?.trim()]
            : [];
        }),
      );
      expect(buttonIssues, route).toEqual([]);
      const header = (await page.locator('.header-inner').boundingBox())!;
      const content = page.locator('main .container').first();
      const box = (await content.boundingBox())!;
      const reading = await content.evaluate((el) =>
        el.classList.contains('reading-container'),
      );
      if (reading) {
        const body = (await page
          .locator('main > div.reading-container')
          .boundingBox())!;
        expect(Math.abs(box.x - body.x), route).toBeLessThan(1);
        expect(Math.abs(box.x - (width - box.width) / 2), route).toBeLessThan(
          1,
        );
      } else expect(Math.abs(box.x - header.x), route).toBeLessThan(1);
    }
    for (const route of ['/solar-in/nellore/', '/solar-in/visakhapatnam/']) {
      await page.goto(route);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
  });
}

test('city navigation and visit enquiry work without JavaScript and by keyboard', async ({
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
  const city = page
    .locator('.city-links')
    .getByRole('link', { name: 'Nellore', exact: true });
  await city.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/solar-in\/nellore\/$/);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page
    .getByRole('link', { name: 'Plan a free site visit', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#city-enquiry-heading')).toBeInViewport();
  await expect(page.locator('#city-enquiry .whatsapp-link')).toHaveAttribute(
    'href',
    /Nellore/,
  );
  await context.close();
});
