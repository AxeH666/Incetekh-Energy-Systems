import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Enable the public widget in this response only. API and Turnstile transports
// are intercepted; this exercises the built module and CSP without cloud calls.
async function enableWidget(page: Page, path: string) {
  await page.route(`**${path}`, async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const html = (await response.text()).replace(
      'data-site-key=""',
      'data-site-key="synthetic-test-key"',
    );
    await route.fulfill({ response, body: html });
  });
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile = {
      render: (element, options) => { window.testChallenge = options; options.callback('synthetic-token'); return 'widget'; },
      reset: () => { window.testChallenge.callback('synthetic-new-token'); }
    };`,
    }),
  );
}
async function fillForm(page: Page) {
  await page.locator('#visit-name').fill('Synthetic Visitor');
  await page.locator('#visit-phone').fill('9876543210');
  await page.locator('#visit-location').fill('Synthetic location');
  await page.locator('#visit-plan').selectOption('5kw');
}
const messages = {
  pending: 'Sending your enquiry. Please wait.',
  received:
    'Your enquiry has been received. Our team will contact you to confirm availability. This is not a confirmed booking.',
  uncertain:
    'We could not confirm receipt. Your details are still on this page. Retry without changing them, or contact us on WhatsApp.',
  limited:
    'Too many attempts. Please wait a minute before trying again, or contact us on WhatsApp.',
  security: 'Please complete the security check and try again.',
};

for (const language of ['en', 'te', 'hi', 'ta', 'ml', 'kn']) {
  test(`${language}: pending, uncertain retry, receipt and edited enquiry use safe IDs`, async ({
    page,
  }) => {
    const path = language === 'en' ? '/' : `/${language}/`;
    const catalogue =
      language === 'en'
        ? {}
        : JSON.parse(
            await readFile(`src/i18n/catalogues/${language}.json`, 'utf8'),
          );
    const message = (key: keyof typeof messages) =>
      catalogue[messages[key]] ?? messages[key];
    await enableWidget(page, path);
    const sent: Record<string, string>[] = [];
    let complete: (() => void) | undefined;
    await page.route('**/api/site-visits', async (route) => {
      const input = route.request().postDataJSON();
      sent.push(input);
      if (sent.length === 1) {
        await new Promise<void>((resolve) => {
          complete = resolve;
        });
        return route.abort('failed');
      }
      return route.fulfill({
        status: sent.length === 2 ? 200 : 201,
        json: { code: 'received', id: input.id },
      });
    });
    await page.goto(path);
    await fillForm(page);
    const button = page.locator('.visit-form button');
    const status = page.locator('[data-visit-status]');
    await button.click();
    await expect(status).toHaveText(message('pending'));
    await expect(button).toBeDisabled();
    await expect(page.locator('#visit-name')).toBeDisabled();
    await expect.poll(() => Boolean(complete)).toBe(true);
    complete!();
    await expect(status).toHaveText(message('uncertain'));
    await expect(status).toBeFocused();
    await expect(page.locator('#visit-name')).toHaveValue('Synthetic Visitor');
    await button.click();
    await expect(status).toHaveText(message('received'));
    expect(sent[1].id).toBe(sent[0].id);
    expect(sent[0].language).toBe(language);
    await button.click();
    expect(sent).toHaveLength(2);
    await page.locator('#visit-location').fill('Changed synthetic location');
    await button.click();
    await expect(status).toHaveText(message('received'));
    expect(sent[2].id).not.toBe(sent[0].id);
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
    expect(page.url()).not.toContain('9876543210');
    await expect(
      page.locator('script[src*="challenges.cloudflare.com"]'),
    ).toHaveCount(1);
    await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('.visit-form')
      .screenshot({ path: `test-results/lead-${language}-mobile.png` });
  });
}

test('rate limit, expired challenge, invalid response and widget failure never show receipt', async ({
  page,
}) => {
  await enableWidget(page, '/');
  let code = 429;
  const tokens: string[] = [];
  await page.route('**/api/site-visits', (route) => {
    tokens.push(route.request().postDataJSON().token);
    return route.fulfill({
      status: code,
      json:
        code === 201
          ? { code: 'received', id: 'wrong-id' }
          : { code: 'rejected' },
    });
  });
  await page.goto('/');
  await fillForm(page);
  const button = page.locator('.visit-form button');
  const status = page.locator('[data-visit-status]');
  await button.click();
  await expect(status).toHaveText(messages.limited);
  await page.evaluate(() =>
    (
      window as unknown as { testChallenge: Record<string, () => void> }
    ).testChallenge['expired-callback'](),
  );
  code = 422;
  await button.click();
  await expect(status).toHaveText(messages.security);
  expect(tokens[1]).toBe('');
  code = 201;
  await button.click();
  await expect(status).toHaveText(messages.uncertain);
  await page.evaluate(() =>
    (
      window as unknown as { testChallenge: Record<string, () => void> }
    ).testChallenge['error-callback'](),
  );
  await expect(status).toContainText('security check could not finish');
  await expect(page.locator('#visit-name')).toHaveValue('Synthetic Visitor');
});

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
    'Online requests are currently unavailable.',
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

test('form cannot submit without JavaScript and offers manual contact', async ({
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
  await expect(form).toContainText(
    'Online requests need JavaScript and a security check.',
  );
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
