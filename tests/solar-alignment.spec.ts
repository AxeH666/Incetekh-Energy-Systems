import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { normalizeSolar, type SolarRoof } from '../worker/solar';
import { solarFixture } from './fixtures/solar.mjs';
import { panelCorners, configurationPaths } from '../src/lib/solar-geometry';
import { createSolarMap, type MapsApi } from '../src/lib/solar-map';

function roof(): SolarRoof {
  const result = normalizeSolar(solarFixture());
  if (!result.data_available) throw new Error('Invalid synthetic fixture');
  return result.roof;
}
function metres(
  point: { lat: number; lng: number },
  center: { latitude: number; longitude: number },
) {
  return {
    east:
      (((point.lng - center.longitude) * Math.PI) / 180) *
      6378137 *
      Math.cos((center.latitude * Math.PI) / 180),
    north: (((point.lat - center.latitude) * Math.PI) / 180) * 6378137,
  };
}
for (const bearing of [0, 90, 180, 270, 37]) {
  for (const orientation of ['PORTRAIT', 'LANDSCAPE'] as const) {
    test(`panel axes, bearing signs and slope projection: ${bearing} ${orientation}`, () => {
      const data = roof();
      data.segments[0] = { pitchDegrees: 60, azimuthDegrees: bearing };
      data.panels[0].orientation = orientation;
      const corners = panelCorners(data, 0).map((point) =>
        metres(point, data.panels[0].center),
      );
      const firstEdge = {
        east: corners[1].east - corners[0].east,
        north: corners[1].north - corners[0].north,
      };
      const secondEdge = {
        east: corners[2].east - corners[1].east,
        north: corners[2].north - corners[1].north,
      };
      const along = orientation === 'PORTRAIT' ? 1 : 0.5;
      const across = orientation === 'PORTRAIT' ? 1 : 2;
      expect(firstEdge.east).toBeCloseTo(
        along * Math.sin((bearing * Math.PI) / 180),
        6,
      );
      expect(firstEdge.north).toBeCloseTo(
        along * Math.cos((bearing * Math.PI) / 180),
        6,
      );
      expect(Math.hypot(secondEdge.east, secondEdge.north)).toBeCloseTo(
        across,
        6,
      );
      expect(
        firstEdge.east * secondEdge.east + firstEdge.north * secondEdge.north,
      ).toBeCloseTo(0, 6);
      expect(corners.reduce((sum, c) => sum + c.east, 0)).toBeCloseTo(0, 6);
      expect(corners.reduce((sum, c) => sum + c.north, 0)).toBeCloseTo(0, 6);
    });
  }
}
test('flat roofs, longitude scaling and exact first-N configurations', () => {
  const data = roof();
  data.segments[0].pitchDegrees = 0;
  for (const latitude of [0, 15, 60]) {
    data.panels[0].center.latitude = latitude;
    const corners = panelCorners(data, 0).map((p) =>
      metres(p, data.panels[0].center),
    );
    expect(
      Math.hypot(
        corners[1].east - corners[0].east,
        corners[1].north - corners[0].north,
      ),
    ).toBeCloseTo(2, 6);
  }
  expect(configurationPaths(data, 4)).toEqual(
    data.panels.slice(0, 4).map((_, i) => panelCorners(data, i)),
  );
  expect(() => configurationPaths(data, 5)).toThrow();
  data.panelWidthMeters = 0;
  expect(() => panelCorners(data, 0)).toThrow();
});
test('one map owns geographic polygons; Before removes every panel and replacement cleans up', () => {
  let maps = 0;
  const layers: { attached: unknown; paths: unknown }[] = [];
  const api = {
    Map: class {
      constructor() {
        maps++;
      }
      fitBounds() {}
    },
    Polygon: class {
      layer: { attached: unknown; paths: unknown };
      constructor(options: Record<string, unknown>) {
        this.layer = { attached: options.map, paths: options.paths };
        layers.push(this.layer);
      }
      setMap(map: unknown) {
        this.layer.attached = map;
      }
    },
  } as unknown as MapsApi;
  const view = createSolarMap({} as HTMLElement, api, { lat: 15, lng: 79 });
  view.show(roof(), 4);
  expect(layers.filter((l) => l.attached)).toHaveLength(4);
  expect(layers[0].paths).toEqual(panelCorners(roof(), 0));
  view.setVisible(false);
  expect(layers.filter((l) => l.attached)).toHaveLength(0);
  view.setVisible(true);
  expect(layers.filter((l) => l.attached)).toHaveLength(4);
  view.show(roof(), 8);
  expect(layers.filter((l) => l.attached)).toHaveLength(8);
  expect(maps).toBe(1);
  view.clear();
  expect(layers.filter((l) => l.attached)).toHaveLength(0);
});

test('a partially failed polygon replacement leaves no proposed panels attached', () => {
  const attached = new Set<unknown>();
  let count = 0;
  const api = {
    Map: class {},
    Polygon: class {
      constructor() {
        if (++count === 3) throw new Error('Synthetic renderer failure');
        attached.add(this);
      }
      setMap() {
        attached.delete(this);
      }
    },
  } as unknown as MapsApi;
  const view = createSolarMap({} as HTMLElement, api, { lat: 15, lng: 79 });
  expect(() => view.show(roof(), 4)).toThrow('Synthetic renderer failure');
  expect(attached.size).toBe(0);
});

test.describe('local proof harness under real CSP, with mocked Maps only', () => {
  test.describe.configure({ mode: 'serial' });
  let server: ChildProcess;
  const origin = 'http://127.0.0.1:4332';
  test.beforeAll(async () => {
    server = spawn(process.execPath, ['scripts/solar-alignment-server.mjs'], {
      env: {
        ...process.env,
        SOLAR_ALIGNMENT_SYNTHETIC: 'true',
        SOLAR_ALIGNMENT_PORT: '4332',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Harness startup timeout')),
        15000,
      );
      server.stdout!.once('data', () => {
        clearTimeout(timer);
        resolve();
      });
      server.once('error', reject);
      server.once('exit', (code) => {
        if (code) reject(new Error('Harness exited'));
      });
    });
  });
  test.afterAll(() => server?.kill());
  for (const width of [390, 1440])
    test(`explicit load, CSP and Before/With Solar at ${width}px`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width, height: 850 });
      let calls = 0;
      await page.route('https://**/*', async (route) => {
        if (
          !route
            .request()
            .url()
            .startsWith('https://maps.googleapis.com/maps/api/js?')
        )
          throw new Error('Unexpected external request');
        calls++;
        await route.fulfill({
          contentType: 'application/javascript',
          body: await readFile('tests/fixtures/maps-mock.js', 'utf8'),
        });
      });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const response = await page.goto(origin);
      const policy = response!.headers()['content-security-policy'];
      expect(policy).toContain("'strict-dynamic'");
      expect(policy).not.toContain("'unsafe-inline'");
      const second = await request.get(origin);
      expect(second.headers()['content-security-policy']).not.toBe(policy);
      expect(calls).toBe(0);
      await page
        .getByRole('button', { name: 'Load approved Google map' })
        .click();
      expect(calls).toBe(0);
      await page.locator('#key').fill('synthetic-browser-key');
      await page.locator('#approved').check();
      await page
        .getByRole('button', { name: 'Load approved Google map' })
        .click();
      await expect(page.locator('#status')).toContainText('4 model panels');
      await expect(page.locator('[data-mock-panel]')).toHaveCount(4);
      await page
        .getByRole('button', { name: 'Show Before', exact: true })
        .click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Show With Solar', exact: true })
        .click();
      await expect(page.locator('[data-mock-panel]')).toHaveCount(4);
      expect(calls).toBe(1);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: `.wrangler/solar-alignment-synthetic-${width}.png`,
        fullPage: true,
      });
      await page.evaluate(() =>
        (window as unknown as { gm_authFailure(): void }).gm_authFailure(),
      );
      await expect(page.locator('#status')).toContainText(
        'Google Maps is unavailable',
      );
      await expect(page.locator('[data-mock-panel]')).toHaveCount(0);
      await expect(page.locator('#toggle')).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
});
