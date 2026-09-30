import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { cities, cityPath } from '../src/data/cities';
import {
  translatedLanguages,
  languages,
  localPath,
  sourcePath,
} from '../src/i18n/languages';

const paths = [
  '/',
  '/about/',
  '/services/',
  '/products/',
  '/projects/',
  '/contact/',
  '/solar-guide/',
  '/financing/',
  '/privacy/',
  '/terms/',
  ...cities.map((city) => cityPath(city.slug)),
];
const scripts = {
  en: /[a-zA-Z]/,
  te: /[\u0c00-\u0c7f]/,
  hi: /[\u0900-\u097f]/,
  ta: /[\u0b80-\u0bff]/,
  ml: /[\u0d00-\u0d7f]/,
  kn: /[\u0c80-\u0cff]/,
};

test('all translated routes contain native text, localized metadata and internal navigation', async ({
  page,
  request,
}) => {
  for (const { code, name } of translatedLanguages) {
    for (const path of paths) {
      const route = localPath(path, code);
      const response = await request.get(route);
      expect(response.status(), route).toBe(200);
      const html = await response.text();
      expect(html).toContain(`lang="${code}"`);
      expect(html).toContain(
        `rel="canonical" href="https://incetekhenergy.com${route}"`,
      );
      expect(html).toMatch(scripts[code]);
    }
    await page.goto(`/${code}/solar-in/nellore/`);
    await expect(page.locator('[data-language-label]')).toHaveText(name);
    await expect(
      page.locator(`a[data-language-option="${code}"]`),
    ).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('h1')).toContainText('Nellore');
    await expect(page.locator('h1')).toContainText(scripts[code]);
    await expect(page.locator('.subsidy-grid dd')).toHaveText([
      '₹30,000',
      '₹60,000',
      '₹78,000',
    ]);
    for (const href of await page
      .locator('main a[href^="/"], .site-footer a[href^="/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!)))
      expect(href).toMatch(new RegExp(`^/${code}/`));
    for (const href of await page
      .locator('.whatsapp-link')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!))) {
      const url = new URL(href);
      expect(url.origin + url.pathname).toBe('https://wa.me/919441259786');
      expect(url.searchParams.get('text')).toContain('Nellore');
      expect(url.searchParams.get('text')).toMatch(scripts[code]);
    }
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(
      7,
    );
  }
});

test('language menu preserves page and fragment, supports keyboard, outside click and no JavaScript', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/solar-in/nellore/#city-enquiry');
  const menu = page.locator('[data-language-menu]');
  await menu.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(menu.locator('summary')).toBeFocused();
  await menu.locator('summary').click();
  await page.locator('h1').click();
  await expect(menu).not.toHaveAttribute('open', '');
  for (const { code } of languages) {
    await menu.locator('summary').click();
    await page.locator(`[data-language-option="${code}"]`).click();
    await expect(page).toHaveURL(
      `${baseURL}${localPath('/solar-in/nellore/', code)}#city-enquiry`,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', code);
  }
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const nojs = await context.newPage();
  await nojs.goto('/products/');
  await nojs.locator('[data-language-menu] summary').click();
  await nojs.locator('[data-language-option="te"]').click();
  await expect(nojs).toHaveURL(/\/te\/products\/$/);
  await expect(nojs.locator('h1')).toContainText(scripts.te);
  await context.close();
});

test('translated calculators and forms keep numbers, state and privacy behavior', async ({
  page,
  baseURL,
}) => {
  for (const { code } of translatedLanguages) {
    const requests: string[] = [];
    const listener = (request: import('@playwright/test').Request) => {
      if (
        request.method() !== 'GET' ||
        new URL(request.url()).origin !== baseURL
      )
        requests.push(request.url());
    };
    page.on('request', listener);
    await page.goto(`/${code}/`);
    await page.locator('#solar-bill').evaluate((element: HTMLInputElement) => {
      element.value = '5000';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('[data-result="kw"]')).toHaveText('6');
    await expect(page.locator('[data-subsidy-note]')).toContainText(
      scripts[code],
    );
    await page.locator('input[value="commercial"]').check();
    await expect(page.locator('[data-result="subsidy"]')).toContainText('40%');
    await expect(page.locator('[data-benefit-label]')).toContainText(
      scripts[code],
    );
    await page.locator('#visit-name').fill('Test Visitor');
    await page.locator('#visit-phone').fill('9876543210');
    await page.locator('#visit-location').fill('Nellore');
    await page.locator('#visit-plan').selectOption('3kw');
    await page.locator('.visit-form button').click();
    await expect(page.locator('[data-visit-status]')).toContainText(
      scripts[code],
    );
    await expect(page.locator('#visit-name')).toHaveValue('Test Visitor');
    expect(requests).toEqual([]);
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
    page.off('request', listener);
  }
});

for (const width of [320, 390, 768, 1024, 1025, 1100, 1280, 1281, 1440])
  test(`language layouts and menu fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const { code } of languages) {
      for (const path of ['/', '/products/', '/solar-in/visakhapatnam/']) {
        await page.goto(localPath(path, code));
        await page.evaluate(() => document.fonts.ready);
        await page.locator('[data-language-menu] summary').click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const panel = (await page.locator('.language-options').boundingBox())!;
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(width);
        const boxes = await page
          .locator('.header-inner > .wordmark, .header-actions')
          .evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right };
            }),
          );
        expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left);
      }
      if (width === 390) {
        // Audit the open popup itself, then the page with underlying links unobscured.
        const menuScan = await new AxeBuilder({ page })
          .include('[data-language-menu]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(menuScan.violations).toEqual([]);
        await page.locator('[data-language-menu] summary').click();
        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(scan.violations).toEqual([]);
      }
    }
  });

test('translation catalogues preserve numeric and city placeholders', async () => {
  expect(sourcePath('/404/')).toBe('/404.html');
  for (const { code } of languages) {
    const path = localPath('/404.html', code);
    const file = code === 'en' ? `dist${path}` : `dist${path}index.html`;
    const html = await readFile(file, 'utf8');
    expect(sourcePath(path)).toBe('/404.html');
    expect(html).not.toContain('rel="alternate"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('noindex, follow');
    expect(html).toContain('href="/404.html"');
  }
  for (const { code } of translatedLanguages) {
    const catalogue = JSON.parse(
      await readFile(`src/i18n/catalogues/${code}.json`, 'utf8'),
    ) as Record<string, string>;
    expect(Object.keys(catalogue).length).toBeGreaterThan(500);
    for (const [source, value] of Object.entries(catalogue)) {
      expect(value.trim(), `${code}: ${source}`).not.toBe('');
      expect(
        [...value.matchAll(/\{(city|\d+)\}/g)].map((m) => m[0]).sort(),
        `${code}: ${source}`,
      ).toEqual(
        [...source.matchAll(/\{(city|\d+)\}/g)].map((m) => m[0]).sort(),
      );
      expect(value, `${code}: ${source}`).not.toMatch(/900\d{3}|⟦|⟧/);
    }
  }
});
