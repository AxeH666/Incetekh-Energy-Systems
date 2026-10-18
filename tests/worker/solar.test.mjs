import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { normalizeSolar } from '../../.wrangler/test-worker/solar.js';
import { reserveSolar } from '../../.wrangler/test-worker/solar-endpoint.js';
import { solarFixture } from '../fixtures/solar.mjs';

const origin = 'https://incetekhenergy.com';
const bindings = {
  SOLAR_PREVIEW_ENABLED: 'true',
  SOLAR_ALLOWED_ORIGIN: origin,
  SOLAR_API_KEY: 'synthetic-secret-solar',
  SOLAR_DAILY_LIMIT: '50',
  SOLAR_MONTHLY_LIMIT: '300',
  TURNSTILE_SECRET_KEY: 'synthetic-turnstile',
  RATE_LIMIT_KEY_SECRET: 'synthetic-local-rate-secret-32-characters',
};
let mf,
  db,
  options,
  requests = 0,
  verificationRequests = 0,
  sequence = 0;
let provider = () => Response.json(solarFixture());
let verification = () => ({
  success: true,
  hostname: 'incetekhenergy.com',
  action: 'solar_assessment',
});
async function send(input = {}, request = {}) {
  return mf.dispatchFetch(request.url ?? origin + '/api/solar-assessments', {
    method: request.method ?? 'POST',
    duplex: 'half',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `192.0.2.${++sequence}`,
      ...request.headers,
    },
    ...(!['GET', 'OPTIONS'].includes(request.method)
      ? {
          body:
            request.body ??
            JSON.stringify({
              latitude: 15,
              longitude: 79,
              token: 'synthetic-token',
              ...input,
            }),
        }
      : {}),
  });
}
before(async () => {
  options = {
    modules: [
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
    compatibilityDate: '2026-09-30',
    bindings,
    d1Databases: { LEADS_DB: 'solar-local-only' },
    telemetry: { enabled: false },
    cf: false,
    ratelimits: {
      SOLAR_RATE_LIMIT: {
        namespace_id: '1003',
        simple: { limit: 3, period: 60 },
      },
    },
    serviceBindings: { ASSETS: () => new Response('asset fallback') },
    outboundService: async (request) => {
      const url = new URL(request.url);
      if (url.hostname === 'challenges.cloudflare.com') {
        verificationRequests++;
        return Response.json(verification());
      }
      assert.equal(
        url.origin + url.pathname,
        'https://solar.googleapis.com/v1/buildingInsights:findClosest',
      );
      assert.equal(url.searchParams.get('requiredQuality'), 'BASE');
      assert.equal(url.searchParams.has('key'), false);
      assert.equal(
        request.headers.get('X-Goog-Api-Key'),
        bindings.SOLAR_API_KEY,
      );
      requests++;
      return provider();
    },
  };
  mf = new Miniflare(convertV4MiniflareOptions(options));
  db = await mf.getD1Database('LEADS_DB');
  await db
    .prepare(await readFile('migrations/0003_solar_usage.sql', 'utf8'))
    .run();
});
after(async () => {
  await mf?.dispose();
});

test('synthetic response preserves model, panel order, dates and only required fields', () => {
  const result = normalizeSolar(solarFixture());
  assert.equal(result.status, 'available');
  assert.equal(result.roof.imageryDate, '2021-03-02');
  assert.equal(result.roof.imageryProcessedDate, '2025-02-01');
  assert.equal(result.roof.imageryQuality, 'BASE');
  assert.equal(result.roof.panels[1].orientation, 'LANDSCAPE');
  assert.equal(result.roof.panelCapacityWatts, 400);
  assert.equal(JSON.stringify(result).includes('MUST_NOT_ESCAPE'), false);
});
for (const [name, mutate] of [
  ['empty panels', (x) => (x.solarPotential.solarPanels = [])],
  ['missing configurations', (x) => delete x.solarPotential.solarPanelConfigs],
  ['zero dimensions', (x) => (x.solarPotential.panelHeightMeters = 0)],
  [
    'bad segment reference',
    (x) => (x.solarPotential.solarPanels[0].segmentIndex = 1),
  ],
  [
    'unknown orientation',
    (x) => (x.solarPotential.solarPanels[0].orientation = 'UNKNOWN'),
  ],
  [
    'out of bounds panel',
    (x) => (x.solarPotential.solarPanels[0].center.latitude = 17),
  ],
  [
    'oversized configuration',
    (x) => (x.solarPotential.solarPanelConfigs[0].panelsCount = 90),
  ],
  [
    'unordered configurations',
    (x) => x.solarPotential.solarPanelConfigs.reverse(),
  ],
  [
    'impossible date',
    (x) => (x.imageryDate = { year: 2025, month: 2, day: 31 }),
  ],
  [
    'nonfinite energy',
    (x) => (x.solarPotential.solarPanelConfigs[0].yearlyEnergyDcKwh = Infinity),
  ],
  ['bad bounds', (x) => (x.boundingBox.sw.latitude = 16)],
])
  test(`normalization fails closed: ${name}`, () => {
    const input = solarFixture();
    mutate(input);
    assert.deepEqual(normalizeSolar(input), {
      status: 'unusable_geometry',
      data_available: false,
    });
  });

test('available endpoint is no-store, references the selected location, never exposes credentials', async () => {
  const response = await send();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'available');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  assert.match(body.reference, /^[0-9a-f-]{36}$/);
  assert.deepEqual(body.selectedLocation, { latitude: 15, longitude: 79 });
  assert.equal(JSON.stringify(body).includes('synthetic-secret'), false);
});
test('rejects method, origin, alias, query, content type, excessive/chunked body and invalid coordinates before upstream', async () => {
  const before = requests;
  for (const [input, request, status] of [
    [{}, { method: 'GET' }, 405],
    [{}, { method: 'OPTIONS' }, 405],
    [{}, { headers: { Origin: 'https://evil.example' } }, 403],
    [
      {},
      {
        url: 'https://incetekh-energy-systems.incetekhenergy.workers.dev/api/solar-assessments',
      },
      403,
    ],
    [{}, { url: origin + '/api/solar-assessments?key=bad' }, 400],
    [{}, { headers: { 'Content-Type': 'text/plain' } }, 415],
    [{}, { body: 'x'.repeat(4097) }, 413],
    [{}, { body: '{bad' }, 400],
    [{ latitude: '15' }, {}, 400],
    [{ latitude: null }, {}, 400],
    [{ longitude: 200 }, {}, 400],
    [{ latitude: 30 }, {}, 400],
    [{ url: 'https://evil.example' }, {}, 400],
    [{ token: '' }, {}, 400],
  ])
    assert.equal((await send(input, request)).status, status);
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('x'.repeat(5000)));
      controller.close();
    },
  });
  assert.equal((await send({}, { body })).status, 413);
  assert.equal(requests, before);
});
test('wrong Turnstile hostname/action and failed security check cannot spend Solar allowance', async () => {
  const before = requests;
  for (const patch of [
    { success: false },
    { hostname: 'evil.example' },
    { action: 'site_visit' },
  ]) {
    verification = () => ({
      success: true,
      hostname: 'incetekhenergy.com',
      action: 'solar_assessment',
      ...patch,
    });
    assert.equal((await send()).status, 422);
  }
  verification = () => ({
    success: true,
    hostname: 'incetekhenergy.com',
    action: 'solar_assessment',
  });
  assert.equal(requests, before);
});
for (const [status, expected] of [
  [400, 'provider_configuration_failure'],
  [403, 'provider_configuration_failure'],
  [404, 'no_coverage'],
  [429, 'throttled'],
  [500, 'transient_failure'],
  [302, 'transient_failure'],
]) {
  test(`provider ${status} is classified without leaking provider errors or retrying`, async () => {
    provider = () => new Response('secret-provider-body', { status });
    const before = requests;
    const allowanceBefore = await db
      .prepare('SELECT daily_count FROM solar_usage')
      .first();
    const response = await send();
    const text = await response.text();
    assert.equal(JSON.parse(text).status, expected);
    assert.equal(text.includes('secret-provider-body'), false);
    assert.equal(requests, before + 1);
    const allowanceAfter = await db
      .prepare('SELECT daily_count FROM solar_usage')
      .first();
    assert.equal(allowanceAfter.daily_count, allowanceBefore.daily_count + 1);
  });
}
test('malformed, oversized and timed-out responses fail safely without retry', async () => {
  for (const fn of [
    () => new Response('{bad'),
    () => new Response('x'.repeat(2_000_001)),
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 10500));
      return Response.json(solarFixture());
    },
  ]) {
    provider = fn;
    const before = requests;
    assert.equal((await (await send()).json()).status, 'transient_failure');
    assert.equal(requests, before + 1);
  }
  provider = () => Response.json(solarFixture());
});
test('burst protection blocks fourth request with no fourth verification or Google call', async () => {
  const headers = { 'CF-Connecting-IP': '198.51.100.1' };
  for (let i = 0; i < 3; i++)
    assert.equal((await send({}, { headers })).status, 200);
  const before = requests,
    verificationBefore = verificationRequests;
  assert.equal((await send({}, { headers })).status, 429);
  assert.equal(requests, before);
  assert.equal(verificationRequests, verificationBefore);
});
test('atomic daily and monthly reservations do not overshoot under races; rollover preserves monthly allowance', async () => {
  await db.prepare('DELETE FROM solar_usage').run(); // Local isolated synthetic counter only.
  const results = await Promise.all(
    Array.from({ length: 25 }, () => reserveSolar(db, 5, 8)),
  );
  assert.equal(results.filter(Boolean).length, 5);
  assert.deepEqual(
    await db
      .prepare('SELECT daily_count, monthly_count FROM solar_usage')
      .first(),
    { daily_count: 5, monthly_count: 5 },
  );
  await db.prepare("UPDATE solar_usage SET day = '2000-01-01'").run();
  const nextDay = await Promise.all(
    Array.from({ length: 12 }, () => reserveSolar(db, 5, 8)),
  );
  assert.equal(nextDay.filter(Boolean).length, 3);
  await db
    .prepare("UPDATE solar_usage SET day = '2000-01-01', month = '2000-01'")
    .run();
  assert.equal(await reserveSolar(db, 5, 8), true);
  assert.deepEqual(
    await db
      .prepare('SELECT daily_count, monthly_count FROM solar_usage')
      .first(),
    { daily_count: 1, monthly_count: 1 },
  );
});
test('budget exhaustion and missing counter schema block upstream; assets remain healthy', async () => {
  await db.prepare('UPDATE solar_usage SET daily_count = 50').run();
  const before = requests;
  assert.equal((await (await send()).json()).status, 'budget_exhausted');
  await db.prepare('DROP TABLE solar_usage').run(); // Local isolated synthetic DB only.
  assert.equal((await (await send()).json()).status, 'transient_failure');
  assert.equal(requests, before);
  assert.equal(
    await (await mf.dispatchFetch(origin + '/')).text(),
    'asset fallback',
  );
});
test('disabled flag and missing configuration never make an outbound request', async () => {
  for (const patch of [
    { SOLAR_PREVIEW_ENABLED: 'false' },
    { SOLAR_API_KEY: '' },
    { SOLAR_DAILY_LIMIT: '' },
    { SOLAR_DAILY_LIMIT: 'Unlimited' },
    { SOLAR_MONTHLY_LIMIT: '0' },
    { SOLAR_MONTHLY_LIMIT: '301' },
    { RATE_LIMIT_KEY_SECRET: 'short' },
    { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' },
  ]) {
    await mf.setOptions(
      convertV4MiniflareOptions({
        ...options,
        bindings: { ...bindings, ...patch },
      }),
    );
    const before = requests,
      verificationBefore = verificationRequests;
    assert.equal((await send()).status, 503);
    assert.equal(requests, before);
    assert.equal(verificationRequests, verificationBefore);
  }
});
