import {
  type NotificationEnv,
  sendingConfig,
  configurationHash,
  boundedJson,
  retryableCode,
  retryAt,
  reconcileJob,
} from './notification-config.js';

interface Job {
  lead_id: string;
  attempt_count: number;
  full_name: string;
  phone: string;
  location: string;
  plan: string;
}
interface MetaResult {
  id?: string;
  name?: string;
  language?: string;
  category?: string;
  status?: string;
  error?: { code?: number };
  messages?: { id?: string; message_status?: string }[];
  contacts?: { wa_id?: string }[];
}
const services: Record<string, string> = {
  '3kw': '3 kW solar system',
  '5kw': '5 kW solar system',
  '7kw': '7 kW solar system',
  '10plus': '10 kW or larger',
  'water-heater': 'Solar water heater',
  advice: 'Advice requested',
};

// Only the scheduled handler calls this in production. There is no public send,
// retry, backfill or arbitrary-destination endpoint.
export async function dispatchNotifications(
  env: NotificationEnv,
  now = Date.now(),
) {
  const config = sendingConfig(env);
  if (!config || Date.parse(config.from) > now) return;
  const db = config.db;
  try {
    const hash = await configurationHash(config);
    await db
      .prepare(
        `INSERT INTO whatsapp_dispatch_control (id, config_hash)
      VALUES (1, ?) ON CONFLICT(id) DO NOTHING`,
      )
      .bind(hash)
      .run();
    const control = await db
      .prepare(
        'SELECT config_hash, halt_reason FROM whatsapp_dispatch_control WHERE id = 1',
      )
      .first<{ config_hash: string; halt_reason: string | null }>();
    if (!control || control.config_hash !== hash || control.halt_reason) return;

    // One global slot also bounds metadata requests and prevents two cron runs
    // racing for the same recipient. The durable reservation survives crashes.
    const lease = crypto.randomUUID();
    const locked = await db
      .prepare(
        `UPDATE whatsapp_dispatch_control
      SET lease_id = ?, next_dispatch_at = ?, reserved_attempt_id = NULL
      WHERE id = 1 AND config_hash = ? AND halt_reason IS NULL AND next_dispatch_at <= ?`,
      )
      .bind(lease, now + 60_000, hash, now)
      .run();
    if (locked.meta.changes !== 1) return;

    // Never retry an abandoned in-flight send: Meta may already have accepted it.
    const stale = await db
      .prepare(
        `SELECT id, lead_id FROM whatsapp_attempts
      WHERE state = 'sending' AND started_at < ? LIMIT 5`,
      )
      .bind(now - 120_000)
      .all<{ id: string; lead_id: string }>();
    if (stale.results.length)
      await db.batch(
        stale.results.flatMap((row) => [
          db
            .prepare(
              `UPDATE whatsapp_attempts SET state = 'uncertain', error_code = 'lease_expired', updated_at = ?
        WHERE id = ? AND state = 'sending'`,
            )
            .bind(now, row.id),
          reconcileJob(db, row.lead_id, now),
        ]),
      );

    // Materialize only unqueued, post-activation leads. This indexed sweep is
    // independent of customer intake; each insert+marker batch is atomic.
    const unqueued = await db
      .prepare(
        `SELECT id FROM site_visit_leads
      WHERE whatsapp_queued_at IS NULL AND created_at >= ? ORDER BY created_at, id LIMIT 5`,
      )
      .bind(config.from)
      .all<{ id: string }>();
    if (unqueued.results.length)
      await db.batch(
        unqueued.results.flatMap((row) => [
          db
            .prepare(
              `INSERT INTO whatsapp_outbox
        (lead_id, config_hash, next_attempt_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(lead_id) DO NOTHING`,
            )
            .bind(row.id, hash, now, now, now),
          db
            .prepare(
              `UPDATE site_visit_leads SET whatsapp_queued_at = ? WHERE id = ?
        AND EXISTS (SELECT 1 FROM whatsapp_outbox WHERE lead_id = ? AND config_hash = ?)`,
            )
            .bind(now, row.id, row.id, hash),
        ]),
      );

    const day = new Date(now).toISOString().slice(0, 10);
    const job = await db
      .prepare(
        `SELECT o.lead_id, o.attempt_count, l.full_name, l.phone, l.location, l.plan
      FROM whatsapp_outbox o JOIN site_visit_leads l ON l.id = o.lead_id
      WHERE o.state IN ('pending','retry') AND o.next_attempt_at <= ? AND o.attempt_count < 5
      AND NOT EXISTS (SELECT 1 FROM whatsapp_status_events e JOIN whatsapp_attempts a ON a.id = e.attempt_id
        WHERE a.lead_id = o.lead_id AND e.processed_at IS NULL)
      AND o.config_hash = ? AND EXISTS (SELECT 1 FROM whatsapp_dispatch_control
        WHERE id = 1 AND lease_id = ? AND halt_reason IS NULL
        AND (budget_day <> ? OR attempts_today < ?))
      ORDER BY o.next_attempt_at, o.created_at, o.lead_id LIMIT 1`,
      )
      .bind(now, hash, lease, day, config.dailyLimit)
      .first<Job>();
    if (!job) return;

    // A runtime category/approval check prevents stale setup evidence from
    // silently sending under a reclassified or paused template.
    let template: MetaResult;
    let templateStatus: number;
    try {
      const response = await fetch(
        `https://graph.facebook.com/${config.version}/${config.templateId}?fields=id,name,language,status,category`,
        {
          headers: { Authorization: `Bearer ${config.token}` },
          redirect: 'manual',
          signal: AbortSignal.timeout(8000),
        },
      );
      templateStatus = response.status;
      template = (await boundedJson(response)) as MetaResult;
      if (!template || typeof template !== 'object') return;
    } catch {
      return;
    }
    if (
      templateStatus === 401 ||
      templateStatus === 403 ||
      template.error?.code === 190
    ) {
      await halt(db, 'template_access', hash);
      return;
    }
    if (templateStatus !== 200 || template.error) return;
    if (
      template.id !== config.templateId ||
      template.name !== config.template ||
      template.language !== config.language ||
      template.category !== config.category ||
      template.status !== 'APPROVED'
    ) {
      await halt(db, 'template_changed', hash);
      return;
    }

    const attemptId = crypto.randomUUID();
    const reserved = await db.batch([
      db
        .prepare(
          `UPDATE whatsapp_dispatch_control SET reserved_attempt_id = ?,
        attempts_today = CASE WHEN budget_day = ? THEN attempts_today + 1 ELSE 1 END, budget_day = ?
        WHERE id = 1 AND lease_id = ? AND config_hash = ? AND halt_reason IS NULL
        AND (budget_day <> ? OR attempts_today < ?)`,
        )
        .bind(attemptId, day, day, lease, hash, day, config.dailyLimit),
      db
        .prepare(
          `UPDATE whatsapp_outbox SET state = 'sending', active_attempt_id = ?,
        attempt_count = attempt_count + 1, updated_at = ?
        WHERE lead_id = ? AND state IN ('pending','retry') AND attempt_count = ?
        AND NOT EXISTS (SELECT 1 FROM whatsapp_status_events e JOIN whatsapp_attempts a ON a.id = e.attempt_id
          WHERE a.lead_id = whatsapp_outbox.lead_id AND e.processed_at IS NULL)
        AND EXISTS (SELECT 1 FROM whatsapp_dispatch_control WHERE id = 1 AND reserved_attempt_id = ?)`,
        )
        .bind(attemptId, now, job.lead_id, job.attempt_count, attemptId),
      db
        .prepare(
          `INSERT INTO whatsapp_attempts (id, lead_id, attempt_number, state, started_at, updated_at)
        SELECT ?, lead_id, attempt_count, 'sending', ?, ? FROM whatsapp_outbox
        WHERE lead_id = ? AND active_attempt_id = ? AND state = 'sending'`,
        )
        .bind(attemptId, now, now, job.lead_id, attemptId),
    ]);
    if (reserved[2].meta.changes !== 1) return;

    let result: MetaResult | undefined;
    let status: number | null = null;
    let outcome = 'uncertain';
    let errorCode: string | null = 'network_uncertain';
    let messageId: string | null = null;
    let acceptance: string | null = null;
    try {
      const response = await fetch(
        `https://graph.facebook.com/${config.version}/${config.sender}/messages`,
        {
          method: 'POST',
          redirect: 'manual',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: config.recipient,
            type: 'template',
            biz_opaque_callback_data: attemptId,
            template: {
              name: config.template,
              language: { code: config.language },
              components: [
                {
                  type: 'body',
                  parameters: [
                    job.lead_id,
                    job.full_name,
                    job.phone,
                    job.location,
                    services[job.plan],
                  ].map((text) => ({ type: 'text', text })),
                },
              ],
            },
          }),
        },
      );
      status = response.status;
      result = (await boundedJson(response)) as MetaResult;
      const sentId = result?.messages?.[0]?.id;
      if (
        response.ok &&
        !result?.error &&
        result?.messages?.length === 1 &&
        typeof sentId === 'string' &&
        sentId.startsWith('wamid.') &&
        sentId.length <= 512 &&
        (!result.contacts ||
          result.contacts.every((c) => c.wa_id === config.recipient))
      ) {
        outcome = 'accepted';
        errorCode = null;
        messageId = sentId;
        acceptance = [
          'accepted',
          'held_for_quality_assessment',
          'paused',
        ].includes(result.messages[0].message_status ?? '')
          ? result.messages[0].message_status!
          : 'accepted';
      } else if (!response.ok && Number.isInteger(result?.error?.code)) {
        outcome = retryableCode(result!.error!.code)
          ? 'retryable_failed'
          : 'permanent_failed';
        errorCode = `meta_${result!.error!.code}`;
      } else {
        errorCode = 'invalid_response';
      }
    } catch {
      /* Unknown whether Meta accepted: never retry automatically. */
    }

    // Preserve webhook evidence that may have arrived before the HTTP response.
    // A conflicting message ID is held, never overwritten or resent.
    await db.batch([
      db
        .prepare(
          `UPDATE whatsapp_attempts SET
        state = CASE WHEN read_at IS NOT NULL THEN 'read' WHEN delivered_at IS NOT NULL THEN 'delivered'
          WHEN failed_at IS NOT NULL THEN state WHEN sent_at IS NOT NULL THEN 'sent'
          WHEN message_id IS NOT NULL AND ? IS NOT NULL AND message_id <> ? THEN 'uncertain' ELSE ? END,
        message_id = COALESCE(message_id, ?), acceptance_status = ?, http_status = ?,
        error_code = CASE WHEN failed_at IS NOT NULL THEN error_code ELSE ? END,
        accepted_at = CASE WHEN ? = 'accepted' THEN COALESCE(accepted_at, ?) ELSE accepted_at END,
        retry_at = CASE WHEN ? = 'retryable_failed' THEN ? ELSE retry_at END,
        updated_at = MAX(updated_at, ?) WHERE id = ?`,
        )
        .bind(
          messageId,
          messageId,
          outcome,
          messageId,
          acceptance,
          status,
          errorCode,
          outcome,
          now,
          outcome,
          retryAt(now, job.attempt_count + 1),
          now,
          attemptId,
        ),
      reconcileJob(db, job.lead_id, now),
    ]);
    if (
      status === 401 ||
      status === 403 ||
      [190, 131005, 131048, 132001, 132015, 132016].includes(
        result?.error?.code ?? 0,
      ) ||
      acceptance === 'paused'
    ) {
      await halt(db, 'provider_configuration', hash);
    }
  } catch {
    // Source leads remain intact. A pre-send database failure sends nothing;
    // a post-send failure leaves the durable attempt for webhook reconciliation.
    console.error(
      'WhatsApp notification run deferred; inspect notification state.',
    );
  }
}

async function halt(db: D1Database, reason: string, hash: string) {
  await db
    .prepare(
      'UPDATE whatsapp_dispatch_control SET halt_reason = ? WHERE id = 1 AND config_hash = ?',
    )
    .bind(reason, hash)
    .run();
}
