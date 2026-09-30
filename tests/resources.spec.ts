import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  billSlider,
  estimateSolar,
  financialEstimate,
  usageProfile,
} from '../src/data/solar';

test('financial scenario caps offsets and keeps tax benefits out of returns', () => {
  const home = financialEstimate(3, 394, 78000);
  expect(home.cost).toBe(165000);
  expect(home.monthlySavings).toBe(2496);
  expect(home.payback.toFixed(1)).toBe('2.9');
  expect(home.savings25).toBe(748800);
  const business = financialEstimate(3, 394, 0);
  expect(business.monthlySavings).toBe(home.monthlySavings);
  expect(business.savings25).toBe(home.savings25);
  expect(business.payback).toBeGreaterThan(home.payback);
  const constrained = financialEstimate(1, 1000, 0);
  expect(constrained.monthlySavings).toBeCloseTo(832);
  expect(constrained.savings25).toBeCloseTo(832 * 12 * 25);
  expect(financialEstimate(1, 25, 30000).monthlySavings).toBeCloseTo(
    (25 * 2496) / 394,
  );
  expect(usageProfile(1, true)).not.toContain('ACs');
  expect(usageProfile(3, true)).toContain('2 ACs + 2 fans');
});

test('reference scales across every bill step without excess savings or subsidy', () => {
  let previousKw = 0;
  for (let bill = 200; bill <= 50000; bill += 100) {
    const estimate = estimateSolar({
      mode: 'bill',
      amount: bill,
      tariff: billSlider.tariff,
      residential: true,
    })!;
    const finance = financialEstimate(
      estimate.kw,
      bill / billSlider.tariff,
      estimate.subsidy,
    );
    expect(estimate.units).toBe(Math.round((bill * 394) / 2500));
    expect(estimate.kw).toBe(Math.max(1, Math.ceil((bill * 3) / 2500)));
    expect(estimate.kw).toBeGreaterThanOrEqual(previousKw);
    expect(estimate.roofSqft).toBe(estimate.kw * 100);
    expect(estimate.subsidy).toBeLessThanOrEqual(78000);
    expect(finance.monthlySavings).toBeCloseTo((bill * 2496) / 2500);
    expect(finance.monthlySavings).toBeLessThanOrEqual(bill);
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
  await expect(calc.locator('[data-profile]')).toContainText('2 ACs + 2 fans');
  await expect(calc.locator('[data-finance="monthlySavings"]')).toHaveText(
    '₹2,496',
  );
  await expect(calc.locator('[data-finance="payback"]')).toHaveText(
    '2.9 years',
  );
  await calc.getByText('Commercial', { exact: true }).click();
  await expect(calc.locator('[data-profile]')).toHaveText(
    'Shop / clinic / small office',
  );
  await expect(calc.locator('[data-benefit-label]')).toHaveText(
    'Potential tax benefit',
  );
  await expect(calc.locator('[data-finance="payback"]')).toHaveText(
    '5.5 years',
  );
  await expect(calc.locator('[data-subsidy-note]')).toContainText(
    'not a cash subsidy',
  );
  await calc.getByText('Residential', { exact: true }).click();
  await expect(calc.locator('[data-result="subsidy"]')).toHaveText(
    'Up to ₹78,000',
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
