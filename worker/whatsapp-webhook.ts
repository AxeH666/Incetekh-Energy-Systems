import {
  type NotificationEnv,
  webhookConfig,
  attemptIdPattern,
  utf8,
  readBoundedBytes,
  retryableCode,
  retryAt,
  reconcileJob,
} from './notification-config.js';

function reply(status: number, text = '') {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function whatsappWebhook(request: Request, env: NotificationEnv) {
  const url = new URL(request.url);
  if (
    url.origin !== 'https://incetekhenergy.com' ||
    env.LEAD_CAPTURE_ENV !== 'production'
  )
    return reply(404);
  const config = webhookConfig(env);
  if (!config) return reply(503);
  if (request.method === 'GET') {
    const token = url.searchParams.get('hub.verify_token') ?? '';
    const challenge = url.searchParams.get('hub.challenge') ?? '';
    if (
      url.searchParams.get('hub.mode') !== 'subscribe' ||
      token !== config.verifyToken ||
      !/^[0-9]{1,128}$/.test(challenge)
    )
      return reply(403);
    return reply(200, challenge);
  }
  if (request.method !== 'POST') return reply(405);
  if (url.search) return reply(400);
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    return reply(415);
  if (Number(request.headers.get('Content-Length')) > 65_536) return reply(413);
  const signature = request.headers.get('X-Hub-Signature-256') ?? '';
  if (!/^sha256=[0-9a-f]{64}$/.test(signature)) return reply(403);
  let raw: Uint8Array;
  try {
    raw = await readBoundedBytes(request.body, 65_536);
  } catch {
    return reply(413);
  }
  const key = await crypto.subtle.importKey(
    'raw',
    utf8.encode(config.appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const digest = Uint8Array.from(signature.slice(7).match(/../g)!, (pair) =>
    parseInt(pair, 16),
  );
  if (!(await crypto.subtle.verify('HMAC', key, digest, raw)))
    return reply(403);
  let payload: Record<string, unknown> | undefined;
  try {
    payload = object(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(raw),
      ),
    );
  } catch {
    return reply(400);
  }
  if (payload?.object !== 'whatsapp_business_account') return reply(200);

  // The body cap bounds parsing. Persist the entire normalized batch in one
  // statement, then process a bounded chunk within the shared D1 query limit.
  const events: Record<string, unknown>[] = [];
  for (const entry of array(payload.entry)) {
    const e = object(entry);
    if (e?.id !== config.waba) continue;
    for (const change of array(e.changes)) {
      const c = object(change);
      const v = object(c?.value);
      if (
        c?.field !== 'messages' ||
        v?.messaging_product !== 'whatsapp' ||
        object(v?.metadata)?.phone_number_id !== config.sender
      )
        continue;
      // Inbound messages (including staff replies) are intentionally ignored.
      for (const candidate of array(v.statuses)) {
        const event = object(candidate);
        if (event) events.push(event);
      }
    }
  }
  try {
    const valid = [];
    for (const event of events) {
      const status = event.status;
      const messageId = event.id;
      const timestamp = Number(event.timestamp) * 1000;
      if (
        event.recipient_id !== config.recipient ||
        !['sent', 'delivered', 'read', 'failed'].includes(String(status)) ||
        typeof messageId !== 'string' ||
        !messageId.startsWith('wamid.') ||
        messageId.length > 512 ||
        typeof event.timestamp !== 'string' ||
        !/^[0-9]{1,12}$/.test(event.timestamp) ||
        !Number.isSafeInteger(timestamp) ||
        timestamp <= 0
      )
        continue;
      const callback = event.biz_opaque_callback_data;
      if (
        callback !== undefined &&
        (typeof callback !== 'string' || !attemptIdPattern.test(callback))
      )
        continue;
      const code = object(array(event.errors)[0])?.code;
      valid.push({
        callback: callback ?? null,
        messageId,
        status,
        timestamp,
        code: Number.isSafeInteger(code) && Number(code) > 0 ? code : 0,
      });
    }
    if (valid.length)
      await config.db
        .prepare(
          `INSERT INTO whatsapp_status_events
      (attempt_id, message_id, status, occurred_at, received_at, error_code)
      SELECT a.id, json_extract(e.value, '$.messageId'), json_extract(e.value, '$.status'),
        json_extract(e.value, '$.timestamp'), ?, json_extract(e.value, '$.code')
      FROM json_each(?) e JOIN whatsapp_attempts a
      ON a.id = json_extract(e.value, '$.callback') OR
        (json_extract(e.value, '$.callback') IS NULL AND a.message_id = json_extract(e.value, '$.messageId'))
      WHERE a.message_id IS NULL OR a.message_id = json_extract(e.value, '$.messageId')
      ON CONFLICT(attempt_id, message_id, status, occurred_at, error_code) DO NOTHING`,
        )
        .bind(Date.now(), JSON.stringify(valid))
        .run();
    await processStatusEvents(env);
    return reply(200, 'ok');
  } catch {
    // Meta retries non-200 responses. Replayed events are idempotent.
    return reply(503);
  }
}

export async function processStatusEvents(env: NotificationEnv) {
  const config = webhookConfig(env);
  if (!config) return;
  const db = config.db;
  const events = await db
    .prepare(
      `SELECT e.*, a.lead_id, a.attempt_number FROM whatsapp_status_events e
    JOIN whatsapp_attempts a ON a.id = e.attempt_id WHERE e.processed_at IS NULL ORDER BY e.id LIMIT 5`,
    )
    .all<{
      id: number;
      attempt_id: string;
      message_id: string;
      status: string;
      occurred_at: number;
      received_at: number;
      error_code: number;
      lead_id: string;
      attempt_number: number;
    }>();
  for (const event of events.results) {
    const now = Date.now();
    const status = event.status;
    const failure = retryableCode(event.error_code)
      ? 'retryable_failed'
      : 'permanent_failed';
    const error = event.error_code
      ? `meta_${event.error_code}`
      : 'delivery_failed';
    // Fixed SQL column map, never an identifier supplied by the webhook.
    const column = {
      sent: 'sent_at',
      delivered: 'delivered_at',
      read: 'read_at',
      failed: 'failed_at',
    }[status]!;
    await db.batch([
      db
        .prepare(
          `UPDATE whatsapp_attempts SET message_id = COALESCE(message_id, ?),
        ${column} = COALESCE(${column}, ?),
        state = CASE WHEN read_at IS NOT NULL OR ? = 'read' THEN 'read'
          WHEN delivered_at IS NOT NULL OR ? = 'delivered' THEN 'delivered'
          WHEN failed_at IS NOT NULL AND state = 'permanent_failed' THEN state
          WHEN ? = 'failed' THEN ? WHEN failed_at IS NOT NULL THEN state ELSE 'sent' END,
        error_code = CASE WHEN ? = 'failed' THEN ? ELSE error_code END,
        retry_at = CASE WHEN ? = 'failed' AND failed_at IS NULL THEN ? ELSE retry_at END,
        updated_at = MAX(updated_at, ?) WHERE id = ? AND (message_id IS NULL OR message_id = ?)`,
        )
        .bind(
          event.message_id,
          event.occurred_at,
          status,
          status,
          status,
          failure,
          status,
          error,
          status,
          retryAt(event.received_at, event.attempt_number),
          now,
          event.attempt_id,
          event.message_id,
        ),
      reconcileJob(db, event.lead_id, now),
      db
        .prepare(
          'UPDATE whatsapp_status_events SET processed_at = ? WHERE id = ? AND processed_at IS NULL',
        )
        .bind(now, event.id),
    ]);
  }
}
