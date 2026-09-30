import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  billSlider,
  estimateSolar,
  financialEstimate,
  usageProfile,
} from '../src/data/solar';

test('generation value matches the approved example and excludes commercial tax benefits', () => {
  const home = financialEstimate(3, 78000);
  expect(home.cost).toBe(210000);
  expect(home.cost - 78000).toBe(132000);
  expect(home.monthlySavings).toBe(2880);
  expect((home.payback * 12).toFixed(1)).toBe('45.8');
  expect(home.payback.toFixed(1)).toBe('3.8');
  expect(home.savings25).toBe(864000);
  const business = financialEstimate(3, 0);
  expect(business.monthlySavings).toBe(home.monthlySavings);
  expect(business.savings25).toBe(home.savings25);
  expect(business.payback).toBeGreaterThan(home.payback);
  const small = financialEstimate(1, 30000);
  expect(small.monthlySavings).toBe(960);
  expect(small.savings25).toBe(960 * 12 * 25);
  expect(usageProfile(1, true)).not.toContain('ACs');
  for (const [kw, acs] of [
    [3, 1],
    [4, 1],
    [5, 2],
    [6, 2],
    [7, 3],
    [9, 3],
    [10, 4],
  ]) {
    expect(usageProfile(kw, true)).toBe(
      `${acs} AC${acs === 1 ? '' : 's'} + all other household loads`,
    );
  }
});

test('generation and costs scale with whole-kW sizing across every bill step', () => {
  let previousKw = 0;
  for (let bill = 200; bill <= 50000; bill += 100) {
    const estimate = estimateSolar({
      mode: 'bill',
      amount: bill,
      tariff: billSlider.tariff,
      residential: true,
    })!;
    const finance = financialEstimate(estimate.kw, estimate.subsidy);
    expect(estimate.units).toBe(Math.round(bill / 8));
    expect(estimate.kw).toBe(Math.max(1, Math.ceil(bill / 8 / 120)));
    expect(estimate.kw).toBeGreaterThanOrEqual(previousKw);
    expect(estimate.roofSqft).toBe(estimate.kw * 100);
    expect(estimate.subsidy).toBeLessThanOrEqual(78000);
    expect(estimate.monthlyGeneration).toBe(estimate.kw * 120);
    expect(finance.monthlySavings).toBe(estimate.monthlyGeneration * 8);
    expect(finance.cost).toBe(estimate.kw * 70000);
    expect(finance.payback).toBeGreaterThan(0);
    expect(finance.savings25).toBeCloseTo(finance.monthlySavings * 300);
    previousKw = estimate.kw;
  }
});

test('six calculator results change with connection and retain simple controls', async ({
  page,
}) => {
  await page.goto('/');
  const calc = page.locator('[data-solar-calculator]');
  await expect(calc).toContainText('Recommended for you');
  await expect(calc.locator('dl > div')).toHaveCount(6);
  await expect(calc.locator('[data-profile]')).toHaveText(
    '1 AC + all other household loads',
  );
  await expect(
    page.locator('.size-options article > p:nth-of-type(2)'),
  ).toHaveText([
    '1 AC + all other household loads',
    '2 ACs + all other household loads',
    '3 ACs + all other household loads',
    '4 ACs + all other household loads',
  ]);
  await expect(calc.locator('[data-finance="monthlySavings"]')).toHaveText(
    '₹2,880',
  );
  await expect(calc.locator('[data-finance="payback"]')).toHaveText(
    '3.8 years',
  );
  await calc.getByText('Commercial', { exact: true }).click();
  await expect(calc.locator('[data-profile]')).toHaveText(
    'Shop / clinic / small office',
  );
  await expect(calc.locator('[data-benefit-label]')).toHaveText(
    'Potential tax benefit',
  );
  await expect(calc.locator('[data-finance="payback"]')).toHaveText(
    '6.1 years',
  );
  await expect(calc.locator('[data-subsidy-note]')).toContainText(
    'not a cash subsidy',
  );
  await calc.getByText('Residential', { exact: true }).click();
  await expect(calc.locator('[data-result="subsidy"]')).toHaveText(
    'Up to ₹78,000',
  );
  await expect(calc).toContainText(
    'all generation offsets usage or earns ₹8/unit credit',
  );
  await page
    .getByText('How the estimate and subsidy work', { exact: true })
    .click();
  await expect(page.locator('.planning-details')).toContainText(
    'not a guaranteed bill reduction',
  );
});

for (const width of [390, 1440]) {
  test(`resource pages and footer are accessible without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '/solar-guide/',
      '/financing/',
      '/terms/',
      '/contact/',
    ]) {
      await page.goto(route);
      await expect(page.locator('footer')).toContainText(
        '7/1195-5, Block No.7, Shop No.2,',
      );
      await expect(
        page.locator('footer a[href="mailto:support@incetekh.com"]'),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
    await page
      .getByRole('link', { name: 'File a complaint', exact: true })
      .click();
    await expect(page).toHaveURL(/\/contact\/#complaints$/);
    await expect(
      page.locator('#complaints a[href^="mailto:"]'),
    ).toHaveAttribute(
      'href',
      'mailto:support@incetekh.com?subject=Service%20complaint',
    );
  });
}
