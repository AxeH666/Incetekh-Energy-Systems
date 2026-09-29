import { test, expect } from '@playwright/test';

test('homepage presents all three free services with details and WhatsApp path', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Book a free site visit on WhatsApp' }),
  ).toHaveAttribute('href', 'https://wa.me/919441259786');
  const offers = page.locator('.free-service-list>a');
  await expect(offers).toHaveCount(3);
  for (const offer of await offers.all())
    await expect(offer).toContainText('Free');
  await expect(offers.locator('h3')).toHaveText([
    'Site visits',
    'System performance checks',
    'Annual yield audits',
  ]);
  await expect(page.locator('.project-story')).toContainText('5-year warranty');
  await expect(page.locator('.project-story')).toContainText(
    'written proposal and applicable warranty terms',
  );
});
