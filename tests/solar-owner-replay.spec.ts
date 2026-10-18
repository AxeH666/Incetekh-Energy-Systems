import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { normalizeSolar } from '../worker/solar';
import { solarFixture } from './fixtures/solar.mjs';

for (const manufacturerCapture of [false, true])
  test(`private saved-roof mode serves only its matching image and location without outbound Solar calls (manufacturer=${manufacturerCapture})`, async ({
    request,
    page,
  }) => {
    const folder = await mkdtemp('.wrangler/owner-replay-test-');
    for (const directory of [
      'scripts',
      'worker',
      'tests/fixtures',
      'dist',
      '.wrangler/solar-ss-mall',
    ])
      await mkdir(join(folder, directory), { recursive: true });
    for (const file of [
      'scripts/solar-owner-preview.mjs',
      'scripts/solar-owner-live.mjs',
      'scripts/solar-owner-budget.mjs',
      'worker/solar.ts',
      'tests/fixtures/solar.mjs',
    ])
      await copyFile(file, join(folder, file));
    await mkdir(join(folder, 'dist/solar-preview'), { recursive: true });
    await writeFile(
      join(folder, 'dist/solar-preview/index.html'),
      '<!doctype html><html><head></head><body>Private review</body></html>',
    );
    const cache = join(folder, '.wrangler/solar-ss-mall');
    await writeFile(
      join(cache, 'roof.json'),
      JSON.stringify({
        ...normalizeSolar(solarFixture()),
        selectedLocation: { latitude: 15, longitude: 79 },
      }),
    );
    await writeFile(
      join(cache, 'retention.json'),
      JSON.stringify({
        deleteBy: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    await writeFile(
      join(cache, 'map-bounds.json'),
      JSON.stringify({
        south: 14.998,
        west: 78.998,
        north: 15.002,
        east: 79.002,
      }),
    );
    await writeFile(
      join(cache, 'layers-metadata.json'),
      JSON.stringify({ imageryDate: { year: 2021, month: 3, day: 2 } }),
    );
    await writeFile(
      join(cache, 'map-rgb.png'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    await copyFile(join(cache, 'map-rgb.png'), join(cache, 'saved-before.png'));
    await copyFile(
      join(cache, 'map-rgb.png'),
      join(cache, 'saved-with-solar.png'),
    );
    if (manufacturerCapture) {
      for (const file of [
        'module-close-before.png',
        'module-close.png',
        'module-whole.png',
      ])
        await copyFile(join(cache, 'map-rgb.png'), join(cache, file));
      await writeFile(
        join(cache, 'module-layout.json'),
        JSON.stringify({
          targetKw: 5,
          count: 9,
          capacityKw: 4.95,
          imageryDate: '2021-03-02',
          module: { watts: 550, lengthMeters: 2.272, widthMeters: 1.133 },
        }),
      );
    }
    const preload = join(folder, 'block-network.mjs');
    await writeFile(
      preload,
      "import {readFileSync} from 'node:fs'; const now=Date.now; Date.now=()=>now()+Number(readFileSync(new URL('./clock.txt',import.meta.url),'utf8')); globalThis.fetch=()=>{process.stderr.write('UNEXPECTED_OUTBOUND');throw new Error('Network blocked by test')};",
    );
    await writeFile(join(folder, 'clock.txt'), '0');
    const launch = () =>
      spawn(
        process.execPath,
        [
          '--import',
          pathToFileURL(resolve(preload)).href,
          join(folder, 'scripts/solar-owner-preview.mjs'),
        ],
        {
          env: {
            ...process.env,
            SOLAR_OWNER_LIVE: 'approved-2026-10-18-ss-mall',
            SOLAR_OWNER_PORT: manufacturerCapture ? '4395' : '4394',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
    const server = launch();
    let errors = '';
    server.stderr.on('data', (chunk) => (errors += chunk.toString()));
    server.stdin.end(
      JSON.stringify({
        browserKey: 'AIza' + 'a'.repeat(35),
        serverKey: 'AIza' + 'b'.repeat(35),
      }),
    );
    try {
      await new Promise<void>((done, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Owner replay did not start')),
          15000,
        );
        server.once('error', reject);
        server.once('exit', () => {
          clearTimeout(timeout);
          reject(new Error('Owner replay exited: ' + errors));
        });
        server.stdout.once('data', () => {
          clearTimeout(timeout);
          done();
        });
      });
      const origin =
        'http://127.0.0.1:' + (manufacturerCapture ? '4395' : '4394');
      const privatePage = await request.get(origin + '/solar-preview/');
      expect(privatePage.status()).toBe(200);
      expect(privatePage.headers()['content-security-policy']).toMatch(
        /img-src[^;]*blob:/,
      );
      const assess = (latitude: number) =>
        request.post(origin + '/api/solar-assessments', {
          headers: { Origin: origin },
          data: { latitude, longitude: 79 },
        });
      for (let i = 0; i < 2; i++) {
        const response = await assess(15);
        expect(await response.json()).toMatchObject({
          status: 'available',
          roofImage: {
            url: '/api/solar-imagery/ss-mall.png',
            imageryDate: '2021-03-02',
          },
        });
      }
      expect(await (await assess(15.01)).json()).toMatchObject({
        status: 'no_coverage',
      });
      const image = await request.get(
        origin + '/api/solar-imagery/ss-mall.png',
      );
      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toBe('image/png');
      expect(
        await (await request.get(origin + '/__owner/allowance')).json(),
      ).toEqual({ mode: 'ss-mall-review', maps: 3, solar: 0 });
      const external: string[] = [];
      page.on('request', (req) => {
        if (!req.url().startsWith(origin + '/')) external.push(req.url());
      });
      await page.goto(origin + '/__owner/ss-mall/');
      await expect(
        page.getByRole('heading', { name: 'SS Mall, Proddatur' }),
      ).toBeVisible();
      await expect(page.locator('#solar-image')).toBeVisible();
      if (manufacturerCapture) {
        await expect(page.locator('main')).toContainText(
          '9 x 550 W panels / 4.95 kWp',
        );
        await page.getByLabel('Whole roof', { exact: true }).check();
        await expect(page.locator('#whole-image')).toBeVisible();
        await expect(page.locator('#solar-image')).toBeHidden();
      }
      await page.getByLabel('Before', { exact: true }).check();
      await expect(page.locator('#before-image')).toBeVisible();
      await expect(page.locator('#solar-image')).toBeHidden();
      await page.reload();
      await expect(page.locator('#solar-image')).toBeVisible();
      expect(
        await page
          .locator('#solar-image')
          .evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
      ).toBe(true);
      expect(external).toEqual([]);
      expect(
        await (await request.get(origin + '/__owner/allowance')).json(),
      ).toMatchObject({ maps: 3, solar: 0 });
      for (let i = 0; i < 3; i++)
        await request.get(origin + '/__owner/maps.js'); // Reserve locally; never execute these scripts.
      await page.goto(origin + '/solar-preview/');
      await expect(page).toHaveURL(origin + '/__owner/ss-mall/');
      expect(
        await (await request.get(origin + '/__owner/allowance')).json(),
      ).toMatchObject({ maps: 0, solar: 0 });
      expect(external).toEqual([]);
      await writeFile(join(folder, 'clock.txt'), String(2 * 86400000));
      expect((await request.get(origin + '/__owner/ss-mall/')).status()).toBe(
        404,
      );
      expect(
        (
          await request.get(origin + '/__owner/ss-mall/with-solar.png')
        ).status(),
      ).toBe(404);
      expect(await (await assess(15)).json()).toMatchObject({
        status: 'no_coverage',
        data_available: false,
      });
      expect(
        (await request.get(origin + '/api/solar-imagery/ss-mall.png')).status(),
      ).toBe(404);
      expect(errors).not.toContain('UNEXPECTED_OUTBOUND');
    } finally {
      if (server.exitCode === null && server.signalCode === null) {
        const stopped = new Promise((resolve) => server.once('exit', resolve));
        server.kill();
        await stopped;
      }
    }
    await writeFile(
      join(cache, 'retention.json'),
      JSON.stringify({ deleteBy: new Date(Date.now() - 1000).toISOString() }),
    );
    const expired = launch();
    let rejected = '';
    expired.stderr.on('data', (chunk) => (rejected += chunk.toString()));
    expired.stdin.end();
    const code = await new Promise((resolve) => expired.once('exit', resolve));
    expect(code).not.toBe(0);
    expect(rejected).toContain('missing or expired');
  });
