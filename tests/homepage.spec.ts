import { test, expect } from '@playwright/test';

test('homepage presents confirmed offerings with qualified warranty and call path', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Arrange a free site visit' }),
  ).toHaveAttribute('href', 'tel:+919441259786');
  const care = page.getByRole('region', {
    name: 'From the first visit. Beyond installation.',
  });
  await expect(care).toContainText('System performance checks');
  await expect(care).toContainText('Annual yield audits');
  await expect(care).toContainText('5-year warranty');
  await expect(care).toContainText(
    'written proposal and applicable warranty terms',
  );
});
