import { test, expect } from '@playwright/test';
import { centralSubsidy, estimateSolar } from '../src/data/solar';
import { productGroups } from '../src/data/products';

test('central subsidy is incremental, capped and residential only', () => {
  for (const [kw, amount] of [
    [1, 30000],
    [1.5, 45000],
    [2, 60000],
    [2.5, 69000],
    [3, 78000],
    [10, 78000],
  ]) {
    expect(centralSubsidy(kw, true)).toBe(amount);
    expect(centralSubsidy(kw, false)).toBe(0);
  }
  for (const kw of [NaN, Infinity, -1, 0])
    expect(centralSubsidy(kw, true)).toBe(0);
});

test('bill and units produce consistent planning estimates with bounded inputs', () => {
  const fromBill = estimateSolar({
    mode: 'bill',
    amount: 2400,
    tariff: 8,
    residential: true,
  });
  expect(fromBill).toEqual({
    units: 300,
    kw: 3,
    monthlyGeneration: 360,
    roofM2: 30,
    roofSqft: 323,
    subsidy: 78000,
  });
  expect(
    estimateSolar({
      mode: 'units',
      amount: 300,
      tariff: NaN,
      residential: true,
    }),
  ).toEqual(fromBill);
  expect(
    estimateSolar({ mode: 'units', amount: 120, tariff: 8, residential: true })
      ?.kw,
  ).toBe(1);
  expect(
    estimateSolar({ mode: 'units', amount: 121, tariff: 8, residential: true })
      ?.kw,
  ).toBe(2);
  expect(
    estimateSolar({
      mode: 'units',
      amount: 12000,
      tariff: 8,
      residential: false,
    }),
  ).toMatchObject({ kw: 100, subsidy: 0 });
  for (const amount of [0, -1, NaN, Infinity, 12001])
    expect(
      estimateSolar({ mode: 'units', amount, tariff: 8, residential: true }),
    ).toBeNull();
  for (const tariff of [0, -1, NaN, Infinity, 31])
    expect(
      estimateSolar({ mode: 'bill', amount: 2400, tariff, residential: true }),
    ).toBeNull();
});

test('calculator changes units, subsidy and WhatsApp draft without network submission', async ({
  page,
  baseURL,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== baseURL) external.push(request.url());
  });
  await page.goto('/');
  const calc = page.locator('[data-solar-calculator]');
  await expect(page.getByLabel('Monthly bill')).toBeEnabled();
  await page.getByLabel('Calculate using').selectOption('units');
  await page.getByLabel('Monthly consumption').fill('600');
  await page.getByRole('button', { name: 'Calculate my solar size' }).click();
  await expect(calc.locator('[data-result="kw"]')).toHaveText('5');
  await expect(calc.locator('[data-result="roofM2"]')).toHaveText('50');
  await page.getByLabel('Connection type').selectOption('commercial');
  await expect(calc.locator('[data-result="subsidy"]')).toHaveText(
    'Not eligible',
  );
  const link = calc.getByRole('link', { name: /Talk to an expert/ });
  const draft = new URL((await link.getAttribute('href'))!);
  expect(draft.origin + draft.pathname).toBe('https://wa.me/919441259786');
  expect(draft.searchParams.get('text')).toContain(
    'Commercial connection; 600 units/month',
  );
  expect(draft.searchParams.get('text')).toContain('5 kW');
  await page.getByLabel('Monthly consumption').fill('');
  await expect(calc.locator('[data-solar-result]')).toBeHidden();
  await expect(calc.getByRole('alert')).toBeVisible();
  expect(
    new URL((await link.getAttribute('href'))!).searchParams.get('text'),
  ).not.toContain('5 kW');
  await page.getByLabel('Calculate using').selectOption('bill');
  await page.getByLabel('Assumed electricity rate').fill('8.25');
  await page.getByLabel('Monthly bill').fill('2400.50');
  await expect(calc.locator('[data-result="kw"]')).toHaveText('3');
  expect(
    new URL((await link.getAttribute('href'))!).searchParams.get('text'),
  ).toContain('8.25');
  expect(
    new URL((await link.getAttribute('href'))!).searchParams.get('text'),
  ).toContain('2,400.5');
  expect(external).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ body: 'WhatsApp destination intercepted' }),
  );
  await link.click();
  await expect(page).toHaveURL(/https:\/\/wa.me\/919441259786\?text=/);
});

test('system choices and product enquiries carry the selected context', async ({
  page,
}) => {
  await page.goto('/');
  const choices = page.locator('.size-options a');
  await expect(choices).toHaveCount(4);
  for (const [index, kw] of [3, 5, 7, 10].entries()) {
    expect(
      new URL(
        (await choices.nth(index).getAttribute('href'))!,
      ).searchParams.get('text'),
    ).toContain(`${kw} kW`);
  }
  await page.goto('/products/');
  for (const group of productGroups) {
    const section = page.locator(`#${group.id}`);
    await expect(section.locator('article')).toHaveCount(group.products.length);
    for (const product of group.products) {
      const link = section.getByRole('link', {
        name: `Enquire about ${product.name} on WhatsApp`,
      });
      const url = new URL((await link.getAttribute('href'))!);
      expect(url.origin + url.pathname).toBe('https://wa.me/919441259786');
      expect(url.searchParams.get('text')).toContain(
        `${product.name} ${group.title.toLowerCase()}`,
      );
    }
  }
  await expect(page.locator('#water-heaters')).toContainText('Vijayawada');
  await expect(page.locator('#water-heaters')).toContainText('Visakhapatnam');
});

test('calculator without JavaScript shows a labelled example and usable enquiry', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByLabel('Monthly bill')).toBeDisabled();
  await expect(page.locator('noscript p')).toContainText('3 kW example');
  await expect(page.locator('noscript p')).toBeVisible();
  await expect(page.locator('[data-calculator-enquiry] a')).toHaveAttribute(
    'href',
    /https:\/\/wa.me\/919441259786/,
  );
  await context.close();
});
