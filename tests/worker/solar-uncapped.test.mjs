import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { previewWorker } from '../support/solar-preview-worker.mjs';
import { reserveSolar } from '../../.wrangler/test-worker/solar-endpoint.js';

test('explicit unlimited mode records attempts above former caps and retains challenge checks', async () => {
  let googleCalls = 0;
  let verified = true;
  const mf = previewWorker(
    { SOLAR_DAILY_LIMIT: 'unlimited', SOLAR_MONTHLY_LIMIT: 'unlimited' },
    {
      outboundService: (request) => {
        const url = new URL(request.url);
        if (url.hostname === 'challenges.cloudflare.com')
          return Response.json({
            success: verified,
            hostname: 'incetekhenergy.com',
            action: 'solar_assessment',
          });
        assert.equal(url.hostname, 'solar.googleapis.com');
        googleCalls++;
        return new Response(null, { status: 404 });
      },
    },
  );
  try {
    const db = await mf.getD1Database('LEADS_DB');
    await db
      .prepare(await readFile('migrations/0003_solar_usage.sql', 'utf8'))
      .run();
    await reserveSolar(db, null, null);
    await db
      .prepare('UPDATE solar_usage SET daily_count=500, monthly_count=1000')
      .run();
    const send = () =>
      mf.dispatchFetch('https://incetekhenergy.com/api/solar-assessments', {
        method: 'POST',
        headers: {
          Origin: 'https://incetekhenergy.com',
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.0.2.80',
        },
        body: JSON.stringify({
          latitude: 15,
          longitude: 79,
          token: 'synthetic-token',
        }),
      });
    assert.equal((await (await send()).json()).status, 'no_coverage');
    assert.equal(googleCalls, 1);
    assert.deepEqual(
      await db
        .prepare('SELECT daily_count, monthly_count FROM solar_usage')
        .first(),
      { daily_count: 501, monthly_count: 1001 },
    );
    verified = false;
    assert.equal((await send()).status, 422);
    assert.equal(googleCalls, 1);
    verified = true;
    await db.prepare('DROP TABLE solar_usage').run(); // Local synthetic DB only.
    assert.equal((await send()).status, 503);
    assert.equal(googleCalls, 1);
  } finally {
    await mf.dispose();
  }
});

test('unlimited periods keep atomic counts, rollover and any remaining finite cap', async () => {
  const mf = previewWorker();
  try {
    const db = await mf.getD1Database('LEADS_DB');
    await db
      .prepare(await readFile('migrations/0003_solar_usage.sql', 'utf8'))
      .run();
    const attempts = await Promise.all(
      Array.from({ length: 25 }, () => reserveSolar(db, null, null)),
    );
    assert.equal(attempts.filter(Boolean).length, 25);
    assert.deepEqual(
      await db
        .prepare('SELECT daily_count, monthly_count FROM solar_usage')
        .first(),
      { daily_count: 25, monthly_count: 25 },
    );
    assert.equal(await reserveSolar(db, null, 25), false);
    assert.equal(await reserveSolar(db, 25, null), false);
    await db
      .prepare("UPDATE solar_usage SET day='2000-01-01', month='2000-01'")
      .run();
    assert.equal(await reserveSolar(db, null, null), true);
    assert.deepEqual(
      await db
        .prepare('SELECT daily_count, monthly_count FROM solar_usage')
        .first(),
      { daily_count: 1, monthly_count: 1 },
    );
  } finally {
    await mf.dispose();
  }
});
