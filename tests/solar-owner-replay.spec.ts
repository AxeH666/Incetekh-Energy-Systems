import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { normalizeSolar } from '../worker/solar';
import { solarFixture } from './fixtures/solar.mjs';

test('private saved-roof mode serves only its matching image and location without outbound Solar calls', async ({
  request,
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
    JSON.stringify({ deleteBy: new Date(Date.now() + 86400000).toISOString() }),
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
          SOLAR_OWNER_PORT: '4394',
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
    const origin = 'http://127.0.0.1:4394';
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
    const image = await request.get(origin + '/api/solar-imagery/ss-mall.png');
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/png');
    expect(
      await (await request.get(origin + '/__owner/allowance')).json(),
    ).toEqual({ mode: 'ss-mall-review', maps: 3, solar: 0 });
    await writeFile(join(folder, 'clock.txt'), String(2 * 86400000));
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
