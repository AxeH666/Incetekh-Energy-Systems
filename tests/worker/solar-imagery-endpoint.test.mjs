import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { previewWorker } from '../support/solar-preview-worker.mjs';
import { solarFixture } from '../fixtures/solar.mjs';

for (const scenario of ['available', 'imagery_unavailable', 'roof_mismatch'])
  test(`assessment reserves one bounded bundle and distinguishes ${scenario}`, async () => {
    const calls = [];
    const mf = previewWorker(
      {
        SOLAR_MATCHED_IMAGERY_ENABLED: 'true',
        SOLAR_DAILY_LIMIT: '1',
        SOLAR_MONTHLY_LIMIT: '1',
      },
      {
        outboundService: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname);
          if (url.hostname === 'challenges.cloudflare.com')
            return Response.json({
              success: true,
              hostname: 'incetekhenergy.com',
              action: 'solar_assessment',
            });
          assert.equal(url.origin, 'https://solar.googleapis.com');
          assert.equal(
            request.headers.get('X-Goog-Api-Key'),
            'synthetic-private-solar-secret',
          );
          if (url.pathname.endsWith('findClosest'))
            return Response.json(solarFixture());
          if (url.pathname.endsWith('dataLayers:get'))
            return Response.json({
              imageryDate: { year: 2021, month: 3, day: 2 },
              imageryQuality: 'BASE',
              rgbUrl: 'https://solar.googleapis.com/v1/geoTiff:get?id=rgb',
              maskUrl: 'https://solar.googleapis.com/v1/geoTiff:get?id=mask',
            });
          if (url.pathname.endsWith('geoTiff:get'))
            return scenario === 'imagery_unavailable'
              ? new Response(null, { status: 503 })
              : new Response(new Uint8Array([73, 73, 42, 0, 0, 0, 0, 0]));
          throw new Error('Unexpected outbound request');
        },
      },
    );
    try {
      const db = await mf.getD1Database('LEADS_DB');
      await db
        .prepare(await readFile('migrations/0003_solar_usage.sql', 'utf8'))
        .run();
      const send = () =>
        mf.dispatchFetch('https://incetekhenergy.com/api/solar-assessments', {
          method: 'POST',
          headers: {
            Origin: 'https://incetekhenergy.com',
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.0.2.1',
          },
          body: JSON.stringify({
            latitude: scenario === 'roof_mismatch' ? 15.01 : 15,
            longitude: 79,
            token: 'synthetic-token',
          }),
        });
      const data = await (await send()).json();
      assert.equal(data.status, scenario);
      assert.equal(!!data.roofRaster, scenario === 'available');
      assert.equal(data.imageryStage, undefined);
      assert.equal(data.imageryReason, undefined);
      assert.equal(data.providerHttpStatus, undefined);
      if (scenario === 'roof_mismatch')
        assert.ok(!calls.some((p) => p.endsWith('dataLayers:get')));
      assert.equal(
        calls.filter((p) => p.endsWith('geoTiff:get')).length,
        scenario === 'available'
          ? 2
          : scenario === 'imagery_unavailable'
            ? 1
            : 0,
      );
      assert.deepEqual(
        await db
          .prepare('SELECT daily_count,monthly_count FROM solar_usage')
          .first(),
        { daily_count: 1, monthly_count: 1 },
      );
      const providerCount = calls.filter(
        (p) => !p.endsWith('siteverify'),
      ).length;
      assert.equal((await (await send()).json()).status, 'budget_exhausted');
      assert.equal(
        calls.filter((p) => !p.endsWith('siteverify')).length,
        providerCount,
      );
    } finally {
      await mf.dispose();
    }
  });
