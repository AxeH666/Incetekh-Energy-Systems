import { test, expect } from '@playwright/test';
import { languages, localPath } from '../src/i18n/languages';

for (const width of [390, 1440]) {
  test(`vendor logos and both contacts work across languages at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const { code } of languages) {
      await page.goto(localPath('/', code));
      const section = page.locator('.approved-vendors');
      await section.scrollIntoViewIfNeeded();
      await expect(section.locator('img')).toHaveCount(4);
      for (const name of ['NREDCAP', 'IOCL', 'BPCL', 'HPCL']) {
        const logo = section.getByRole('img', { name, exact: true });
        await expect(logo).toBeVisible();
        await expect
          .poll(() =>
            logo.evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      // Organization schema is published on the root English homepage.
      if (code === 'en') {
        const schema = JSON.parse(
          (await page
            .locator('script[type="application/ld+json"]')
            .textContent())!,
        );
        expect(schema['@graph'][0].telephone).toEqual([
          '+919440168111',
          '+919441259786',
        ]);
      }
      await page.goto(localPath('/contact/', code));
      await expect(page.locator('.contact-number')).toHaveAttribute(
        'href',
        'tel:+919440168111',
      );
      await expect(page.locator('.contact-number')).toHaveText('94401 68111');
      await expect(page.locator('.contact-secondary')).toHaveAttribute(
        'href',
        'tel:+919441259786',
      );
      for (const number of ['+919440168111', '+919441259786'])
        await expect(
          page.locator(`footer a[href="tel:${number}"]`),
        ).toBeVisible();
      for (const href of await page
        .locator('a[href^="https://wa.me/"]')
        .evaluateAll((links) =>
          links.map((link) => link.getAttribute('href')!),
        )) {
        const url = new URL(href);
        expect(url.pathname).toBe('/919441259786');
        expect(url.searchParams.get('text')?.trim()).toBeTruthy();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
