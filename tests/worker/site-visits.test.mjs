import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { contextFixture } from '../fixtures/preview-context.mjs';

// The real workerd runtime and persisted D1 run locally. All outbound traffic is
// replaced here, never in application code; no real tokens, accounts or people.
const origin = 'https://incetekhenergy.com';
const bindings = {
  LEAD_CAPTURE_ENABLED: 'true',
  LEAD_CAPTURE_ENV: 'production',
  LEAD_ALLOWED_ORIGIN: origin,
  TURNSTILE_SECRET_KEY: 'synthetic-secret-never-use-in-cloud',
  RATE_LIMIT_KEY_SECRET: 'synthetic-local-test-rate-secret-32-characters',
};
let verificationCount = 0;
let mf;
let db;
let options;
let counter = 0;
const spent = new Set();
const lead = (overrides = {}) => ({
  id: randomUUID(),
  fullName: 'పరీక్ష వ్యక్తి',
  phone: '+91 9876543210',
  email: '',
  location: 'Synthetic test only',
  plan: '5kw',
  language: 'te',
  token: randomUUID(),
  ...overrides,
});
async function send(payload = lead(), options = {}) {
  const {
    url = origin + '/api/site-visits',
    headers = {},
    method = 'POST',
    body,
  } = options;
  return mf.dispatchFetch(url, {
    method,
    duplex: 'half',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'CF-Connecting-IP': `192.0.2.${++counter}`,
      ...headers,
    },
    ...(method === 'GET' || method === 'OPTIONS'
      ? {}
      : { body: body ?? JSON.stringify(payload) }),
  });
}
async function count(id) {
  return (
    await db
      .prepare('SELECT count(*) AS n FROM site_visit_leads WHERE id = ?')
      .bind(id)
      .first()
  ).n;
}
before(async () => {
  await mkdir('.wrangler', { recursive: true });
  const persist = await mkdtemp('.wrangler/lead-test-');
  options = {
    modules: [
      { type: 'ESModule', path: '.wrangler/test-worker/index.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/email.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/solar.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/solar-endpoint.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/solar-page.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/preview-context.js' },
    ],
    compatibilityDate: '2026-09-30',
    bindings,
    d1Databases: { LEADS_DB: 'local-leads' },
    resourcePersistencePath: persist,
    telemetry: { enabled: false },
    cf: false,
    ratelimits: {
      LEAD_RATE_LIMIT: {
        namespace_id: '1001',
        simple: { limit: 5, period: 60 },
      },
    },
    serviceBindings: { ASSETS: () => new Response('asset fallback') },
    outboundService: async (request) => {
      assert.equal(
        request.url,
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      );
      const data = await request.json();
      assert.deepEqual(Object.keys(data).sort(), ['response', 'secret']);
      verificationCount++;
      if (data.response === 'unavailable')
        return new Response('unavailable', { status: 503 });
      if (data.response === 'malformed') return new Response('not json');
      if (data.response === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, 8500));
        return Response.json({ success: false });
      }
      const success =
        !['invalid', 'expired'].includes(data.response) &&
        !spent.has(data.response);
      spent.add(data.response);
      return Response.json({
        success,
        hostname:
          data.response === 'wrong-host'
            ? 'evil.example'
            : data.response.startsWith('preview-token')
              ? 'synthetic-preview.incetekhenergy.workers.dev'
              : new URL(origin).hostname,
        action: data.response === 'wrong-action' ? 'other_form' : 'site_visit',
      });
    },
  };
  mf = new Miniflare(convertV4MiniflareOptions(options));
  db = await mf.getD1Database('LEADS_DB');
  const sql = await readFile('migrations/0001_site_visit_leads.sql', 'utf8');
  await db.batch(
    sql
      .split(';')
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );
});
after(async () => {
  await mf?.dispose();
});

test('receipt follows durable insert; native text, optional email and metadata survive restart', async () => {
  const input = lead();
  const response = await send(input);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { code: 'received', id: input.id });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  const saved = await db
    .prepare('SELECT * FROM site_visit_leads WHERE id = ?')
    .bind(input.id)
    .first();
  assert.equal(saved.full_name, input.fullName);
  assert.equal(saved.phone, '+919876543210');
  assert.equal(saved.email, null);
  assert.equal(saved.notification_status, 'not_configured');
  assert.equal(saved.privacy_notice_version, '2026-10-17.1');
  assert.ok(Date.now() - Date.parse(saved.created_at) < 10000);
  assert.equal('token' in saved || 'ip' in saved, false);
  await mf.dispose();
  mf = new Miniflare(convertV4MiniflareOptions(options));
  db = await mf.getD1Database('LEADS_DB');
  assert.equal(await count(input.id), 1);
});
test('lost receipt retry needs no second token; changed payload cannot overwrite', async () => {
  const input = lead();
  assert.equal((await send(input)).status, 201);
  const before = verificationCount;
  assert.equal((await send({ ...input, token: '' })).status, 200);
  assert.equal(verificationCount, before);
  assert.equal(
    (await send({ ...input, location: 'Changed location' })).status,
    409,
  );
  assert.equal(await count(input.id), 1);
});

for (const version of ['2026-10-15.1', '2026-10-16', '2026-10-17']) {
  test(`existing ${version} enquiry keeps its fields and receipt after cleanup`, async () => {
    const input = lead();
    assert.equal((await send(input)).status, 201);
    await db
      .prepare(
        'UPDATE site_visit_leads SET privacy_notice_version = ? WHERE id = ?',
      )
      .bind(version, input.id)
      .run();
    const saved = () =>
      db
        .prepare('SELECT * FROM site_visit_leads WHERE id = ?')
        .bind(input.id)
        .first();
    const before = await saved();
    const verifications = verificationCount;
    const receipt = await send({ ...input, token: '' });
    assert.equal(receipt.status, 200);
    assert.deepEqual(await receipt.json(), { code: 'received', id: input.id });
    assert.equal(
      (await send({ ...input, location: 'Changed location' })).status,
      409,
    );
    assert.equal(verificationCount, verifications);
    assert.deepEqual(await saved(), before);
    assert.equal(await count(input.id), 1);
  });
}

test('retired notification routes behave as unknown APIs without outbound requests or writes', async () => {
  const before = await db
    .prepare('SELECT count(*) n FROM site_visit_leads')
    .first();
  const verifications = verificationCount;
  for (const method of ['GET', 'POST']) {
    const response = await mf.dispatchFetch(origin + '/api/whatsapp/webhook', {
      method,
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { code: 'not_found' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(verificationCount, verifications);
  assert.deepEqual(
    await db.prepare('SELECT count(*) n FROM site_visit_leads').first(),
    before,
  );
});
test('concurrent same-ID submissions make exactly one row; distinct ID on same phone remains valid', async () => {
  const input = lead();
  const results = await Promise.all([
    send(input),
    send({ ...input, token: randomUUID() }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
  assert.equal(await count(input.id), 1);
  assert.equal((await send(lead())).status, 201);
});
test('SQL-looking text is stored as data with valid email', async () => {
  const input = lead({
    fullName: "'); DROP TABLE site_visit_leads; --",
    email: 'synthetic@example.invalid',
  });
  assert.equal((await send(input)).status, 201);
  const row = await db
    .prepare('SELECT full_name, email FROM site_visit_leads WHERE id=?')
    .bind(input.id)
    .first();
  assert.deepEqual(row, { full_name: input.fullName, email: input.email });
});
for (const change of [
  { fullName: '' },
  { fullName: ' '.repeat(100) },
  { fullName: 'a'.repeat(101) },
  { fullName: 'x\u0000y' },
  { location: '' },
  { location: 'x'.repeat(201) },
  { phone: '123' },
  { phone: '5876543210' },
  { email: 'bad@' },
  { email: 'x'.repeat(255) },
  { plan: 'unknown' },
  { language: 'xx' },
  { id: 'not-a-uuid' },
  { token: 'x'.repeat(2049) },
  { extra: 'forbidden' },
])
  test(`rejects invalid ${Object.keys(change)[0]} ${JSON.stringify(change).length}`, async () => {
    const input = lead(change);
    assert.equal((await send(input)).status, 400);
    assert.equal(await count(input.id), 0);
  });
test('invalid JSON, array, missing field and streamed oversize are rejected', async () => {
  for (const body of ['{', '[]', '{}'])
    assert.equal((await send({}, { body })).status, 400);
  const input = lead();
  delete input.phone;
  assert.equal((await send(input)).status, 400);
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('x'.repeat(8193)));
      controller.close();
    },
  });
  assert.equal((await send({}, { body })).status, 413);
});
test('method, origin, host, query and content type gates protect the API', async () => {
  for (const method of ['GET', 'OPTIONS', 'PUT'])
    assert.equal((await send(lead(), { method })).status, 405);
  for (const Origin of ['', 'null', 'https://evil.example'])
    assert.equal((await send(lead(), { headers: { Origin } })).status, 403);
  assert.equal(
    (await send(lead(), { headers: { 'Content-Type': 'text/plain' } })).status,
    415,
  );
  assert.equal(
    (await send(lead(), { url: origin + '/api/site-visits?name=synthetic' }))
      .status,
    404,
  );
  for (const host of [
    'incetekh-energy-systems.incetekhenergy.workers.dev',
    'preview.incetekhenergy.workers.dev',
    'www.incetekhenergy.com',
  ])
    assert.equal(
      (
        await send(lead(), {
          url: `https://${host}/api/site-visits`,
          headers: { Origin: `https://${host}` },
        })
      ).status,
      403,
    );
  assert.equal((await mf.dispatchFetch(origin + '/api/unknown')).status, 404);
  assert.equal(
    await (await mf.dispatchFetch(origin + '/privacy/')).text(),
    'asset fallback',
  );
});
for (const token of ['', 'invalid', 'expired', 'wrong-host', 'wrong-action'])
  test(`rejects invalid challenge: ${token || 'empty'}`, async () => {
    const input = lead({ token });
    assert.equal((await send(input)).status, 422);
    assert.equal(await count(input.id), 0);
  });
test('a token cannot authorize a different new submission', async () => {
  const token = randomUUID();
  assert.equal((await send(lead({ token }))).status, 201);
  assert.equal((await send(lead({ token }))).status, 422);
});
for (const token of ['unavailable', 'malformed', 'timeout'])
  test(`verifier ${token} fails closed`, async () => {
    const input = lead({ token });
    assert.equal((await send(input)).status, 503);
    assert.equal(await count(input.id), 0);
  });
test('rate limit ignores spoofed forwarding headers and returns retry guidance', async () => {
  const headers = { 'CF-Connecting-IP': '198.51.100.100' };
  for (let i = 0; i < 5; i++)
    assert.equal((await send(lead(), { headers })).status, 201);
  const response = await send(lead(), {
    headers: { ...headers, 'X-Forwarded-For': '198.51.100.200' },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
});
test('a D1 write failure never acknowledges an enquiry', async () => {
  await db
    .prepare(
      "CREATE TRIGGER fail_insert BEFORE INSERT ON site_visit_leads BEGIN SELECT RAISE(ABORT, 'synthetic quota failure'); END",
    )
    .run();
  const input = lead();
  try {
    assert.equal((await send(input)).status, 503);
    assert.equal(await count(input.id), 0);
  } finally {
    await db.prepare('DROP TRIGGER fail_insert').run();
  }
});
test('disabled capture, absent binding, test key and invalid environment fail closed', async () => {
  for (const change of [
    { bindings: { ...bindings, LEAD_CAPTURE_ENABLED: 'false' } },
    {
      bindings: {
        ...bindings,
        TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      },
    },
    { bindings: { ...bindings, RATE_LIMIT_KEY_SECRET: '' } },
    { d1Databases: {} },
    { ratelimits: {} },
  ]) {
    await mf.setOptions(convertV4MiniflareOptions({ ...options, ...change }));
    assert.equal((await send()).status, 503);
  }
  await mf.setOptions(
    convertV4MiniflareOptions({
      ...options,
      bindings: { ...bindings, LEAD_ALLOWED_ORIGIN: 'https://evil.example' },
    }),
  );
  assert.equal((await send()).status, 403);
  await mf.setOptions(convertV4MiniflareOptions(options));
});

test('an exact preview origin uses separate local D1 without writing production', async () => {
  db = await mf.getD1Database('LEADS_DB');
  const before = await db
    .prepare('SELECT count(*) AS n FROM site_visit_leads')
    .first();
  const previewOrigin = 'https://synthetic-preview.incetekhenergy.workers.dev';
  await mf.setOptions(
    convertV4MiniflareOptions({
      ...options,
      bindings: {
        ...bindings,
        LEAD_CAPTURE_ENV: 'preview',
        LEAD_ALLOWED_ORIGIN: previewOrigin,
        SOLAR_PREVIEW_ENABLED: 'true',
      },
      d1Databases: { LEADS_DB: 'separate-local-preview-leads' },
      ratelimits: {
        LEAD_RATE_LIMIT: {
          namespace_id: '1002',
          simple: { limit: 5, period: 60 },
        },
      },
    }),
  );
  try {
    db = await mf.getD1Database('LEADS_DB');
    const sql = await readFile('migrations/0001_site_visit_leads.sql', 'utf8');
    await db.batch(
      sql
        .split(';')
        .filter((s) => s.trim())
        .map((s) => db.prepare(s)),
    );
    const input = lead({ token: 'preview-token' });
    const response = await send(input, {
      url: previewOrigin + '/api/site-visits',
      headers: { Origin: previewOrigin },
    });
    assert.equal(response.status, 201);
    assert.equal(await count(input.id), 1);
    const contextMigration = await readFile(
      'migrations/0004_solar_preview_context.sql',
      'utf8',
    );
    await db.batch(
      contextMigration
        .split(';')
        .filter((s) => s.trim())
        .map((s) => db.prepare(s)),
    );
    const contextual = lead({
      token: 'preview-token-context',
      previewContext: contextFixture(),
    });
    const previewOptions = {
      url: previewOrigin + '/api/site-visits',
      headers: { Origin: previewOrigin },
    };
    assert.equal((await send(contextual, previewOptions)).status, 201);
    assert.equal(
      (await send({ ...contextual, token: '' }, previewOptions)).status,
      200,
    );
    assert.equal(await count(contextual.id), 1);
    assert.deepEqual(
      JSON.parse(
        (
          await db
            .prepare(
              'SELECT preview_context FROM site_visit_leads WHERE id = ?',
            )
            .bind(contextual.id)
            .first()
        ).preview_context,
      ),
      contextFixture(),
    );
    assert.equal((await send()).status, 403);
    assert.equal(
      (
        await send(lead(), {
          url: 'https://other.incetekhenergy.workers.dev/api/site-visits',
          headers: { Origin: 'https://other.incetekhenergy.workers.dev' },
        })
      ).status,
      403,
    );
  } finally {
    await mf.setOptions(convertV4MiniflareOptions(options));
    db = await mf.getD1Database('LEADS_DB');
  }
  assert.deepEqual(
    await db.prepare('SELECT count(*) AS n FROM site_visit_leads').first(),
    before,
  );
});
