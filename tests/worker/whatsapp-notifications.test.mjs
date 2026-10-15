import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

// All Meta/Turnstile traffic terminates in this local fake. No real credentials,
// remote D1, deployed schedule, message recipient or provider calls are used.
const origin = 'https://incetekhenergy.com';
const bindings = {
  LEAD_CAPTURE_ENABLED: 'true',
  LEAD_CAPTURE_ENV: 'production',
  LEAD_ALLOWED_ORIGIN: origin,
  TURNSTILE_SECRET_KEY: 'local-synthetic-turnstile-secret',
  RATE_LIMIT_KEY_SECRET: 'local-synthetic-rate-secret-at-least-32',
  WHATSAPP_NOTIFY_ENABLED: 'true',
  WHATSAPP_WEBHOOK_ENABLED: 'true',
  WHATSAPP_ACCESS_TOKEN: 'local-synthetic-meta-token-never-use-remotely',
  META_APP_SECRET: 'local-synthetic-meta-app-secret-32-characters',
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'local-synthetic-webhook-verification-secret',
  WHATSAPP_STAFF_NUMBER: '919000000001',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  WHATSAPP_WABA_ID: '987654321',
  WHATSAPP_TEMPLATE_ID: '111222333',
  WHATSAPP_TEMPLATE_NAME: 'incetekh_staff_enquiry_v1',
  WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
  WHATSAPP_TEMPLATE_CATEGORY: 'UTILITY',
  WHATSAPP_GRAPH_VERSION: 'v24.0',
  WHATSAPP_NOTIFY_FROM: new Date(Date.now() - 60_000).toISOString(),
  WHATSAPP_DAILY_ATTEMPT_LIMIT: '100',
};
let mf,
  db,
  now,
  mode,
  posts,
  metadataReads,
  templateOverride,
  callbackBeforeResponse;
const input = (extra = {}) => ({
  id: randomUUID(),
  fullName: 'Synthetic local customer',
  phone: '9000000000',
  email: 'test@example.invalid',
  location: 'Synthetic test area',
  plan: '5kw',
  language: 'en',
  token: randomUUID(),
  ...extra,
});
const sql = (text, ...args) => db.prepare(text).bind(...args);
const job = (id) =>
  sql('SELECT * FROM whatsapp_outbox WHERE lead_id = ?', id).first();
const attempts = (id) =>
  sql(
    'SELECT * FROM whatsapp_attempts WHERE lead_id = ? ORDER BY attempt_number',
    id,
  )
    .all()
    .then((r) => r.results);
const template = () => ({
  id: bindings.WHATSAPP_TEMPLATE_ID,
  name: bindings.WHATSAPP_TEMPLATE_NAME,
  language: 'en_US',
  category: 'UTILITY',
  status: 'APPROVED',
  ...templateOverride,
});
async function sendLead(lead = input()) {
  const response = await mf.dispatchFetch(origin + '/api/site-visits', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': randomUUID(),
    },
    body: JSON.stringify(lead),
  });
  assert.equal(response.status, 201);
  return lead;
}
async function dispatch(time = now, env = {}) {
  const r = await mf.dispatchFetch(origin + '/__local_test_dispatch', {
    method: 'POST',
    body: JSON.stringify({ time, env }),
  });
  assert.equal(r.status, 200);
}
function statusBody(attempt, status, extra = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: bindings.WHATSAPP_WABA_ID,
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: bindings.WHATSAPP_PHONE_NUMBER_ID },
              statuses: [
                {
                  id: attempt.message_id ?? 'wamid.' + attempt.id,
                  recipient_id: bindings.WHATSAPP_STAFF_NUMBER,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  biz_opaque_callback_data: attempt.id,
                  ...extra,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}
async function webhook(payload, options = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = createHmac('sha256', bindings.META_APP_SECRET)
    .update(body)
    .digest('hex');
  return mf.dispatchFetch((options.base ?? origin) + '/api/whatsapp/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=' + signature,
      ...options.headers,
    },
    body,
  });
}
async function applySchema(database, name) {
  const schema = (await readFile(name, 'utf8')).replace(/^--.*$/gm, '');
  await database.batch(
    schema
      .split(';')
      .filter((s) => s.trim())
      .map((s) => database.prepare(s)),
  );
}
before(async () => {
  await mkdir('.wrangler', { recursive: true });
  // The clock/config override exists only in this ignored local test entrypoint.
  await writeFile(
    '.wrangler/notification-test-entry.mjs',
    `
    import worker from './test-worker/index.js';
    import {dispatchNotifications} from './test-worker/notifications.js';
    import {processStatusEvents} from './test-worker/whatsapp-webhook.js';
    export default { ...worker, async fetch(request,env,ctx) {
      if(new URL(request.url).pathname==='/__local_test_dispatch') {
        const input=await request.json();const selected={...env,...input.env};
        try { await processStatusEvents(selected); await dispatchNotifications(selected,input.time); }
        catch {} return new Response('ok');
      }
      return worker.fetch(request,env,ctx);
    }};`,
  );
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: [
        '.wrangler/notification-test-entry.mjs',
        ...[
          'index',
          'notifications',
          'notification-config',
          'whatsapp-webhook',
        ].map((name) => `.wrangler/test-worker/${name}.js`),
      ].map((path) => ({ type: 'ESModule', path })),
      compatibilityDate: '2026-09-30',
      bindings,
      d1Databases: { LEADS_DB: 'local-whatsapp-only' },
      resourcePersistencePath: await mkdtemp('.wrangler/whatsapp-test-'),
      telemetry: { enabled: false },
      cf: false,
      ratelimits: {
        LEAD_RATE_LIMIT: {
          namespace_id: '1002',
          simple: { limit: 100, period: 60 },
        },
      },
      serviceBindings: { ASSETS: () => new Response('asset') },
      outboundService: async (request) => {
        const url = new URL(request.url);
        if (url.hostname === 'challenges.cloudflare.com')
          return Response.json({
            success: true,
            hostname: 'incetekhenergy.com',
            action: 'site_visit',
          });
        assert.equal(url.origin, 'https://graph.facebook.com');
        assert.equal(
          request.headers.get('Authorization'),
          'Bearer ' + bindings.WHATSAPP_ACCESS_TOKEN,
        );
        if (request.method === 'GET') {
          metadataReads++;
          assert.equal(url.pathname, '/v24.0/111222333');
          return Response.json(template());
        }
        assert.equal(url.pathname, '/v24.0/123456789/messages');
        const data = await request.json();
        posts.push(data);
        assert.equal(data.to, bindings.WHATSAPP_STAFF_NUMBER);
        assert.equal(data.type, 'template');
        assert.equal(data.template.name, bindings.WHATSAPP_TEMPLATE_NAME);
        assert.equal(data.template.components[0].parameters.length, 5);
        assert.ok(!JSON.stringify(data).includes('test@example.invalid'));
        if (callbackBeforeResponse) {
          const r = await webhook(
            statusBody({ id: data.biz_opaque_callback_data }, 'delivered'),
          );
          assert.equal(r.status, 200);
        }
        if (mode === 'transient')
          return Response.json(
            {
              error: { code: 131016, message: 'DO NOT PERSIST PROVIDER TEXT' },
            },
            { status: 503 },
          );
        if (mode === 'permanent')
          return Response.json({ error: { code: 131026 } }, { status: 400 });
        if (mode === 'credentials')
          return Response.json({ error: { code: 190 } }, { status: 401 });
        if (mode === 'malformed')
          return new Response('not-json', { status: 200 });
        if (mode === 'network')
          throw new Error('Synthetic disconnected response');
        return Response.json({
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: bindings.WHATSAPP_STAFF_NUMBER }],
          messages: [
            {
              id: 'wamid.' + data.biz_opaque_callback_data,
              message_status:
                mode === 'held' ? 'held_for_quality_assessment' : 'accepted',
            },
          ],
        });
      },
    }),
  );
  db = await mf.getD1Database('LEADS_DB');
  await applySchema(db, 'migrations/0001_site_visit_leads.sql');
  await applySchema(db, 'migrations/0002_whatsapp_notifications.sql');
});
after(async () => mf?.dispose());
beforeEach(async () => {
  // Isolated, synthetic-only database created above; never a remote binding.
  await db.batch(
    [
      'whatsapp_status_events',
      'whatsapp_attempts',
      'whatsapp_outbox',
      'whatsapp_dispatch_control',
      'site_visit_leads',
    ].map((table) => db.prepare('DELETE FROM ' + table)),
  );
  now = Date.now();
  mode = 'accepted';
  posts = [];
  metadataReads = 0;
  templateOverride = {};
  callbackBeforeResponse = false;
});

test('new enquiry stays durable when Meta fails; receipt retries do not duplicate or resend', async () => {
  const lead = await sendLead();
  mode = 'transient';
  await dispatch();
  assert.equal((await job(lead.id)).state, 'retry');
  assert.equal(posts.length, 1);
  const saved = await sql(
    'SELECT full_name,phone,email,payload_hash,notification_status FROM site_visit_leads WHERE id = ?',
    lead.id,
  ).first();
  assert.equal(saved.full_name, lead.fullName);
  assert.equal(saved.notification_status, 'not_configured');
  const retry = await mf.dispatchFetch(origin + '/api/site-visits', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1',
    },
    body: JSON.stringify({ ...lead, token: '' }),
  });
  assert.equal(retry.status, 200);
  await dispatch(now + 1);
  assert.equal(posts.length, 1);
  assert.equal((await attempts(lead.id)).length, 1);
  assert.equal(
    (
      await sql(
        'SELECT count(*) n FROM site_visit_leads WHERE id = ?',
        lead.id,
      ).first()
    ).n,
    1,
  );
  assert.deepEqual(
    await sql(
      'SELECT full_name,phone,email,payload_hash,notification_status FROM site_visit_leads WHERE id = ?',
      lead.id,
    ).first(),
    saved,
  );
});
test('accepted send is not delivery; cron and concurrent runs do not resend it', async () => {
  const lead = await sendLead();
  await Promise.all([dispatch(), dispatch(), dispatch()]);
  assert.equal(posts.length, 1);
  assert.equal((await job(lead.id)).state, 'accepted');
  await dispatch(now + 60_001);
  assert.equal(posts.length, 1);
  assert.equal((await attempts(lead.id))[0].accepted_at, now);
});
test('bounded backoff exhausts after five attempts without losing the lead', async () => {
  const lead = await sendLead();
  mode = 'transient';
  let time = now;
  for (let i = 1; i <= 5; i++) {
    await dispatch(time);
    const row = await job(lead.id);
    assert.equal(row.attempt_count, i);
    time = Math.max(time + 60_001, row.next_attempt_at + 1);
  }
  assert.equal((await job(lead.id)).state, 'failed');
  await dispatch(time + 86_400_000);
  assert.equal(posts.length, 5);
  assert.equal(
    (await sql('SELECT count(*) n FROM site_visit_leads').first()).n,
    1,
  );
  assert.ok(
    (await attempts(lead.id)).every((a) => a.error_code === 'meta_131016'),
  );
});
test('permanent rejection stops retries; credential rejection holds the dispatcher', async () => {
  const one = await sendLead();
  mode = 'permanent';
  await dispatch();
  assert.equal((await job(one.id)).state, 'failed');
  const two = await sendLead();
  mode = 'credentials';
  await dispatch(now + 60_001);
  assert.equal((await job(two.id)).state, 'failed');
  await sendLead();
  await dispatch(now + 120_002);
  assert.equal(posts.length, 2);
  assert.equal(
    (await sql('SELECT halt_reason FROM whatsapp_dispatch_control').first())
      .halt_reason,
    'provider_configuration',
  );
});
test('malformed success and lost response remain uncertain without blind retries', async () => {
  const one = await sendLead();
  mode = 'malformed';
  await dispatch();
  assert.equal((await job(one.id)).state, 'uncertain');
  const two = await sendLead();
  mode = 'network';
  await dispatch(now + 60_001);
  assert.equal((await job(two.id)).state, 'uncertain');
  await dispatch(now + 600_000);
  assert.equal(posts.length, 2);
  const a = (await attempts(one.id))[0];
  assert.equal((await webhook(statusBody(a, 'delivered'))).status, 200);
  assert.equal((await job(one.id)).state, 'delivered');
});
test('daily budget is atomic and new enquiries wait for the next UTC day', async () => {
  await sendLead();
  await sendLead();
  const env = { WHATSAPP_DAILY_ATTEMPT_LIMIT: '1' };
  await Promise.all([dispatch(now, env), dispatch(now, env)]);
  await dispatch(now + 60_001, env);
  assert.equal(posts.length, 1);
  await dispatch(now + 86_400_000, env);
  assert.equal(posts.length, 2);
});
test('destination and template configuration cannot silently redirect a backlog', async () => {
  await sendLead();
  await dispatch();
  await sendLead();
  await dispatch(now + 60_001, { WHATSAPP_STAFF_NUMBER: '919000000002' });
  assert.equal(posts.length, 1);
  await dispatch(now + 120_001, {
    WHATSAPP_TEMPLATE_NAME: 'unreviewed_template',
  });
  assert.equal(posts.length, 1);
});
test('template status/category changes hold sending before any paid attempt', async () => {
  const lead = await sendLead();
  templateOverride = { category: 'MARKETING' };
  await dispatch();
  assert.equal(posts.length, 0);
  assert.equal((await job(lead.id)).attempt_count, 0);
  assert.equal(
    (await sql('SELECT halt_reason FROM whatsapp_dispatch_control').first())
      .halt_reason,
    'template_changed',
  );
});
test('disabled, preview and incomplete configuration never queue or contact Meta', async () => {
  await sendLead();
  for (const env of [
    { WHATSAPP_NOTIFY_ENABLED: 'false' },
    { LEAD_CAPTURE_ENV: 'preview' },
    { WHATSAPP_ACCESS_TOKEN: '' },
    { WHATSAPP_DAILY_ATTEMPT_LIMIT: '101' },
    { WHATSAPP_NOTIFY_FROM: 'not-a-date' },
    { WHATSAPP_WEBHOOK_ENABLED: 'false' },
  ])
    await dispatch(now, env);
  assert.equal(posts.length, 0);
  assert.equal(metadataReads, 0);
  assert.equal(
    (await sql('SELECT count(*) n FROM whatsapp_outbox').first()).n,
    0,
  );
});
test('activation cutoff excludes historical leads and the partial index supports the sweep', async () => {
  const old = await sendLead();
  await sql(
    'UPDATE site_visit_leads SET created_at = ? WHERE id = ?',
    '2026-10-15T00:00:00.000Z',
    old.id,
  ).run();
  const fresh = await sendLead();
  await dispatch();
  assert.equal(await job(old.id), null);
  assert.equal((await job(fresh.id)).state, 'accepted');
  const plan = await sql(
    'EXPLAIN QUERY PLAN SELECT id FROM site_visit_leads WHERE whatsapp_queued_at IS NULL AND created_at >= ? ORDER BY created_at,id LIMIT 5',
    bindings.WHATSAPP_NOTIFY_FROM,
  ).all();
  assert.match(
    JSON.stringify(plan.results),
    /site_visit_leads_whatsapp_unqueued/,
  );
});
test('GET handshake, raw-body signature, sender, WABA and recipient are enforced', async () => {
  const url =
    origin +
    '/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=123&hub.verify_token=';
  assert.equal((await mf.dispatchFetch(url + 'wrong')).status, 403);
  const verified = await mf.dispatchFetch(
    url + bindings.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  );
  assert.equal(verified.status, 200);
  assert.equal(await verified.text(), '123');
  const lead = await sendLead();
  await dispatch();
  const a = (await attempts(lead.id))[0];
  assert.equal(
    (
      await webhook(statusBody(a, 'delivered'), {
        headers: { 'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64) },
      })
    ).status,
    403,
  );
  for (const bad of ['waba', 'sender', 'recipient']) {
    const body = statusBody(a, 'delivered');
    if (bad === 'waba') body.entry[0].id = '55555555';
    if (bad === 'sender')
      body.entry[0].changes[0].value.metadata.phone_number_id = '55555555';
    if (bad === 'recipient')
      body.entry[0].changes[0].value.statuses[0].recipient_id = '919000000000';
    assert.equal((await webhook(body)).status, 200);
  }
  assert.equal((await job(lead.id)).state, 'accepted');
  assert.equal(
    (
      await webhook(statusBody(a, 'delivered'), {
        base: 'https://alias.workers.dev',
      })
    ).status,
    404,
  );
});
test('duplicate and out-of-order events never downgrade delivery or read state', async () => {
  const lead = await sendLead();
  await dispatch();
  const a = (await attempts(lead.id))[0];
  const read = statusBody(a, 'read');
  assert.equal((await webhook(read)).status, 200);
  assert.equal((await webhook(read)).status, 200);
  await webhook(statusBody(a, 'sent'));
  await webhook(statusBody(a, 'failed', { errors: [{ code: 131016 }] }));
  assert.equal((await job(lead.id)).state, 'read');
  await dispatch(now + 600_000);
  assert.equal(posts.length, 1);
  assert.equal(
    (
      await sql(
        "SELECT count(*) n FROM whatsapp_status_events WHERE status = 'read'",
      ).first()
    ).n,
    1,
  );
});
test('delivery webhook may arrive before send response and must not be overwritten', async () => {
  callbackBeforeResponse = true;
  const lead = await sendLead();
  await dispatch();
  assert.equal(posts.length, 1);
  assert.equal((await job(lead.id)).state, 'delivered');
  assert.ok((await attempts(lead.id))[0].delivered_at);
});
test('authenticated failed delivery schedules bounded retry while unmatched events are ignored', async () => {
  const lead = await sendLead();
  await dispatch();
  const a = (await attempts(lead.id))[0];
  await webhook(statusBody(a, 'failed', { errors: [{ code: 131016 }] }));
  const due = (await job(lead.id)).next_attempt_at;
  assert.equal((await job(lead.id)).state, 'retry');
  await dispatch(Math.max(due, now + 60_001));
  assert.equal(posts.length, 2);
  await webhook(statusBody({ ...a, id: randomUUID() }, 'read'));
  assert.equal((await job(lead.id)).state, 'accepted');
  await webhook(statusBody(a, 'read'));
  assert.equal((await job(lead.id)).state, 'read');
});
test('held messages await outcome, and inbound staff text never triggers a reply', async () => {
  mode = 'held';
  const lead = await sendLead();
  await dispatch();
  assert.equal((await job(lead.id)).state, 'accepted');
  const inbound = statusBody((await attempts(lead.id))[0], 'sent');
  const v = inbound.entry[0].changes[0].value;
  delete v.statuses;
  v.messages = [
    {
      from: bindings.WHATSAPP_STAFF_NUMBER,
      type: 'text',
      text: { body: 'Do not save this text' },
    },
  ];
  assert.equal((await webhook(inbound)).status, 200);
  await dispatch(now + 60_001);
  assert.equal(posts.length, 1);
  assert.equal(
    (await sql('SELECT count(*) n FROM whatsapp_status_events').first()).n,
    0,
  );
});
test('large valid event batches are durable before acknowledgement and drained in bounded chunks', async () => {
  const lead = await sendLead();
  await dispatch();
  const a = (await attempts(lead.id))[0];
  const payload = statusBody(a, 'sent');
  const v = payload.entry[0].changes[0].value;
  v.statuses = Array.from({ length: 20 }, (_, i) => ({
    ...v.statuses[0],
    timestamp: String(Math.floor(now / 1000) + i),
  }));
  assert.equal((await webhook(payload)).status, 200);
  assert.equal(
    (await sql('SELECT count(*) n FROM whatsapp_status_events').first()).n,
    20,
  );
  assert.equal(
    (
      await sql(
        'SELECT count(*) n FROM whatsapp_status_events WHERE processed_at IS NULL',
      ).first()
    ).n,
    15,
  );
  for (let i = 1; i <= 3; i++)
    await dispatch(now + i * 60_001, { WHATSAPP_NOTIFY_ENABLED: 'false' });
  assert.equal(
    (
      await sql(
        'SELECT count(*) n FROM whatsapp_status_events WHERE processed_at IS NULL',
      ).first()
    ).n,
    0,
  );
  assert.equal(posts.length, 1);
});

test('database failure reserving an attempt cannot send, and a later run recovers', async () => {
  const lead = await sendLead();
  await db
    .prepare(
      "CREATE TRIGGER local_reserve_failure BEFORE INSERT ON whatsapp_attempts BEGIN SELECT RAISE(ABORT, 'synthetic reservation failure'); END",
    )
    .run();
  try {
    await dispatch();
    assert.equal(posts.length, 0);
    assert.equal((await job(lead.id)).state, 'pending');
    assert.equal(
      (
        await sql(
          'SELECT attempts_today FROM whatsapp_dispatch_control',
        ).first()
      ).attempts_today,
      0,
    );
  } finally {
    await db.prepare('DROP TRIGGER local_reserve_failure').run();
  }
  await dispatch(now + 60_001);
  assert.equal(posts.length, 1);
  assert.equal((await job(lead.id)).state, 'accepted');
});

test('lost database acknowledgement after send becomes uncertain and reconciles without resend', async () => {
  const lead = await sendLead();
  await db
    .prepare(
      "CREATE TRIGGER local_response_failure BEFORE UPDATE ON whatsapp_attempts WHEN NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL BEGIN SELECT RAISE(ABORT, 'synthetic post-send failure'); END",
    )
    .run();
  try {
    await dispatch();
    assert.equal(posts.length, 1);
    assert.equal((await job(lead.id)).state, 'sending');
  } finally {
    await db.prepare('DROP TRIGGER local_response_failure').run();
  }
  await dispatch(now + 121_000);
  assert.equal(posts.length, 1);
  assert.equal((await job(lead.id)).state, 'uncertain');
  await webhook(statusBody((await attempts(lead.id))[0], 'delivered'));
  assert.equal((await job(lead.id)).state, 'delivered');
});

test('webhook persistence failure asks Meta to retry, then stores the event once', async () => {
  const lead = await sendLead();
  await dispatch();
  const payload = statusBody((await attempts(lead.id))[0], 'delivered');
  await db
    .prepare(
      "CREATE TRIGGER local_webhook_failure BEFORE INSERT ON whatsapp_status_events BEGIN SELECT RAISE(ABORT, 'synthetic webhook failure'); END",
    )
    .run();
  try {
    assert.equal((await webhook(payload)).status, 503);
    assert.equal((await job(lead.id)).state, 'accepted');
  } finally {
    await db.prepare('DROP TRIGGER local_webhook_failure').run();
  }
  assert.equal((await webhook(payload)).status, 200);
  assert.equal((await webhook(payload)).status, 200);
  assert.equal(
    (await sql('SELECT count(*) n FROM whatsapp_status_events').first()).n,
    1,
  );
  assert.equal((await job(lead.id)).state, 'delivered');
});

test('pending delivery facts block a retry even before the status inbox is drained', async () => {
  const lead = await sendLead();
  mode = 'transient';
  await dispatch();
  const a = (await attempts(lead.id))[0];
  // Several old sent facts precede a delivery fact in one durable batch. The
  // first two processing chunks cannot yet see delivery; a resend must wait.
  const payload = statusBody(a, 'sent');
  const v = payload.entry[0].changes[0].value;
  v.statuses = Array.from({ length: 12 }, (_, i) => ({
    ...v.statuses[0],
    timestamp: String(Math.floor(now / 1000) + i),
  }));
  v.statuses.push({ ...v.statuses[0], status: 'delivered' });
  assert.equal((await webhook(payload)).status, 200);
  await dispatch(now + 60_001);
  assert.equal(posts.length, 1);
  await dispatch(now + 120_002);
  assert.equal((await job(lead.id)).state, 'delivered');
  assert.equal(posts.length, 1);
});
