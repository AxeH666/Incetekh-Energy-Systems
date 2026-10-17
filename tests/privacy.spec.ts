import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { languages, localPath } from '../src/i18n/languages';

test('all static artifacts leave analytics injection to Cloudflare', async () => {
  const files = (await readdir('dist', { recursive: true })).filter((file) =>
    file.endsWith('.html'),
  );
  expect(files).toHaveLength(145);
  for (const file of files) {
    const html = await readFile(join('dist', file), 'utf8');
    // CSP must allow the edge script, but the artifact must not include one.
    expect(html, file).not.toMatch(/<script\b[^>]*\bdata-cf-beacon/i);
    expect(html, file).not.toMatch(
      /<script\b[^>]*\bsrc=["'][^"']*cloudflareinsights\.com/i,
    );
  }
});

for (const width of [390, 1440]) {
  for (const { code } of languages) {
    test(`production privacy disclosure in ${code} at ${width}px needs no build token`, async ({
      page,
    }) => {
      const trackingRequests: string[] = [];
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (
          url.hostname.endsWith('cloudflareinsights.com') ||
          url.pathname.startsWith('/cdn-cgi/rum')
        ) {
          trackingRequests.push(url.pathname);
          await route.abort();
        } else await route.continue();
      });
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(localPath('/privacy/', code));
      expect(response?.status()).toBe(200);
      const analytics = page.locator(
        'section[aria-labelledby="analytics-heading"]',
      );
      await expect(analytics.locator('p')).toHaveCount(4);
      await expect(analytics).toContainText('Cloudflare Web Analytics');
      await expect(analytics).toContainText('incetekhenergy.com');
      await expect(analytics).toContainText('IP');
      await expect(analytics.locator('p').first()).toContainText('(EU)');
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      const retention = page.locator('[data-enquiry-retention]');
      const emailNotice = page.locator('[data-enquiry-email]');
      await expect(emailNotice).toBeVisible();
      await expect(emailNotice).toContainText('Resend');
      await expect(emailNotice).toContainText('Hostinger');
      await expect(retention).toBeVisible();
      await expect(retention).toContainText('12');
      await expect(retention).toContainText('90');
      await expect(
        page.locator('[data-staff-notification-privacy]'),
      ).toHaveCount(0);
      if (code === 'en') {
        await expect(emailNotice).toContainText(
          'If internal email notifications are enabled',
        );
        await expect(emailNotice).toContainText(
          'does not confirm email delivery',
        );
        await expect(retention).toContainText(
          'subject to legal retention requirements',
        );
      } else {
        await expect(emailNotice).not.toContainText(
          'If internal email notifications',
        );
        expect(await emailNotice.innerText()).toMatch(/[\u0900-\u0d7f]/);
        await expect(retention).not.toContainText('We normally keep');
        expect(await retention.innerText()).toMatch(/[\u0900-\u0d7f]/);
      }
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        /Cloudflare Web Analytics/,
      );
      if (code === 'en') {
        await expect(analytics).toContainText(
          'not to add the analytics script for visitors in the European Union (EU)',
        );
        await expect(analytics).toContainText('Where analytics is enabled');
        await expect(analytics).toContainText(
          'pages viewed, referring websites',
        );
        await expect(analytics).toContainText('no cookies or browser storage');
        await expect(analytics).toContainText(
          'does not track individuals across websites',
        );
        await expect(analytics).toContainText(
          'discards them without storing them',
        );
        await expect(analytics).toContainText(
          'separate from hosting and security',
        );
      } else {
        await expect(analytics).not.toContainText(
          'We use Cloudflare Web Analytics',
        );
        await expect(analytics).not.toContainText('Where analytics is enabled');
        const text = await analytics.innerText();
        expect(text).toMatch(/[\u0900-\u0d7f]/);
      }
      await expect(analytics.locator('a')).toHaveCount(2);
      await expect(analytics.locator('a').nth(0)).toHaveAttribute(
        'href',
        'https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/',
      );
      await expect(analytics.locator('a').nth(1)).toHaveAttribute(
        'href',
        'https://developers.cloudflare.com/speed/observatory/rum-beacon/',
      );
      await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
      expect(trackingRequests).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.locator('a[href="mailto:incetekhenergy@gmail.com"]').first(),
      ).toBeVisible();
      await expect(
        page.locator('a[href="tel:+919441259786"]').first(),
      ).toBeVisible();
    });
  }
}
