import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/about/', '/services/', '/projects/']) {
  for (const width of [320, 768, 1440]) {
    test(`${path} is accessible and navigable at ${width}px`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.locator('nav [aria-current="page"]')).toHaveAttribute(
        'href',
        path,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const links = await page
        .locator('a[href^="/"]')
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute('href')!),
        );
      for (const link of new Set(links))
        expect((await request.get(link)).status()).toBe(200);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
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
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath('page.png'),
        fullPage: true,
      });
    });
  }
}

test('service warranty is qualified and supported services are findable', async ({
  page,
}) => {
  await page.goto('/services/');
  const warranty = page.getByRole('region', {
    name: '5-year warranty. Clear written terms.',
  });
  await expect(warranty).toContainText('subject to your written proposal');
  await expect(
    page.getByRole('heading', { name: 'Annual yield audits' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A free site visit.', exact: true }),
  ).toBeVisible();
});
