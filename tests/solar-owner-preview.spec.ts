import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import AxeBuilder from '@axe-core/playwright';

test('private local preview is usable without external calls and rejects foreign access', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  let server: ChildProcess | undefined;
  const origin = 'http://127.0.0.1:4393';
  try {
    server = spawn(process.execPath, ['scripts/solar-owner-preview.mjs'], {
      env: { ...process.env, SOLAR_OWNER_PORT: '4393' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Private server failed to start')),
        15000,
      );
      server!.once('error', reject);
      server!.once('exit', () => reject(new Error('Private server exited')));
      server!.stdout!.on('data', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    const external: string[] = [];
    await page.route('https://**/*', (route) => {
      external.push(new URL(route.request().url()).origin);
      return route.abort();
    });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(origin + '/#solar-planner');
    await expect(page.locator('#owner-preview-notice')).toContainText(
      'simulated roof',
    );
    await expect(page.locator('[data-capacity-preview="5"]')).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .include('.size-options')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.locator('#solar-bill').fill('200');
    await page.locator('[data-capacity-preview="5"]').click();
    await expect(page.locator('#bill-summary-text')).toContainText(
      'Your selected system: 5 kW',
    );
    await page.locator('#open-map').click();
    await page
      .getByRole('button', { name: 'Select the simulated example roof' })
      .click();
    await page.locator('#assess-property').click();
    await expect(page.locator('#result-capacity')).toHaveText('3.2 kW');
    await expect(page.locator('#solar-map polygon')).toHaveCount(8);
    await page.locator('#before-solar').click();
    await expect(page.locator('#solar-map polygon')).toHaveCount(0);
    await page.locator('#before-solar').click();
    await expect(page.locator('#solar-map polygon')).toHaveCount(8);
    await expect(page.locator('#visit-plan')).toHaveValue('5kw');
    await page.screenshot({
      path: '.wrangler/solar-owner-private-mobile.png',
      fullPage: true,
    });
    expect(external).toEqual([]);
    expect(
      (await request.post(origin + '/api/site-visits', { data: {} })).status(),
    ).toBe(503);
    expect(
      (
        await request.get(origin + '/api/solar-preview-config', {
          headers: { Origin: 'https://foreign.example' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get(origin + '/api/solar-preview-config', {
          headers: { 'Sec-Fetch-Site': 'cross-site' },
        })
      ).status(),
    ).toBe(403);
    const foreignHost = await new Promise<number>((resolve) => {
      http.get(
        origin + '/api/solar-preview-config',
        { headers: { Host: 'foreign.example' } },
        (res) => {
          res.resume();
          resolve(res.statusCode!);
        },
      );
    });
    expect(foreignHost).toBe(403);
    expect(
      (await request.get(origin + '/%2e%2e%2fpackage.json')).status(),
    ).toBe(404);
  } finally {
    server?.kill();
  }
});
