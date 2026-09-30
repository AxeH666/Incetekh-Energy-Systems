import { test, expect } from '@playwright/test';
import { billSlider, centralSubsidy, estimateSolar } from '../src/data/solar';
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
    monthlyGeneration: 394,
    roofM2: 28,
    roofSqft: 300,
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
    estimateSolar({ mode: 'units', amount: 131, tariff: 8, residential: true })
      ?.kw,
  ).toBe(1);
  expect(
    estimateSolar({ mode: 'units', amount: 132, tariff: 8, residential: true })
      ?.kw,
  ).toBe(2);
  expect(
    estimateSolar({
      mode: 'units',
      amount: 12000,
      tariff: 8,
      residential: false,
    }),
  ).toMatchObject({ kw: 92, subsidy: 0 });
  for (const amount of [0, -1, NaN, Infinity, 12001])
    expect(
      estimateSolar({ mode: 'units', amount, tariff: 8, residential: true }),
    ).toBeNull();
  for (const tariff of [0, -1, NaN, Infinity, 31])
    expect(
      estimateSolar({ mode: 'bill', amount: 2400, tariff, residential: true }),
    ).toBeNull();
});

test('one bill slider updates instantly with keyboard and pointer, and links to the visit form', async ({
  page,
}) => {
  await page.goto('/');
  const calc = page.locator('[data-solar-calculator]');
  const slider = page.getByRole('slider', { name: 'Monthly electricity bill' });
  await expect(slider).toBeEnabled();
  await expect(
    calc.locator('select, input[type="number"], button'),
  ).toHaveCount(0);
  await expect(slider).toHaveValue('2500');
  await expect(calc.locator('[data-result="kw"]')).toHaveText('3');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('2600');
  await expect(slider).toHaveAttribute(
    'aria-valuetext',
    '2,600 rupees per month',
  );
  await slider.press('Home');
  await expect(calc.locator('[data-result="kw"]')).toHaveText('1');
  await expect(calc.locator('[data-result="subsidy"]')).toHaveText(
    'Up to \u20b930,000',
  );
  await slider.press('End');
  await expect(slider).toHaveValue('50000');
  await expect(calc.locator('[data-result="kw"]')).toHaveText('60');
  await expect(calc.locator('[data-result="subsidy"]')).toHaveText(
    'Up to \u20b978,000',
  );
  await calc.getByText('Commercial', { exact: true }).click();
  await expect(calc.getByRole('radio', { name: 'Commercial' })).toBeChecked();
  await expect(calc.locator('[data-result="subsidy"]')).toHaveText(
    '40% depreciation',
  );
  const box = (await slider.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const amount = Number(await slider.inputValue());
  expect(amount).toBeGreaterThan(20000);
  expect(amount).toBeLessThan(30000);
  await expect(calc.locator('[data-result="kw"]')).toHaveText(
    String(Math.ceil(((amount / billSlider.tariff) * 3) / 394)),
  );
  await calc
    .getByRole('link', { name: 'Free site visit', exact: true })
    .click();
  await expect(page).toHaveURL(/#site-visit$/);
  await expect(
    page.getByRole('heading', { name: 'Ready for a site visit?' }),
  ).toBeInViewport();
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
  await expect(
    page.getByRole('slider', { name: 'Monthly electricity bill' }),
  ).toBeDisabled();
  await expect(page.locator('noscript p')).toContainText('3 kW example');
  await expect(page.locator('noscript p')).toBeVisible();
  await expect(page.locator('.visit-link')).toHaveAttribute(
    'href',
    '#site-visit',
  );
  await context.close();
});
