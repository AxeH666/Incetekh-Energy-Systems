import { test, expect } from '@playwright/test';

test('homepage separates brands and products before the project story and solar planning', async ({
  page,
}) => {
  await page.goto('/');
  const landmarks = [
    '.hero',
    '.manufacturers',
    '.products-overview',
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
    page
      .locator('.products-overview')
      .getByRole('link', { name: 'View all products' }),
  ).toHaveAttribute('href', '/products/');
  await expect(page.locator('.manufacturers + .products-overview')).toHaveCount(
    1,
  );
  await expect(page.locator('.product-categories h3')).toHaveText([
    'Solar panels',
    'Solar inverters',
    'Solar water heaters',
  ]);
  expect(
    await page
      .locator('.product-categories a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual([
    '/products/#panels',
    '/products/#inverters',
    '/products/#water-heaters',
  ]);
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
