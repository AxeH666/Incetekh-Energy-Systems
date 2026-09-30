import { test, expect } from '@playwright/test';

test('visit form validates details and never sends, saves or falsely confirms a request', async ({
  page,
  baseURL,
}) => {
  await page.goto('/');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' || new URL(request.url()).origin !== baseURL)
      requests.push(request.url());
  });
  const form = page.getByRole('form', { name: 'Request a free site visit' });
  const submit = form.getByRole('button', { name: 'Request free site visit' });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(form.getByLabel('Full name')).toBeFocused();
  await form.getByLabel('Full name').fill('Test Visitor');
  await form.getByLabel('Phone number').fill('123');
  await form.getByLabel('Pincode / location').fill('Vijayawada');
  await form.getByLabel('Interested plan').selectOption('5kw');
  await submit.click();
  await expect(form.getByLabel('Phone number')).toBeFocused();
  await form.getByLabel('Phone number').fill('+91 9876543210');
  await form.getByLabel('Email address').fill('not-an-email');
  await submit.click();
  await expect(form.getByLabel('Email address')).toBeFocused();
  await form.getByLabel('Email address').fill('');
  await submit.click();
  await expect(form.getByRole('status')).toContainText(
    'Your request has not been sent.',
  );
  await expect(form.getByRole('status')).toBeFocused();
  await expect(form.getByLabel('Full name')).toHaveValue('Test Visitor');
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  expect(page.url()).not.toContain('Test');
  expect(page.url()).not.toContain('9876543210');
  await page.reload();
  await expect(form.getByRole('status')).toBeHidden();
});

test('homepage booking action reaches the form and expert contact stays on WhatsApp', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'Book a free site visit', exact: true })
    .click();
  await expect(page).toHaveURL(/#site-visit$/);
  await expect(page.locator('#visit-name')).toBeInViewport();
  await expect(
    page
      .locator('.site-visit')
      .getByRole('link', { name: 'Talk to an expert on WhatsApp' }),
  ).toHaveAttribute(
    'href',
    /https:\/\/wa\.me\/919441259786\?text=.*free%20site%20visit/,
  );
});

test('unconnected form cannot submit without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Request a free site visit' });
  await expect(form.getByRole('button')).toBeDisabled();
  await expect(form).toContainText('Online requests are not available yet.');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() || request.method() !== 'GET')
      requests.push(request.url());
  });
  await form.getByLabel('Full name').fill('Test Visitor');
  await form.getByLabel('Full name').press('Enter');
  expect(requests).toEqual([]);
  await context.close();
});
