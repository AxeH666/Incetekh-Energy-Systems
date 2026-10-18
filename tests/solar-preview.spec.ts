import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { previewWorker } from './support/solar-preview-worker.mjs';
import { solarFixture } from './fixtures/solar.mjs';
import { normalizeSolar } from '../worker/solar';

test.describe('property selector with real Worker CSP and mocked providers', () => {
  test.describe.configure({ mode: 'serial' });
  let mf: ReturnType<typeof previewWorker>;
  test.beforeAll(() => {
    mf = previewWorker();
  });
  test.afterAll(async () => {
    await mf.dispose();
  });
  async function setup(
    page: import('@playwright/test').Page,
    enabled = true,
    bill: number | null = 2500,
  ) {
    if (bill !== null)
      await page.addInitScript((amount) => {
        sessionStorage.setItem(
          'incetekh.solar-preview.v1',
          JSON.stringify({
            version: 1,
            createdAt: Date.now(),
            bill: amount,
            residential: amount !== 50000,
            language: 'te',
          }),
        );
      }, bill);
    let securityLoads = 0;
    let maps = 0,
      assessments = 0;
    await page.route('**/solar-preview/', async (route) => {
      const response = await mf.dispatchFetch(
        'https://incetekhenergy.com/solar-preview/',
      );
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: (await response.text()).replace(
          'data-site-key=""',
          'data-site-key="synthetic-enquiry-widget"',
        ),
      });
    });
    await page.route('**/api/solar-preview-config', (route) =>
      route.fulfill({
        json: {
          enabled,
          mapsKey: 'synthetic-public-key',
          turnstileSiteKey: 'synthetic-widget',
        },
      }),
    );
    await page.route('https://**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('https://maps.googleapis.com/maps/api/js?')) {
        maps++;
        await route.fulfill({
          contentType: 'application/javascript',
          body: await readFile('tests/fixtures/property-maps-mock.js', 'utf8'),
        });
      } else if (
        url.startsWith('https://challenges.cloudflare.com/turnstile/')
      ) {
        securityLoads++;
        await route.fulfill({
          contentType: 'application/javascript',
          body: `window.syntheticWidgets={};window.turnstile={render:(el,options)=>{window.syntheticWidgets[options.action]=options;options.callback('synthetic-'+options.action);return options.action;},reset:(id)=>window.syntheticWidgets[id].callback('synthetic-'+id)};`,
        });
      } else {
        await route.abort();
        throw new Error('Unexpected external request: ' + new URL(url).origin);
      }
    });
    await page.route('**/api/solar-assessments', (route) => {
      assessments++;
      return route.fulfill({
        json: {
          ...normalizeSolar(solarFixture()),
          reference: '00000000-0000-4000-8000-000000000001',
          selectedLocation: { latitude: 15, longitude: 79 },
        },
      });
    });
    await page.goto('/solar-preview/');
    return {
      maps: () => maps,
      assessments: () => assessments,
      securityLoads: () => securityLoads,
    };
  }
  async function select(
    page: import('@playwright/test').Page,
    latitude = '15',
  ) {
    await page.getByLabel('Latitude', { exact: true }).fill(latitude);
    await page.getByLabel('Longitude', { exact: true }).fill('79');
    await page.getByRole('button', { name: 'Move selection' }).click();
  }
  test('disabled page makes no provider calls and has no nonexistent locale links', async ({
    page,
    request,
  }) => {
    const calls = await setup(page, false);
    await expect(
      page.getByRole('button', { name: 'Open property map' }),
    ).toBeHidden();
    expect(calls.maps()).toBe(0);
    expect(calls.assessments()).toBe(0);
    await expect(page.locator('link[rel="alternate"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
    const links = await page
      .locator('[data-language-option]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')!));
    for (const href of links) {
      expect(href).not.toContain('solar-preview');
      expect((await request.get(href)).status()).toBe(200);
    }
  });
  for (const width of [390, 1440])
    test(`requires both building confirmations and reuses map at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const calls = await setup(page);
      expect(calls.maps()).toBe(0);
      await page.getByRole('button', { name: 'Open property map' }).click();
      await expect(page.locator('#property-controls')).toBeVisible();
      await select(page);
      expect(calls.assessments()).toBe(0);
      await page
        .getByRole('button', { name: 'This is my building — assess roof' })
        .click();
      await expect(page.locator('#returned-building')).toBeVisible();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'This returned roof is correct' })
        .click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
      await expect(page.locator('#bill-summary-text')).toContainText(
        '3 kW bill-based target',
      );
      await expect(page.locator('#result-capacity')).toHaveText('3.2 kW');
      await expect(page.locator('#result-dc')).toHaveText('4,800 kWh DC/year');
      await expect(page.locator('#result-ac')).toHaveText('4,080 kWh AC/year');
      await expect(page.locator('#result-value')).toHaveText('₹2,720/month');
      await page
        .getByRole('button', { name: 'Show Before', exact: true })
        .click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Show With Solar', exact: true })
        .click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
      await page.locator('#roof-configuration').selectOption('4');
      await expect(page.locator('[data-mock-panel]')).toHaveCount(4);
      await expect(page.locator('#result-capacity')).toHaveText('1.6 kW');
      await expect(page.locator('#result-ac')).toHaveText('2,040 kWh AC/year');
      await expect(page.locator('#result-value')).toHaveText('₹1,360/month');
      expect(calls.maps()).toBe(1);
      expect(calls.assessments()).toBe(1);
      await page.screenshot({
        path: `.wrangler/solar-results-synthetic-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole('button', {
          name: 'Roof changed, unclear or panels misplaced',
        })
        .click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await expect(page.locator('#preview-status')).toContainText(
        'uncertain or changed roof',
      );
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  test('moving selection discards an in-flight assessment; editing coordinates invalidates confirmation', async ({
    page,
  }) => {
    await setup(page);
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await page.route('**/api/solar-assessments', async (route) => {
      await waiting;
      await route
        .fulfill({
          json: { ...normalizeSolar(solarFixture()), reference: 'old-request' },
        })
        .catch(() => {});
    });
    await page.getByRole('button', { name: 'Open property map' }).click();
    await select(page);
    await page
      .getByRole('button', { name: 'This is my building — assess roof' })
      .click();
    await expect(page.locator('#preview-status')).toContainText('Assessing');
    await select(page, '15.001');
    finish();
    await expect(page.locator('#returned-building')).toBeHidden();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await page.getByLabel('Latitude', { exact: true }).fill('15.002');
    await expect(
      page.getByRole('button', { name: 'This is my building — assess roof' }),
    ).toBeDisabled();
  });
  test('new Places selection immediately invalidates the old roof while details load', async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole('button', { name: 'Open property map' }).click();
    await select(page);
    await page
      .getByRole('button', { name: 'This is my building — assess roof' })
      .click();
    await expect(page.locator('#returned-building')).toBeVisible();
    await page.locator('synthetic-place-search').evaluate((element) => {
      let done!: () => void;
      const fields = new Promise<void>((resolve) => {
        done = resolve;
      });
      (window as unknown as { completePlace(): void }).completePlace = done;
      element.dispatchEvent(
        Object.assign(new Event('gmp-select'), {
          placePrediction: {
            toPlace: () => ({
              fetchFields: () => fields,
              location: { lat: () => 15.01, lng: () => 79.01 },
            }),
          },
        }),
      );
    });
    await expect(page.locator('#returned-building')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'This is my building — assess roof' }),
    ).toBeDisabled();
    await page.evaluate(() =>
      (window as unknown as { completePlace(): void }).completePlace(),
    );
    await expect(page.locator('#selection-label')).toContainText('15.010000');
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'This is my building — assess roof' }),
    ).toBeEnabled();
  });
  test('coverage/budget failures keep the manual visit path', async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole('button', { name: 'Open property map' }).click();
    await select(page);
    for (const status of ['no_coverage', 'budget_exhausted']) {
      await page.route('**/api/solar-assessments', (route) =>
        route.fulfill({ json: { status, data_available: false } }),
      );
      await page
        .getByRole('button', { name: 'This is my building — assess roof' })
        .click();
      await expect(page.locator('#preview-status')).toContainText(
        status === 'no_coverage'
          ? 'unavailable for this property'
          : 'usage limit',
      );
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await expect(
        page.getByRole('link', { name: 'Book a free site visit', exact: true }),
      ).toBeVisible();
    }
  });
  test('maximum commercial bill keeps its target when roof is limited', async ({
    page,
  }) => {
    await setup(page, true, 50000);
    await page.getByRole('button', { name: 'Open property map' }).click();
    await select(page);
    await page.locator('#assess-property').click();
    await page.locator('#accept-roof').click();
    await expect(page.locator('#bill-summary-text')).toContainText(
      'Commercial · 53 kW',
    );
    await expect(page.locator('#roof-limited')).toBeVisible();
    await expect(page.locator('#roof-limited')).toContainText(
      'Not enough rooftop space for the estimated system.',
    );
    await expect(page.locator('#result-capacity')).toHaveText('3.2 kW');
    await expect(page.locator('#back-calculator')).toHaveAttribute(
      'href',
      '/te/#solar-planner',
    );
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem('incetekh.solar-preview.v1'),
      ),
    ).not.toMatch(/latitude|longitude|roof|panels|energy|reference/);
    expect(page.url()).not.toMatch(/bill|50000|latitude/);
  });
  test('missing or expired calculator state prevents map loads', async ({
    page,
  }) => {
    const calls = await setup(page, true, null);
    await expect(page.locator('#preview-status')).toContainText(
      'missing or expired',
    );
    await expect(page.locator('#open-map')).toBeHidden();
    expect(calls.maps()).toBe(0);
    await page.evaluate(() =>
      sessionStorage.setItem(
        'incetekh.solar-preview.v1',
        JSON.stringify({
          version: 1,
          createdAt: 1,
          bill: 2500,
          residential: true,
          language: 'en',
        }),
      ),
    );
    await page.reload();
    await expect(page.locator('#open-map')).toBeHidden();
    await expect(page.locator('#preview-status')).toContainText(
      'missing or expired',
    );
    expect(calls.maps()).toBe(0);
  });
  test('calculator handoff, reload and return preserve exact bill/type/language', async ({
    page,
  }) => {
    const calls = await setup(page, true, null);
    await page.goto('/te/');
    const slider = page.locator('#solar-bill');
    await slider.fill('50000');
    await page.locator('input[value="commercial"]').check();
    await page.locator('[data-preview-link]').click();
    await expect(page).toHaveURL('/solar-preview/');
    await expect(page.locator('#bill-summary-text')).toContainText(
      '₹50,000/month · Commercial · 53 kW',
    );
    await page.reload();
    await expect(page.locator('#bill-summary-text')).toContainText('53 kW');
    await page.locator('#back-calculator').click();
    await expect(page).toHaveURL('/te/#solar-planner');
    await expect(page.locator('#solar-bill')).toHaveValue('50000');
    await expect(page.locator('input[value="commercial"]')).toBeChecked();
    expect(calls.maps()).toBe(0);
  });
  test('unavailable storage leaves calculator usable and does not navigate', async ({
    page,
  }) => {
    await setup(page, true, null);
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error('Blocked');
      };
    });
    await page.goto('/');
    await page.locator('[data-preview-link]').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-preview-handoff-status]')).toContainText(
      'temporary session storage',
    );
    await page.locator('#solar-bill').fill('3000');
    await expect(page.locator('[data-result="kw"]')).toHaveText('4');
  });
  test('consent readiness follows property changes during a pending enquiry', async ({
    page,
  }) => {
    await setup(page);
    let finish!: () => void;
    let waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await page.route('**/api/site-visits', async (route) => {
      const { id } = route.request().postDataJSON();
      await waiting;
      await route.fulfill({ status: 201, json: { code: 'received', id } });
    });
    await page.locator('#open-map').click();
    await page.locator('#visit-name').fill('Synthetic pending visitor');
    await page.locator('#visit-phone').fill('9876543210');
    await page.locator('#visit-location').fill('Customer-entered location');
    const consent = page.locator('#preview-context-consent');
    const form = page.locator('[data-site-visit-form]');
    await form.locator('button[type="submit"]').click();
    await expect(form).toHaveAttribute('aria-busy', 'true');
    await select(page);
    await expect(consent).toBeDisabled();
    finish();
    await expect(form).not.toHaveAttribute('aria-busy', 'true');
    await expect(consent).toBeEnabled();
    await consent.check();
    waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await form.locator('button[type="submit"]').click();
    await expect(form).toHaveAttribute('aria-busy', 'true');
    await page.getByLabel('Latitude', { exact: true }).fill('15.1');
    await expect(consent).toBeDisabled();
    finish();
    await expect(form).not.toHaveAttribute('aria-busy', 'true');
    await expect(consent).toBeDisabled();
    await expect(consent).not.toBeChecked();
  });
  test('optional enquiry context preserves language, safe plan, consent and retry identity', async ({
    page,
  }) => {
    const calls = await setup(page, true, 3000);
    const submissions: Record<string, any>[] = [];
    await page.route('**/api/site-visits', async (route) => {
      const data = route.request().postDataJSON();
      submissions.push(data);
      if (submissions.length === 1) return route.abort();
      return route.fulfill({
        status: 201,
        json: { code: 'received', id: data.id },
      });
    });
    await expect(page.locator('#visit-plan')).toHaveValue('advice');
    await expect(page.locator('#preview-context-consent')).toBeDisabled();
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await page.locator('#accept-roof').click();
    await page.locator('#preview-visit').click();
    await page.locator('#visit-name').fill('Synthetic Visitor');
    await page.locator('#visit-phone').fill('9876543210');
    await page
      .locator('#visit-location')
      .fill('Customer-entered test location');
    await page.locator('#preview-context-consent').check();
    await page.locator('#preview-preferred-contact').selectOption('email');
    await page.locator('[data-site-visit-form] button[type="submit"]').click();
    await expect(page.locator('[data-visit-status]')).toContainText(
      'enter your email',
    );
    expect(submissions).toHaveLength(0);
    await page.locator('#preview-preferred-contact').selectOption('phone');
    await page.locator('[data-site-visit-form] button[type="submit"]').click();
    await expect(page.locator('[data-visit-status]')).toContainText(
      'could not confirm receipt',
    );
    await page.locator('[data-site-visit-form] button[type="submit"]').click();
    await expect(page.locator('[data-visit-status]')).toContainText(
      'enquiry has been received',
    );
    expect(submissions).toHaveLength(2);
    expect(submissions[0].id).toBe(submissions[1].id);
    expect(submissions[0]).toMatchObject({
      language: 'te',
      plan: 'advice',
      token: 'synthetic-site_visit',
      location: 'Customer-entered test location',
      previewContext: {
        bill: 3000,
        targetKw: 4,
        consent: true,
        preferredContact: 'phone',
        latitude: 15,
        longitude: 79,
      },
    });
    expect(Object.keys(submissions[0].previewContext).sort()).toEqual([
      'bill',
      'calculatorVersion',
      'consent',
      'latitude',
      'longitude',
      'preferredContact',
      'reference',
      'residential',
      'targetKw',
      'version',
    ]);
    await page.locator('#preview-context-consent').uncheck();
    await page.locator('[data-site-visit-form] button[type="submit"]').click();
    await expect.poll(() => submissions.length).toBe(3);
    expect(submissions[2]).not.toHaveProperty('previewContext');
    expect(submissions[2].id).not.toBe(submissions[0].id);
    expect(calls.securityLoads()).toBe(1);
    expect(calls.maps()).toBe(1);
    expect(calls.assessments()).toBe(1);
  });
});
