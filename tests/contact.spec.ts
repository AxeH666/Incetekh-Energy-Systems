import { test, expect } from '@playwright/test';

test('contact offers a real call path and keyboard-operable answers', async ({
  page,
}) => {
  await page.goto('/contact/');
  const call = page.getByRole('link', {
    name: 'Call +91 94412 59786',
    exact: true,
  });
  await expect(call).toHaveAttribute('href', 'tel:+919441259786');
  await expect(page.locator('form, a[href^="mailto:"]')).toHaveCount(0);
  const whatsapp = page
    .locator('.call-panel')
    .getByRole('link', { name: 'Chat on WhatsApp' });
  await expect(whatsapp).toHaveAttribute('href', 'https://wa.me/919441259786');
  // Intercept the destination: prove navigation without messaging the business.
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'WhatsApp destination' }),
  );
  await whatsapp.click();
  await expect(page).toHaveURL('https://wa.me/919441259786');
  await page.goBack();
  const summary = page
    .locator('summary')
    .filter({ hasText: 'What does the 5-year warranty cover?' });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details[open]')).toContainText(
    'subject to your written proposal',
  );
  await page.keyboard.press('Enter');
  await expect(page.locator('details[open]')).toHaveCount(0);
});
