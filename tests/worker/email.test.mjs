import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const origin = 'https://incetekhenergy.com';
const bindings = {
  LEAD_CAPTURE_ENABLED: 'true',
  LEAD_CAPTURE_ENV: 'production',
  LEAD_ALLOWED_ORIGIN: origin,
  EMAIL_NOTIFY_ENABLED: 'true',
  EMAIL_NOTIFY_SINCE: '2026-10-01T00:00:00.000Z',
  RESEND_API_KEY: 'synthetic-local-key',
  TURNSTILE_SECRET_KEY: 'synthetic-local-turnstile',
  RATE_LIMIT_KEY_SECRET: 'synthetic-local-rate-limit-key-32-characters',
};
let mf, db, options;
let requests = [];
let delivered = new Map();
let provider;
let requestCounter = 0;
const input = (overrides = {}) => ({
  id: randomUUID(),
  fullName: 'పరీక్ష వ్యక్తి',
  phone: '9000000000',
  email: '',
  location: 'Synthetic location <script>',
  plan: '5kw',
  language: 'te',
  token: 'synthetic-token',
  ...overrides,
});
async function submit(lead = input()) {
  return mf.dispatchFetch(origin + '/api/site-visits', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `192.0.2.${++requestCounter}`,
    },
    body: JSON.stringify(lead),
  });
}
async function tick() {
  const response = await mf.dispatchFetch(origin + '/local-test-tick');
  return response.status;
}
async function row(id) {
  return db
    .prepare('SELECT * FROM site_visit_email_outbox WHERE lead_id = ?')
    .bind(id)
    .first();
}
async function due(id) {
  await db
    .prepare(
      'UPDATE site_visit_email_outbox SET next_attempt_at = 0 WHERE lead_id = ?',
    )
    .bind(id)
    .run();
}
async function migrate(file) {
  const sql = await readFile(file, 'utf8');
  await db.batch(
    sql
      .split(';')
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );
}
async function setBindings(changes = {}) {
  await mf.setOptions(
    convertV4MiniflareOptions({
      ...options,
      bindings: { ...bindings, ...changes },
    }),
  );
  db = await mf.getD1Database('LEADS_DB');
}
before(async () => {
  await mkdir('.wrangler', { recursive: true });
  const persist = await mkdtemp('.wrangler/email-test-');
  options = {
    // The route exists only in this test harness, never in the deployed Worker.
    modules: [
      {
        type: 'ESModule',
        path: '.wrangler/test-worker/email-harness.js',
        contents: `
        import worker from './index.js';
        export default { async fetch(request, env) {
          if (new URL(request.url).pathname === '/local-test-tick') {
            try { await worker.scheduled({}, env); return new Response('ok'); }
            catch { return new Response('failed', { status: 500 }); }
          }
          return worker.fetch(request, env);
        } };`,
      },
      { type: 'ESModule', path: '.wrangler/test-worker/index.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/email.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/solar.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/solar-endpoint.js' },
      { type: 'ESModule', path: '.wrangler/test-worker/solar-page.js' },
    ],
    compatibilityDate: '2026-09-30',
    bindings,
    d1Databases: { LEADS_DB: 'local-email-tests' },
    resourcePersistencePath: persist,
    telemetry: { enabled: false },
    cf: false,
    ratelimits: {
      LEAD_RATE_LIMIT: {
        namespace_id: '2001',
        simple: { limit: 5, period: 60 },
      },
    },
    serviceBindings: { ASSETS: () => new Response('assets') },
    outboundService: async (request) => {
      if (
        request.url ===
        'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      )
        return Response.json({
          success: true,
          hostname: 'incetekhenergy.com',
          action: 'site_visit',
        });
      assert.equal(request.url, 'https://api.resend.com/emails');
      const call = {
        body: await request.text(),
        key: request.headers.get('Idempotency-Key'),
      };
      assert.equal(
        request.headers.get('Authorization'),
        'Bearer synthetic-local-key',
      );
      requests.push(call);
      return provider(call);
    },
  };
  mf = new Miniflare(convertV4MiniflareOptions(options));
  db = await mf.getD1Database('LEADS_DB');
  await migrate('migrations/0001_site_visit_leads.sql');
  const legacy = input();
  assert.equal((await submit(legacy)).status, 201);
  const beforeRow = await db
    .prepare('SELECT * FROM site_visit_leads WHERE id = ?')
    .bind(legacy.id)
    .first();
  await migrate('migrations/0002_site_visit_email.sql');
  const { email_enqueued, ...afterRow } = await db
    .prepare('SELECT * FROM site_visit_leads WHERE id = ?')
    .bind(legacy.id)
    .first();
  assert.deepEqual(
    afterRow,
    beforeRow,
    'migration preserves all existing fields',
  );
  assert.equal(email_enqueued, 0);
  assert.equal((await submit({ ...legacy, token: '' })).status, 200);
});
beforeEach(async () => {
  // Synthetic local-only databases; these helpers never accept a remote target.
  await db.batch([
    db.prepare('DELETE FROM site_visit_email_outbox'),
    db.prepare('DELETE FROM site_visit_leads'),
  ]);
  requests = [];
  delivered = new Map();
  provider = (call) => {
    if (delivered.has(call.key))
      assert.equal(delivered.get(call.key).body, call.body);
    else delivered.set(call.key, { body: call.body, id: randomUUID() });
    return Response.json({ id: delivered.get(call.key).id });
  };
});
after(async () => {
  await mf?.dispose();
});

test('save and receipt precede email; repeated receipt and repeated tick send once', async () => {
  const lead = input({ email: 'synthetic@example.invalid' });
  assert.equal((await submit(lead)).status, 201);
  assert.equal(requests.length, 0);
  assert.equal(await tick(), 200);
  assert.equal((await row(lead.id)).status, 'accepted');
  const body = JSON.parse(requests[0].body);
  assert.deepEqual(body.to, ['info@incetekhenergy.com']);
  assert.equal(
    body.from,
    'Incetekh Energy <site-visits@notify.incetekhenergy.com>',
  );
  for (const value of [
    lead.id,
    lead.fullName,
    '+919000000000',
    lead.email,
    lead.location,
    '5 kW solar system',
    'te',
  ])
    assert.ok(body.text.includes(value), value);
  assert.equal(body.html, undefined);
  assert.equal(body.reply_to, undefined);
  assert.equal((await submit({ ...lead, token: '' })).status, 200);
  assert.equal(await tick(), 200);
  assert.equal(requests.length, 1);
  assert.equal(delivered.size, 1);
});

test('disabled, preview and incomplete configuration never touch email tables or send', async () => {
  const lead = input();
  await submit(lead);
  for (const changes of [
    { EMAIL_NOTIFY_ENABLED: 'false' },
    { LEAD_CAPTURE_ENABLED: 'false' },
    { LEAD_CAPTURE_ENV: 'preview' },
    { LEAD_ALLOWED_ORIGIN: 'https://other.example' },
    { EMAIL_NOTIFY_SINCE: '' },
    { EMAIL_NOTIFY_SINCE: '2026-02-30T00:00:00.000Z' },
    { EMAIL_NOTIFY_SINCE: '2999-01-01T00:00:00.000Z' },
    { RESEND_API_KEY: '' },
  ]) {
    await setBindings(changes);
    assert.equal(await tick(), 200);
    assert.equal(await row(lead.id), null);
  }
  assert.equal(requests.length, 0);
  await setBindings();
});

test('activation cutoff excludes historical leads and includes new ones', async () => {
  const old = input();
  const fresh = input();
  await submit(old);
  await submit(fresh);
  await db
    .prepare(
      "UPDATE site_visit_leads SET created_at = '2026-09-30T23:59:59.999Z' WHERE id = ?",
    )
    .bind(old.id)
    .run();
  assert.equal(await tick(), 200);
  assert.equal(await row(old.id), null);
  assert.equal((await row(fresh.id)).status, 'accepted');
  assert.ok(JSON.parse(requests[0].body).text.includes('Email: Not provided'));
});

test('overlapping schedules atomically discover and claim one lead', async () => {
  const lead = input();
  await submit(lead);
  const original = provider;
  provider = async (call) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return original(call);
  };
  assert.deepEqual(await Promise.all([tick(), tick()]), [200, 200]);
  assert.equal(requests.length, 1);
  assert.equal((await row(lead.id)).attempts, 1);
});

test('queue write failure never changes the receipt; next tick repairs the queue', async () => {
  await db.exec(
    "CREATE TRIGGER fail_queue BEFORE INSERT ON site_visit_email_outbox BEGIN SELECT RAISE(ABORT, 'synthetic'); END",
  );
  const lead = input();
  try {
    assert.equal((await submit(lead)).status, 201);
    assert.equal(await tick(), 500);
    assert.equal((await submit({ ...lead, token: '' })).status, 200);
    assert.equal(
      (
        await db
          .prepare('SELECT email_enqueued FROM site_visit_leads WHERE id = ?')
          .bind(lead.id)
          .first()
      ).email_enqueued,
      0,
    );
    assert.equal(requests.length, 0);
  } finally {
    await db.exec('DROP TRIGGER fail_queue');
  }
  assert.equal(await tick(), 200);
  assert.equal((await row(lead.id)).status, 'accepted');
});

test('provider failure backs off without affecting saved lead or receipt', async () => {
  const lead = input();
  await submit(lead);
  provider = () => new Response('unavailable', { status: 503 });
  assert.equal(await tick(), 200);
  const queued = await row(lead.id);
  assert.equal(queued.status, 'pending');
  assert.equal(queued.last_code, 'http_503');
  assert.ok(queued.next_attempt_at >= queued.updated_at + 300_000);
  assert.equal(await tick(), 200);
  assert.equal(requests.length, 1);
  assert.equal((await submit({ ...lead, token: '' })).status, 200);
});

test('acceptance with lost D1 acknowledgement retries same key and frozen payload after restart', async () => {
  const lead = input();
  await submit(lead);
  await db.exec(
    "CREATE TRIGGER fail_ack BEFORE UPDATE ON site_visit_email_outbox WHEN NEW.status = 'accepted' BEGIN SELECT RAISE(ABORT, 'synthetic'); END",
  );
  try {
    assert.equal(await tick(), 500);
  } finally {
    await db.exec('DROP TRIGGER fail_ack');
  }
  assert.equal(delivered.size, 1);
  const firstBody = requests[0].body;
  await db
    .prepare(
      "UPDATE site_visit_leads SET full_name = 'Later correction' WHERE id = ?",
    )
    .bind(lead.id)
    .run();
  await due(lead.id);
  await mf.dispose();
  mf = new Miniflare(convertV4MiniflareOptions(options));
  db = await mf.getD1Database('LEADS_DB');
  assert.equal(await tick(), 200);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].body, firstBody);
  assert.equal(requests[1].key, requests[0].key);
  assert.equal(delivered.size, 1);
  assert.equal((await row(lead.id)).status, 'accepted');
});

test('ambiguous malformed success retries; lease blocks immediate repeated invocation', async () => {
  const lead = input();
  await submit(lead);
  provider = () => new Response('not-json');
  await tick();
  assert.equal((await row(lead.id)).status, 'pending');
  await tick();
  assert.equal(requests.length, 1);
});

test('expired uncertain send is held without replay; accepted entries never reset', async () => {
  const lead = input();
  await submit(lead);
  provider = () => new Response('unavailable', { status: 503 });
  await tick();
  await db
    .prepare(
      'UPDATE site_visit_email_outbox SET first_attempt_at = ?, next_attempt_at = 0 WHERE lead_id = ?',
    )
    .bind(Date.now() - 23 * 60 * 60 * 1000 - 1000, lead.id)
    .run();
  await tick();
  assert.equal((await row(lead.id)).status, 'uncertain');
  assert.equal((await row(lead.id)).last_code, 'retry_window_expired');
  await tick();
  assert.equal(requests.length, 1);
});

test('permanent rejection holds; concurrent provider conflict and quotas retry with backoff', async () => {
  for (const [status, name, expected] of [
    [401, 'invalid_api_key', 'failed'],
    [403, 'validation_error', 'failed'],
    [409, 'invalid_idempotent_request', 'failed'],
    [409, 'concurrent_idempotent_requests', 'pending'],
    [429, 'daily_quota_exceeded', 'pending'],
    [429, 'monthly_quota_exceeded', 'pending'],
  ]) {
    const lead = input();
    await submit(lead);
    provider = () =>
      Response.json({ name }, { status, headers: { 'Retry-After': '3600' } });
    await tick();
    const queued = await row(lead.id);
    assert.equal(queued.status, expected, name);
    assert.ok(queued.next_attempt_at >= queued.updated_at + 3_600_000);
    assert.equal((await submit({ ...lead, token: '' })).status, 200);
  }
});

test('timeout after provider acceptance retries the same request without a second send', async () => {
  const lead = input();
  await submit(lead);
  const original = provider;
  provider = async (call) => {
    const accepted = original(call);
    await new Promise((resolve) => setTimeout(resolve, 10_500));
    return accepted;
  };
  assert.equal(await tick(), 200);
  assert.equal((await row(lead.id)).last_code, 'transport_error');
  assert.equal(delivered.size, 1);
  provider = original;
  await due(lead.id);
  assert.equal(await tick(), 200);
  assert.equal((await row(lead.id)).status, 'accepted');
  assert.equal(delivered.size, 1);
  assert.deepEqual(requests[0], requests[1]);
});

test('approved local retention deletes child and lead atomically without affecting another lead', async () => {
  const lead = input();
  const retained = input();
  await submit(lead);
  await submit(retained);
  await tick();
  await assert.rejects(
    db.prepare('DELETE FROM site_visit_leads WHERE id = ?').bind(lead.id).run(),
    /FOREIGN KEY/,
  );
  await db.batch([
    db
      .prepare('DELETE FROM site_visit_email_outbox WHERE lead_id = ?')
      .bind(lead.id),
    db.prepare('DELETE FROM site_visit_leads WHERE id = ?').bind(lead.id),
  ]);
  assert.equal(await row(lead.id), null);
  assert.equal(
    await db
      .prepare('SELECT id FROM site_visit_leads WHERE id = ?')
      .bind(lead.id)
      .first(),
    null,
  );
  assert.equal((await submit({ ...retained, token: '' })).status, 200);
  assert.ok(await row(retained.id));
});

test('one invocation sends only one email and bounds discovery work', async () => {
  for (let i = 0; i < 12; i++) assert.equal((await submit()).status, 201);
  await tick();
  assert.equal(requests.length, 1);
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) AS n FROM site_visit_email_outbox')
        .first()
    ).n,
    10,
  );
  await tick();
  assert.equal(requests.length, 2);
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) AS n FROM site_visit_email_outbox')
        .first()
    ).n,
    12,
  );
});
