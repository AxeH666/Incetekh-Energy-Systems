import { test, expect } from '@playwright/test';

test('approved homepage journey keeps brands early and reviews before solar planning', async ({
  page,
}) => {
  await page.goto('/');
  const landmarks = [
    '.hero',
    '.manufacturers',
    '.project-story',
    '#reviews',
    '#solar-planner',
    '.efficiency-heading',
    '.free-services',
    '#site-visit',
    '.site-footer',
  ];
  let previousBottom = 0;
  for (const selector of landmarks) {
    const section = page.locator(selector);
    await expect(section).toHaveCount(1);
    const top = await section.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
    expect(top).toBeGreaterThanOrEqual(previousBottom);
    previousBottom = top;
  }
  await expect(page.locator('.manufacturers img')).toHaveCount(3);
  await expect(
    page.locator('.manufacturers').getByRole('link', { name: 'View products' }),
  ).toHaveAttribute('href', '/products/');
});

test('homepage presents all three free services with details and WhatsApp path', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Book a free site visit' }),
  ).toHaveAttribute('href', '#site-visit');
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
