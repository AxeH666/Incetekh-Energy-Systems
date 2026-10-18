import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { previewWorker } from './support/solar-preview-worker.mjs';
import { gridRoof } from './fixtures/grouped-roof';
import { solarFixture } from './fixtures/solar.mjs';
import { normalizeSolar } from '../worker/solar';
import AxeBuilder from '@axe-core/playwright';
import { rasterFixture } from './fixtures/solar-raster';

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
    await page.locator('synthetic-place-search').evaluate((element, lat) => {
      element.dispatchEvent(
        Object.assign(new Event('gmp-select'), {
          placePrediction: {
            toPlace: () => ({
              location: { lat: () => Number(lat), lng: () => 79 },
              fetchFields: async () => {},
            }),
          },
        }),
      );
    }, latitude);
    await expect(page.locator('#assess-property')).toBeEnabled();
  }
  test('disabled page makes no provider calls and has no nonexistent locale links', async ({
    page,
    request,
  }) => {
    const calls = await setup(page, false);
    await expect(
      page.getByRole('button', { name: 'Enter your address' }),
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
  for (const mode of [
    'matched',
    'off-roof',
    'unknown-projection',
    'shifted-tiepoint',
    'matrix',
  ] as const)
    test(`matched GeoTIFF imagery ${mode} uses no external raster downloads`, async ({
      page,
    }) => {
      await setup(page);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/solar-assessments', (route) =>
        route.fulfill({
          json: rasterFixture(
            mode !== 'off-roof',
            mode === 'unknown-projection' ? 9999 : 32644,
            mode === 'shifted-tiepoint',
            mode === 'matrix',
          ),
        }),
      );
      await page.getByRole('button', { name: 'Enter your address' }).click();
      await page
        .getByRole('textbox', { name: 'Enter your full address' })
        .fill('15 Example Street');
      await page
        .getByRole('button', {
          name: '15 Example Street, Proddatur (test address)',
        })
        .click();
      await page
        .getByRole('button', { name: 'Confirm roof & preview' })
        .click();
      if (mode === 'matched' || mode === 'matrix') {
        await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
        await expect(page.locator('#solar-source')).toContainText(
          'Roof imagery: 2021-03-02',
        );
        const colors = await page
          .locator('[data-mock-roof-image]')
          .evaluate(async (node) => {
            const url = (node as HTMLElement).dataset.mockRoofImage!;
            const bitmap = await createImageBitmap(
              await (await fetch(url)).blob(),
            );
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            return [0.25, 0.75].map((p) =>
              Array.from(
                ctx.getImageData(
                  Math.floor(canvas.width * p),
                  Math.floor(canvas.height * p),
                  1,
                  1,
                ).data,
              ),
            );
          });
        expect(colors).toEqual([
          [220, 220, 80, 255],
          [20, 20, 80, 255],
        ]);
        await page
          .getByRole('button', { name: 'Show Before', exact: true })
          .click();
        await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
        await page
          .getByRole('button', { name: 'Show With Solar', exact: true })
          .click();
        await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
      } else {
        await expect(page.locator('#preview-status')).toContainText(
          mode === 'off-roof'
            ? 'layout is unusable'
            : 'assessment could not finish',
        );
        await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
        await expect(page.locator('#roof-results')).toBeHidden();
      }
      expect(errors).toEqual([]);
    });
  for (const width of [390, 1440])
    test(`address lookup and one confirmation reuse the map at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const calls = await setup(page);
      expect(calls.maps()).toBe(0);
      await page.getByRole('button', { name: 'Enter your address' }).click();
      await expect(page.locator('#property-controls')).toBeVisible();
      await page
        .getByRole('textbox', { name: 'Enter your full address' })
        .fill('15 Example Street, Proddatur');
      await page
        .getByRole('button', {
          name: '15 Example Street, Proddatur (test address)',
        })
        .click();
      expect(calls.assessments()).toBe(0);
      await page
        .getByRole('button', { name: 'Confirm roof & preview' })
        .click();
      await expect(page.locator('#returned-building')).toBeHidden();
      await expect(page.locator('#assess-property')).toBeDisabled();
      await expect(page.getByLabel('Latitude', { exact: true })).toHaveCount(0);
      await page.locator('#roof-results summary').click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
      await expect(page.locator('#bill-summary-text')).toContainText(
        '3 kW bill-based target',
      );
      await expect(page.locator('#result-capacity')).toHaveText('3.2 kW');
      await expect(page.locator('#module-unavailable')).toBeVisible();
      await expect(page.locator('#module-unavailable')).toContainText(
        'not a Waaree installation layout',
      );
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
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(calls.maps()).toBe(1);
      expect(calls.assessments()).toBe(1);
      await page.screenshot({
        path: `.wrangler/solar-results-synthetic-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole('button', {
          name: "Panels don't match my roof",
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
  test('moving selection discards an in-flight assessment; editing an address invalidates confirmation', async ({
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
    await page.getByRole('button', { name: 'Enter your address' }).click();
    await select(page);
    await page.getByRole('button', { name: 'Confirm roof & preview' }).click();
    await expect(page.locator('#preview-status')).toContainText('Assessing');
    await select(page, '15.001');
    finish();
    await expect(page.locator('#returned-building')).toBeHidden();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await page.locator('synthetic-place-search').dispatchEvent('input');
    await expect(page.locator('#preview-status')).toHaveText(
      'Choose an address suggestion to locate your roof.',
    );
    await expect(
      page.getByRole('button', { name: 'Confirm roof & preview' }),
    ).toBeDisabled();
  });
  for (const width of [390, 1440])
    test(`assessment progress and failure stay beside confirmation at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await setup(page);
      let finish!: () => void;
      const waiting = new Promise<void>((resolve) => {
        finish = resolve;
      });
      await page.route('**/api/solar-assessments', async (route) => {
        await waiting;
        await route.fulfill({
          json: { status: 'unusable_geometry', data_available: false },
        });
      });
      await page.locator('#open-map').click();
      await select(page);
      const button = page.locator('#assess-property');
      await button.click();
      await expect(button).toHaveText('Preparing your preview…');
      await expect(button).toHaveAttribute('aria-busy', 'true');
      await expect(button).toBeDisabled();
      const status = page.locator('#preview-status');
      await expect(status).toContainText('Assessing');
      expect(
        await status.evaluate((node) => node.previousElementSibling?.id),
      ).toBe('assess-property');
      finish();
      await expect(status).toContainText('cannot support a reliable layout');
      await expect(status).toBeInViewport();
      await expect(button).toHaveText('Confirm roof & preview');
      await expect(button).toHaveAttribute('aria-busy', 'false');
      await expect(button).toBeEnabled();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    });
  test('map zoom clicks preserve a loading or completed preview without repeating verification', async ({
    page,
  }) => {
    await setup(page);
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let attempts = 0;
    await page.route('**/api/solar-assessments', async (route) => {
      attempts++;
      await waiting;
      await route.fulfill({
        json: {
          ...normalizeSolar(solarFixture()),
          reference: 'map-interaction',
        },
      });
    });
    await page.locator('#open-map').click();
    await page.evaluate(() => {
      const state = window as unknown as { securityResets: number };
      state.securityResets = 0;
      const reset = window.turnstile!.reset;
      window.turnstile!.reset = (id: string) => {
        state.securityResets++;
        reset(id);
      };
    });
    const mapClick = () =>
      page.evaluate(() => {
        const state = window as unknown as {
          syntheticMapClick(event: {
            latLng: { lat(): number; lng(): number };
          }): void;
        };
        state.syntheticMapClick({ latLng: { lat: () => 15, lng: () => 79 } });
      });
    const resets = () =>
      page.evaluate(
        () => (window as unknown as { securityResets: number }).securityResets,
      );
    await select(page);
    await mapClick();
    await mapClick();
    expect(await resets()).toBe(0);
    await page.evaluate(() => {
      const state = window as unknown as {
        syntheticWidgets: Record<
          string,
          Record<string, (...args: string[]) => void>
        >;
      };
      state.syntheticWidgets.solar_assessment['expired-callback']();
    });
    await expect(page.locator('#assess-property')).toBeDisabled();
    await expect(page.locator('#preview-status')).toContainText(
      'security check expired',
    );
    await page.evaluate(() => {
      const state = window as unknown as {
        syntheticWidgets: Record<string, { callback(token: string): void }>;
      };
      state.syntheticWidgets.solar_assessment.callback('synthetic-renewed');
    });
    await page.locator('#assess-property').click();
    await expect(page.locator('#assess-property')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await mapClick();
    await mapClick();
    await expect(page.locator('#preview-status')).toContainText('Assessing');
    expect(await resets()).toBe(0);
    await page.evaluate(() => {
      const state = window as unknown as {
        syntheticWidgets: Record<string, Record<string, () => void>>;
      };
      state.syntheticWidgets.solar_assessment['error-callback']();
      state.syntheticWidgets.solar_assessment['expired-callback']();
    });
    await expect(page.locator('#preview-status')).toContainText('Assessing');
    finish();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
    await expect(page.locator('#solar-security')).toHaveAttribute('hidden', '');
    await page.evaluate(() => {
      const state = window as unknown as {
        syntheticWidgets: Record<string, Record<string, () => void>>;
      };
      state.syntheticWidgets.solar_assessment['error-callback']();
      state.syntheticWidgets.solar_assessment['expired-callback']();
    });
    await expect(page.locator('#preview-status')).toContainText(
      'Preliminary rooftop concept',
    );
    await mapClick();
    await mapClick();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
    await expect(page.locator('#assess-property')).toBeHidden();
    expect(await resets()).toBe(0);
    expect(attempts).toBe(1);
    // Explicitly rejecting the roof still permits a new selection and challenge.
    await page.locator('#unusable-roof').click();
    await mapClick();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await expect(page.locator('#solar-security')).not.toHaveAttribute('hidden');
    await expect(page.locator('#assess-property')).toBeEnabled();
    expect(await resets()).toBe(1);
  });
  test('new Places selection immediately invalidates the old roof while details load', async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole('button', { name: 'Enter your address' }).click();
    await select(page);
    await page.getByRole('button', { name: 'Confirm roof & preview' }).click();
    await expect(page.locator('#roof-results')).toBeVisible();
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
      page.getByRole('button', { name: 'Confirm roof & preview' }),
    ).toBeDisabled();
    await page.evaluate(() =>
      (window as unknown as { completePlace(): void }).completePlace(),
    );
    await expect(page.locator('#selection-label')).toContainText(
      'Is the pin on your roof?',
    );
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Confirm roof & preview' }),
    ).toBeEnabled();
  });
  test('a different returned building shows no panels and a successful preview cannot be requested twice', async ({
    page,
  }) => {
    const calls = await setup(page);
    await page.locator('#open-map').click();
    await select(page, '15.01');
    await page.locator('#assess-property').click();
    await expect(page.locator('#returned-building')).toBeVisible();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await select(page);
    await page.locator('#assess-property').click();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
    await expect(page.locator('#assess-property')).toBeDisabled();
    await page.locator('#assess-property').dispatchEvent('click');
    expect(calls.assessments()).toBe(2);
    await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
  });
  test('an assessment finishing after session expiry cannot restore consent or panels', async ({
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
          json: {
            ...normalizeSolar(solarFixture()),
            reference: 'expired-request',
          },
        })
        .catch(() => {});
    });
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await expect(page.locator('#preview-status')).toContainText('Assessing');
    await page.clock.setFixedTime(new Date(Date.now() + 31 * 60 * 1000));
    finish();
    await expect(page.locator('#preview-status')).toContainText(
      'missing or expired',
    );
    await expect(page.locator('#preview-status')).toBeVisible();
    await expect(page.locator('#preview-context-consent')).toBeDisabled();
    await expect(page.locator('[data-site-visit-form]')).not.toHaveAttribute(
      'data-preview-context',
    );
    await expect(page.locator('#assess-property')).toBeDisabled();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
  });
  test('grouped draft hides unrelated generation estimates and closer view does not request another assessment', async ({
    page,
  }) => {
    await setup(page);
    let assessments = 0;
    await page.route('**/api/solar-assessments', (route) => {
      assessments++;
      return route.fulfill({
        json: {
          status: 'available',
          data_available: true,
          roof: gridRoof(),
          reference: 'group-test',
        },
      });
    });
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await expect(page.locator('#grouped-layout-note')).toBeVisible();
    await expect(page.locator('#module-assumptions')).toContainText(
      'Energy and savings are not shown',
    );
    await expect(page.locator('#roof-results')).toBeHidden();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(5);
    await page
      .getByRole('button', { name: 'Closer view', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Whole roof', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Compare Google model', exact: true })
      .click();
    await expect(page.locator('#roof-results')).toBeVisible();
    await expect(page.locator('#result-dc')).toContainText('4,800');
    await page
      .getByRole('button', { name: 'Try grouped layout', exact: true })
      .click();
    await expect(page.locator('#roof-results')).toBeHidden();
    expect(assessments).toBe(1);
    await page
      .getByRole('textbox', { name: 'Enter your full address' })
      .fill('Changed address');
    await expect(page.locator('#grouped-layout-note')).toBeHidden();
    await expect(page.locator('#roof-controls')).toBeHidden();
  });
  test('matching roof imagery stays under toggled panels and clears on a changed selection', async ({
    page,
  }) => {
    await setup(page);
    let imageRequests = 0;
    await page.route('**/api/solar-imagery/test-roof.png', (route) => {
      imageRequests++;
      return route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    });
    await page.route('**/api/solar-assessments', (route) =>
      route.fulfill({
        json: {
          ...normalizeSolar(solarFixture()),
          reference: 'image-test',
          roofImage: {
            url: '/api/solar-imagery/test-roof.png',
            imageryDate: '2021-03-02',
            bounds: {
              south: 14.998,
              west: 78.998,
              north: 15.002,
              east: 79.002,
            },
          },
        },
      }),
    );
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(8);
    await expect(page.locator('[data-mock-roof-image]')).toHaveCount(1);
    await expect(page.locator('#solar-source')).toContainText(
      'Includes solar data from Google',
    );
    await expect(page.locator('#solar-source')).toContainText('2021-03-02');
    const imageUrl = await page
      .locator('[data-mock-roof-image]')
      .getAttribute('data-mock-roof-image');
    expect(imageUrl).toMatch(/^blob:/);
    expect(imageRequests).toBe(1);
    await page.locator('#before-solar').click();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await expect(page.locator('[data-mock-roof-image]')).toHaveCount(1);
    await select(page, '15.0001');
    await expect(page.locator('[data-mock-roof-image]')).toHaveCount(0);
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url!);
          return true;
        } catch {
          return false;
        }
      }, imageUrl),
    ).toBe(false);
  });
  test('changing address during image loading cannot restore stale panels', async ({
    page,
  }) => {
    await setup(page);
    let release!: () => void;
    let requested!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route('**/api/solar-imagery/pending.png', async (route) => {
      requested();
      await pending;
      await route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    });
    await page.route('**/api/solar-assessments', (route) =>
      route.fulfill({
        json: {
          ...normalizeSolar(solarFixture()),
          reference: 'pending-image',
          roofImage: {
            url: '/api/solar-imagery/pending.png',
            imageryDate: '2021-03-02',
            bounds: {
              south: 14.998,
              west: 78.998,
              north: 15.002,
              east: 79.002,
            },
          },
        },
      }),
    );
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await started;
    await page
      .getByRole('textbox', { name: 'Enter your full address' })
      .fill('Another address');
    release();
    await expect(page.locator('#assess-property')).toBeDisabled();
    await expect(page.locator('#roof-results')).toBeHidden();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await expect(page.locator('[data-mock-roof-image]')).toHaveCount(0);
  });
  test('mismatched or unavailable roof imagery cannot leave panels visible', async ({
    page,
  }) => {
    await setup(page);
    await page.locator('#open-map').click();
    for (const imageryDate of ['2020-01-01', '2021-03-02']) {
      await page.route('**/api/solar-assessments', (route) =>
        route.fulfill({
          json: {
            ...normalizeSolar(solarFixture()),
            reference: 'bad-image',
            roofImage: {
              url: '/api/solar-imagery/unavailable.png',
              imageryDate,
              bounds: {
                south: 14.998,
                west: 78.998,
                north: 15.002,
                east: 79.002,
              },
            },
          },
        }),
      );
      await page.route('**/api/solar-imagery/unavailable.png', (route) =>
        route.fulfill({ status: 404, body: '' }),
      );
      await select(page);
      await page.locator('#assess-property').click();
      await expect(page.locator('#preview-status')).toContainText(
        'could not finish',
      );
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await expect(page.locator('[data-mock-roof-image]')).toHaveCount(0);
    }
  });
  test('coverage/budget failures keep the manual visit path', async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole('button', { name: 'Enter your address' }).click();
    await select(page);
    for (const status of ['no_coverage', 'budget_exhausted']) {
      await page.route('**/api/solar-assessments', (route) =>
        route.fulfill({ json: { status, data_available: false } }),
      );
      await page
        .getByRole('button', { name: 'Confirm roof & preview' })
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
    await page.getByRole('button', { name: 'Enter your address' }).click();
    await select(page);
    await page.locator('#assess-property').click();
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
  test('capacity-card preview keeps chosen size distinct from bill recommendation', async ({
    page,
  }) => {
    await setup(page, true, null);
    await page.goto('/');
    await page.locator('#solar-bill').fill('200');
    await page.locator('[data-capacity-preview="5"]').click();
    await expect(page).toHaveURL('/solar-preview/');
    await expect(page.locator('#bill-summary-text')).toContainText(
      '1 kW bill-based target',
    );
    await expect(page.locator('#bill-summary-text')).toContainText(
      'Your selected system: 5 kW',
    );
    await expect(page.locator('#visit-plan')).toHaveValue('5kw');
    await page.reload();
    await expect(page.locator('#bill-summary-text')).toContainText(
      'Your selected system: 5 kW',
    );
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await expect(page.locator('#result-capacity')).toHaveText('3.2 kW');
    await expect(page.locator('#roof-limited')).toBeVisible();
    await expect(page.locator('#roof-comparison')).toContainText(
      'Your selected system: 5 kW',
    );
    await page.locator('#back-calculator').click();
    await expect(page.locator('#solar-bill')).toHaveValue('200');
    await page.locator('[data-preview-link]').click();
    await expect(page.locator('#bill-summary-text')).not.toContainText(
      'Your selected system',
    );
  });
  test('public-disabled entry hides every preview button and explains direct links', async ({
    page,
  }) => {
    await setup(page, false, null);
    await expect(page.locator('#preview-status')).toContainText(
      'not publicly enabled',
    );
    await page.goto('/');
    await expect(page.locator('[data-preview-entry]:visible')).toHaveCount(0);
    await expect(page.locator('#solar-bill')).toBeEnabled();
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
    await expect(
      page.locator('[data-solar-calculator] [data-preview-handoff-status]'),
    ).toContainText('temporary session storage');
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
    await page.locator('#preview-visit').click();
    await page.locator('#visit-name').fill('Synthetic pending visitor');
    await page.locator('#visit-phone').fill('9876543210');
    await page.locator('#visit-location').fill('Customer-entered location');
    const consent = page.locator('#preview-context-consent');
    await page.locator('#preview-visit').click();
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
    await page.locator('synthetic-place-search').dispatchEvent('input');
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
  test('wrong roof and late Maps failure suppress layout while manual enquiry remains available', async ({
    page,
  }) => {
    const calls = await setup(page);
    await page.locator('#open-map').click();
    await select(page);
    await page.locator('#assess-property').click();
    await page.locator('#unusable-roof').click();
    await expect(page.locator('#roof-results')).toBeHidden();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await select(page);
    await page.locator('#assess-property').click();
    await page.evaluate(() =>
      window.dispatchEvent(new Event('incetekh:maps-unavailable')),
    );
    await expect(page.locator('#roof-results')).toBeHidden();
    await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
    await expect(page.locator('#preview-status')).toContainText(
      'Google Maps is unavailable',
    );
    await expect(page.locator('#bill-summary-text')).toContainText(
      '3 kW bill-based target',
    );
    await expect(page.locator('#assess-property')).toBeDisabled();
    await page.locator('#preview-visit').click();
    await expect(page.locator('[data-site-visit-form]')).toBeVisible();
    expect(calls.maps()).toBe(1);
  });
  test('complete calculator-to-enquiry journey uses real Worker and D1 with synthetic providers', async ({
    page,
  }) => {
    test.setTimeout(60000);
    let solarCalls = 0,
      emailCalls = 0;
    const actions: string[] = [];
    const origin = 'https://incetekhenergy.com';
    const funnel = previewWorker(
      {
        LEAD_CAPTURE_ENABLED: 'true',
        LEAD_CAPTURE_ENV: 'production',
        LEAD_ALLOWED_ORIGIN: origin,
        EMAIL_NOTIFY_ENABLED: 'true',
        EMAIL_NOTIFY_SINCE: '2026-10-01T00:00:00.000Z',
        RESEND_API_KEY: 'synthetic-email-key',
      },
      {
        modules: [
          {
            type: 'ESModule',
            path: '.wrangler/test-worker/funnel-harness.js',
            contents: `import worker from './index.js';export default {async fetch(request,env){if(new URL(request.url).pathname==='/local-test-tick'){await worker.scheduled({},env);return new Response('ok');}return worker.fetch(request,env);}};`,
          },
          ...[
            'index',
            'email',
            'solar',
            'solar-endpoint',
            'solar-imagery',
            'solar-page',
            'preview-context',
          ].map((name) => ({
            type: 'ESModule',
            path: `.wrangler/test-worker/${name}.js`,
          })),
        ],
        ratelimits: {
          SOLAR_RATE_LIMIT: {
            namespace_id: '1021',
            simple: { limit: 3, period: 60 },
          },
          LEAD_RATE_LIMIT: {
            namespace_id: '1022',
            simple: { limit: 5, period: 60 },
          },
        },
        outboundService: async (request: Request) => {
          const url = new URL(request.url);
          if (url.origin === 'https://challenges.cloudflare.com') {
            const input = (await request.json()) as { response: string };
            const action = input.response.replace('synthetic-', '');
            actions.push(action);
            return Response.json({
              success: true,
              hostname: 'incetekhenergy.com',
              action,
            });
          }
          if (
            url.origin === 'https://solar.googleapis.com' &&
            url.pathname === '/v1/buildingInsights:findClosest'
          ) {
            solarCalls++;
            return Response.json(solarFixture());
          }
          if (url.href === 'https://api.resend.com/emails') {
            emailCalls++;
            return Response.json({ id: 'synthetic-delivery' });
          }
          throw new Error('Unexpected outbound provider');
        },
      },
    );
    try {
      const db = await funnel.getD1Database('LEADS_DB');
      for (const migration of [
        '0001_site_visit_leads',
        '0002_site_visit_email',
        '0003_solar_usage',
        '0004_solar_preview_context',
      ]) {
        const sql = (
          await readFile(`migrations/${migration}.sql`, 'utf8')
        ).replace(/^--.*$/gm, '');
        await db.batch(
          sql
            .split(';')
            .filter((s) => s.trim())
            .map((s) => db.prepare(s)),
        );
      }
      await setup(page, true, null);
      let submitted: Record<string, any> | undefined;
      for (const path of ['/api/solar-assessments', '/api/site-visits'])
        await page.route('**' + path, async (route) => {
          if (path.endsWith('site-visits'))
            submitted = route.request().postDataJSON();
          const response = await funnel.dispatchFetch(origin + path, {
            method: 'POST',
            headers: {
              Origin: origin,
              'Content-Type': 'application/json',
              'CF-Connecting-IP': '192.0.2.41',
            },
            body: route.request().postData()!,
          });
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: await response.text(),
          });
        });
      await page.goto('/');
      await page.locator('#solar-bill').fill('3000');
      await page.locator('input[value="commercial"]').check();
      await page.locator('[data-preview-link]').click();
      await page.locator('#open-map').click();
      await select(page);
      await page.locator('#assess-property').click();
      await expect(page.locator('#result-capacity')).toHaveText('3.2 kW');
      await expect(page.locator('#module-unavailable')).toBeVisible();
      await expect(page.locator('#module-unavailable')).toContainText(
        'not a Waaree installation layout',
      );
      await expect(page.locator('#roof-limited')).toBeVisible();
      await page.locator('#preview-visit').click();
      await page.locator('#visit-name').fill('Synthetic complete journey');
      await page.locator('#visit-phone').fill('9876543210');
      await page
        .locator('#visit-location')
        .fill('Customer-entered synthetic location');
      await page.locator('#preview-context-consent').check();
      await page
        .locator('[data-site-visit-form] button[type="submit"]')
        .click();
      await expect(page.locator('[data-visit-status]')).toContainText(
        'enquiry has been received',
      );
      expect(submitted).toBeDefined();
      const saved = await db.prepare('SELECT * FROM site_visit_leads').all();
      expect(saved.results).toHaveLength(1);
      expect(saved.results[0].plan).toBe('advice');
      expect(
        JSON.parse(saved.results[0].preview_context as string),
      ).toMatchObject({
        bill: 3000,
        residential: false,
        targetKw: 4,
        latitude: 15,
        longitude: 79,
        consent: true,
      });
      const retry = await funnel.dispatchFetch(origin + '/api/site-visits', {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.0.2.42',
        },
        body: JSON.stringify({ ...submitted, token: '' }),
      });
      expect(retry.status).toBe(200);
      expect(
        (await funnel.dispatchFetch(origin + '/local-test-tick')).status,
      ).toBe(200);
      expect(
        (await funnel.dispatchFetch(origin + '/local-test-tick')).status,
      ).toBe(200);
      expect(
        (await db.prepare('SELECT status FROM site_visit_email_outbox').first())
          ?.status,
      ).toBe('accepted');
      expect(
        (await db.prepare('SELECT daily_count FROM solar_usage').first())
          ?.daily_count,
      ).toBe(1);
      expect(actions).toEqual(['solar_assessment', 'site_visit']);
      expect(solarCalls).toBe(1);
      expect(emailCalls).toBe(1);
    } finally {
      await funnel.dispose();
    }
  });
});
