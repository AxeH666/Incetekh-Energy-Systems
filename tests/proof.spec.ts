import { test, expect } from '@playwright/test';

for (const route of ['/reviews/']) {
  test(`temporary reviews remain explicitly unverified on ${route}`, async ({
    page,
    request,
  }) => {
    await page.goto(route);
    const section = page.locator('[data-review-status="illustrative"]');
    await expect(section).toContainText('not verified customer reviews');
    await expect(section).toContainText('do not identify the author');
    await expect(
      section.getByRole('heading', {
        name: 'Sample copy — not a verified review',
        exact: true,
      }),
    ).toHaveCount(3);
    await expect(
      section.locator('blockquote, cite, [itemtype*="Review"]'),
    ).toHaveCount(0);
    for (const img of await section.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('width', '800');
      await expect(img).toHaveAttribute('height', '800');
      await expect(img).toHaveAttribute('srcset', /400w.*800w/);
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
}
