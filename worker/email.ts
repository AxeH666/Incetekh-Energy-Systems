import { contextEmail } from './preview-context.js';
export interface EmailEnv {
  LEADS_DB?: D1Database;
  LEAD_CAPTURE_ENABLED?: string;
  LEAD_CAPTURE_ENV?: string;
  LEAD_ALLOWED_ORIGIN?: string;
  EMAIL_NOTIFY_ENABLED?: string;
  EMAIL_NOTIFY_SINCE?: string;
  RESEND_API_KEY?: string;
}

interface Lead {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  email: string | null;
  location: string;
  plan: string;
  language: string;
  preview_context?: string | null;
}

interface Delivery {
  lead_id: string;
  payload: string;
  attempts: number;
  first_attempt_at: number;
}

// Resend retains idempotency keys for 24h. Leave an hour for clock/network margin.
const retryWindow = 23 * 60 * 60 * 1000;
const plans: Record<string, string> = {
  '3kw': '3 kW solar system',
  '5kw': '5 kW solar system',
  '7kw': '7 kW solar system',
  '10plus': '10+ kW solar system',
  'water-heater': 'Solar water heater',
  advice: 'Advice on the right system',
};

function payload(lead: Lead) {
  // Plain text only; customer input never controls headers, sender or recipient.
  return JSON.stringify({
    from: 'Incetekh Energy <site-visits@notify.incetekhenergy.com>',
    to: ['info@incetekhenergy.com'],
    subject: `Free Site Visit enquiry - ${lead.id}`,
    text: [
      'A new Free Site Visit enquiry has been saved.',
      '',
      `Lead reference: ${lead.id}`,
      `Received (UTC): ${lead.created_at}`,
      `Name: ${lead.full_name}`,
      `Phone: ${lead.phone}`,
      `Email: ${lead.email || 'Not provided'}`,
      `Location: ${lead.location}`,
      `Plan: ${plans[lead.plan] || lead.plan}`,
      `Website language: ${lead.language}`,
      ...contextEmail(lead.preview_context),
      '',
      'This is an internal notification. The enquiry is retained in D1.',
    ].join('\n'),
  });
}

export async function dispatchEmails(env: EmailEnv): Promise<void> {
  const since = env.EMAIL_NOTIFY_SINCE || '';
  // Fail closed, including all previews. Configuration is intentionally incomplete
  // in source control; an approved activation must supply the UTC cutoff and key.
  if (
    env.EMAIL_NOTIFY_ENABLED !== 'true' ||
    env.LEAD_CAPTURE_ENABLED !== 'true' ||
    env.LEAD_CAPTURE_ENV !== 'production' ||
    env.LEAD_ALLOWED_ORIGIN !== 'https://incetekhenergy.com' ||
    !env.LEADS_DB ||
    !env.RESEND_API_KEY ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(since) ||
    !Number.isFinite(Date.parse(since)) ||
    new Date(since).toISOString() !== since ||
    Date.parse(since) > Date.now()
  )
    return;
  const db = env.LEADS_DB;
  // Discover committed leads separately from the request path. The partial index
  // avoids rescanning previously queued leads; a failed batch is safe to repeat.
  const leads = await db
    .prepare(
      // SELECT * tolerates the pre-migration schema; formatting allowlists fields.
      `SELECT *
       FROM site_visit_leads WHERE email_enqueued = 0 AND created_at >= ?
       ORDER BY created_at, id LIMIT 10`,
    )
    .bind(since)
    .all<Lead>();
  if (leads.results.length) {
    await db.batch(
      leads.results.flatMap((lead) => [
        db
          .prepare(
            `INSERT INTO site_visit_email_outbox (lead_id, payload, updated_at)
             VALUES (?, ?, ?) ON CONFLICT(lead_id) DO NOTHING`,
          )
          .bind(lead.id, payload(lead), Date.now()),
        db
          .prepare(
            'UPDATE site_visit_leads SET email_enqueued = 1 WHERE id = ?',
          )
          .bind(lead.id),
      ]),
    );
  }
  const now = Date.now();
  // Never automatically replay an uncertain send outside provider deduplication.
  await db
    .prepare(
      `UPDATE site_visit_email_outbox SET status = 'uncertain',
       last_code = 'retry_window_expired', updated_at = ?
       WHERE status = 'pending' AND first_attempt_at <= ? AND next_attempt_at <= ?`,
    )
    .bind(now, now - retryWindow, now)
    .run();
  const claim = crypto.randomUUID();
  // One send per scheduled invocation. Atomic claim also covers overlapping runs.
  const delivery = await db
    .prepare(
      `UPDATE site_visit_email_outbox SET claim_token = ?, next_attempt_at = ?,
       first_attempt_at = COALESCE(first_attempt_at, ?), attempts = attempts + 1,
       updated_at = ? WHERE lead_id = (
         SELECT lead_id FROM site_visit_email_outbox
         WHERE status = 'pending' AND next_attempt_at <= ?
           AND (first_attempt_at IS NULL OR first_attempt_at > ?)
         ORDER BY next_attempt_at, lead_id LIMIT 1
       ) RETURNING lead_id, payload, attempts, first_attempt_at`,
    )
    .bind(claim, now + 120_000, now, now, now, now - retryWindow)
    .first<Delivery>();
  if (!delivery) return;

  let status = 'pending';
  let code = 'transport_error';
  let providerId: string | null = null;
  let retryAfter = 0;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `site-visit/${delivery.lead_id}`,
      },
      body: delivery.payload,
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    });
    const body = (await response.json().catch(() => null)) as {
      id?: unknown;
      name?: unknown;
    } | null;
    code = `http_${response.status}`;
    if (
      response.ok &&
      typeof body?.id === 'string' &&
      body.id.length > 0 &&
      body.id.length <= 100
    ) {
      status = 'accepted';
      providerId = body.id;
      code = 'accepted';
    } else if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 408 &&
      response.status !== 429 &&
      !(
        response.status === 409 &&
        body?.name === 'concurrent_idempotent_requests'
      )
    ) {
      status = 'failed';
    }
    const header = response.headers.get('Retry-After');
    if (header) {
      const seconds = Number(header);
      retryAfter = Number.isFinite(seconds)
        ? Math.max(0, seconds * 1000)
        : Math.max(0, Date.parse(header) - Date.now()) || 0;
    }
  } catch {
    // The provider may have accepted it. Reuse exactly the stored body and key.
  }
  const finished = Date.now();
  const delay = Math.max(
    Math.min(300_000 * 2 ** Math.min(delivery.attempts - 1, 4), 3_600_000),
    retryAfter,
  );
  // A failed persistence write leaves the lease recoverable with the same key.
  // No provider bodies, credentials or customer details enter logs.
  await db
    .prepare(
      `UPDATE site_visit_email_outbox SET status = ?, provider_id = ?, last_code = ?,
       next_attempt_at = ?, updated_at = ? WHERE lead_id = ? AND claim_token = ?`,
    )
    .bind(
      status,
      providerId,
      code,
      finished + delay,
      finished,
      delivery.lead_id,
      claim,
    )
    .run();
}
