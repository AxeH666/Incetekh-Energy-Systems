import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchSolarImagery,
  SolarImageryError,
  imageryRadius,
} from '../../.wrangler/test-worker/solar-imagery.js';
import { normalizeSolar } from '../../.wrangler/test-worker/solar.js';
import { solarFixture } from '../fixtures/solar.mjs';

const roof = normalizeSolar(solarFixture()).roof;
const originalFetch = globalThis.fetch;
const tiff = new Uint8Array([73, 73, 42, 0, 0, 0, 0, 0]);
test('imagery radius encloses building corners with a border and avoids a fixed neighbourhood download', () => {
  const small = {
    ...roof,
    bounds: {
      sw: { latitude: 14.9999, longitude: 78.9999 },
      ne: { latitude: 15.0001, longitude: 79.0001 },
    },
  };
  assert.equal(imageryRadius(small), 21);
  const offset = {
    ...small,
    center: { latitude: 14.99995, longitude: 78.99995 },
  };
  assert.ok(imageryRadius(offset) > imageryRadius(small));
  assert.equal(imageryRadius(roof), 100);
});
function metadata(patch = {}) {
  return {
    imageryDate: { year: 2021, month: 3, day: 2 },
    imageryQuality: 'BASE',
    rgbUrl: 'https://solar.googleapis.com/v1/geoTiff:get?id=rgb',
    maskUrl: 'https://solar.googleapis.com/v1/geoTiff:get?id=mask',
    ...patch,
  };
}
test('matched imagery fetches only bounded fixed Google assets and returns no credential or URL', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(new URL(url));
    assert.equal(options.headers['X-Goog-Api-Key'], 'synthetic-key');
    assert.equal(options.redirect, 'manual');
    return calls.length === 1 ? Response.json(metadata()) : new Response(tiff);
  };
  try {
    const data = await fetchSolarImagery(roof, 'synthetic-key');
    assert.equal(calls.length, 3);
    assert.equal(calls[0].searchParams.get('view'), 'IMAGERY_LAYERS');
    assert.equal(calls[0].searchParams.get('radiusMeters'), '100');
    assert.equal(calls[0].searchParams.get('exactQualityRequired'), 'true');
    assert.equal(data.imageryDate, roof.imageryDate);
    assert.equal(data.rgb, Buffer.from(tiff).toString('base64'));
    assert.ok(!JSON.stringify(data).includes('synthetic-key'));
    assert.ok(!JSON.stringify(data).includes('googleapis'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test('date/quality mismatch and either unsafe asset URL prevent every download', async () => {
  for (const patch of [
    { imageryDate: { year: 2022, month: 3, day: 2 } },
    { imageryQuality: 'HIGH' },
    { maskUrl: 'https://attacker.example/v1/geoTiff:get?id=bad' },
    { rgbUrl: 'https://solar.googleapis.com/v1/geoTiff:get?id=rgb&key=bad' },
  ]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json(metadata(patch));
    };
    try {
      await assert.rejects(
        fetchSolarImagery(roof, 'synthetic-key'),
        (error) => {
          assert.ok(error instanceof SolarImageryError);
          assert.equal(error.stage, 'metadata');
          assert.equal(error.httpStatus, undefined);
          assert.equal(
            error.reason,
            patch.imageryDate || patch.imageryQuality
              ? 'data_mismatch'
              : 'invalid_data',
          );
          return true;
        },
      );
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});
test('redirect, corrupt or oversized TIFF fails without retry or second download', async () => {
  for (const response of [
    () => new Response(null, { status: 302 }),
    () => new Response('not a tiff'),
    () => new Response(new Uint8Array(4_000_001)),
  ]) {
    let calls = 0;
    globalThis.fetch = async () =>
      ++calls === 1 ? Response.json(metadata()) : response();
    try {
      await assert.rejects(
        fetchSolarImagery(roof, 'synthetic-key'),
        (error) => {
          assert.ok(error instanceof SolarImageryError);
          assert.equal(error.stage, 'rgb');
          assert.equal(error.message, 'Matching imagery unavailable');
          return true;
        },
      );
      assert.equal(calls, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test('imagery failures expose only a fixed stage and numeric HTTP status to internal diagnostics', async () => {
  for (const [stage, failAt] of [
    ['metadata', 1],
    ['rgb', 2],
    ['mask', 3],
  ]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (calls === failAt)
        return new Response('Sensitive provider error or URL must not escape', {
          status: 429,
        });
      return calls === 1 ? Response.json(metadata()) : new Response(tiff);
    };
    try {
      await assert.rejects(
        fetchSolarImagery(roof, 'synthetic-key'),
        (error) => {
          assert.ok(error instanceof SolarImageryError);
          assert.equal(error.stage, stage);
          assert.equal(error.httpStatus, 429);
          assert.equal(error.message, 'Matching imagery unavailable');
          assert.ok(!JSON.stringify(error).includes('Sensitive'));
          return true;
        },
      );
      assert.equal(calls, failAt);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});
