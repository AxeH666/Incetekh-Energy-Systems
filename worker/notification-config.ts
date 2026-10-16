export interface NotificationEnv {
  LEADS_DB?: D1Database;
  LEAD_CAPTURE_ENV?: string;
  WHATSAPP_NOTIFY_ENABLED?: string;
  WHATSAPP_WEBHOOK_ENABLED?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  META_APP_SECRET?: string;
  WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;
  WHATSAPP_STAFF_NUMBER?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_WABA_ID?: string;
  WHATSAPP_TEMPLATE_ID?: string;
  WHATSAPP_TEMPLATE_NAME?: string;
  WHATSAPP_TEMPLATE_LANGUAGE?: string;
  WHATSAPP_TEMPLATE_CATEGORY?: string;
  WHATSAPP_GRAPH_VERSION?: string;
  WHATSAPP_NOTIFY_FROM?: string;
  WHATSAPP_DAILY_ATTEMPT_LIMIT?: string;
}

export const attemptIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const numericId = /^[1-9][0-9]{4,30}$/;
export const utf8 = new TextEncoder();

export function webhookConfig(env: NotificationEnv) {
  if (
    env.LEAD_CAPTURE_ENV !== 'production' ||
    env.WHATSAPP_WEBHOOK_ENABLED !== 'true' ||
    !env.LEADS_DB ||
    !numericId.test(env.WHATSAPP_PHONE_NUMBER_ID ?? '') ||
    !numericId.test(env.WHATSAPP_WABA_ID ?? '') ||
    !/^[1-9][0-9]{7,14}$/.test(env.WHATSAPP_STAFF_NUMBER ?? '') ||
    (env.META_APP_SECRET?.length ?? 0) < 32 ||
    (env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.length ?? 0) < 32
  )
    return;
  return {
    db: env.LEADS_DB,
    sender: env.WHATSAPP_PHONE_NUMBER_ID!,
    waba: env.WHATSAPP_WABA_ID!,
    recipient: env.WHATSAPP_STAFF_NUMBER!,
    appSecret: env.META_APP_SECRET!,
    verifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!,
  };
}

export function sendingConfig(env: NotificationEnv) {
  const common = webhookConfig(env);
  const from = env.WHATSAPP_NOTIFY_FROM ?? '';
  const limit = Number(env.WHATSAPP_DAILY_ATTEMPT_LIMIT);
  if (
    !common ||
    env.WHATSAPP_NOTIFY_ENABLED !== 'true' ||
    (env.WHATSAPP_ACCESS_TOKEN?.length ?? 0) < 20 ||
    !numericId.test(env.WHATSAPP_TEMPLATE_ID ?? '') ||
    !/^[a-z][a-z0-9_]{0,100}$/.test(env.WHATSAPP_TEMPLATE_NAME ?? '') ||
    env.WHATSAPP_TEMPLATE_LANGUAGE !== 'en_US' ||
    !['UTILITY', 'MARKETING'].includes(env.WHATSAPP_TEMPLATE_CATEGORY ?? '') ||
    !/^v[0-9]{2}\.0$/.test(env.WHATSAPP_GRAPH_VERSION ?? '') ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(from) ||
    !Number.isFinite(Date.parse(from)) ||
    new Date(from).toISOString() !== from ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return;
  return {
    ...common,
    token: env.WHATSAPP_ACCESS_TOKEN!,
    templateId: env.WHATSAPP_TEMPLATE_ID!,
    template: env.WHATSAPP_TEMPLATE_NAME!,
    language: env.WHATSAPP_TEMPLATE_LANGUAGE!,
    category: env.WHATSAPP_TEMPLATE_CATEGORY!,
    version: env.WHATSAPP_GRAPH_VERSION!,
    from,
    dailyLimit: limit,
  };
}

export async function configurationHash(
  config: NonNullable<ReturnType<typeof sendingConfig>>,
) {
  // A destination/template/cutoff change must be reviewed, never silently applied
  // to an existing backlog. Credentials can rotate without replaying any job.
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    utf8.encode(
      JSON.stringify([
        config.sender,
        config.waba,
        config.recipient,
        config.templateId,
        config.template,
        config.language,
        config.category,
        config.version,
        config.from,
        config.dailyLimit,
      ]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}

const transientCodes = new Set([130429, 131000, 131016, 131056]);
export function retryableCode(code: unknown): code is number {
  return typeof code === 'number' && transientCodes.has(code);
}
export function retryAt(now: number, attemptNumber: number) {
  return (
    now + [60_000, 300_000, 1_800_000, 7_200_000, 7_200_000][attemptNumber - 1]
  );
}

export function reconcileJob(db: D1Database, leadId: string, now: number) {
  return db
    .prepare(
      `UPDATE whatsapp_outbox SET
    state = CASE
      WHEN EXISTS (SELECT 1 FROM whatsapp_attempts WHERE lead_id = whatsapp_outbox.lead_id AND read_at IS NOT NULL) THEN 'read'
      WHEN EXISTS (SELECT 1 FROM whatsapp_attempts WHERE lead_id = whatsapp_outbox.lead_id AND delivered_at IS NOT NULL) THEN 'delivered'
      ELSE COALESCE((SELECT CASE state
        WHEN 'retryable_failed' THEN CASE WHEN whatsapp_outbox.attempt_count < 5 THEN 'retry' ELSE 'failed' END
        WHEN 'permanent_failed' THEN 'failed' ELSE state END
        FROM whatsapp_attempts WHERE id = whatsapp_outbox.active_attempt_id), state) END,
    next_attempt_at = COALESCE((SELECT retry_at FROM whatsapp_attempts WHERE id = whatsapp_outbox.active_attempt_id), next_attempt_at),
    updated_at = MAX(updated_at, ?)
    WHERE lead_id = ?`,
    )
    .bind(now, leadId);
}

export async function boundedJson(
  response: Response,
  maxBytes = 65_536,
): Promise<unknown> {
  const bytes = await readBoundedBytes(response.body, maxBytes);
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes),
  );
}
export async function readBoundedBytes(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array> {
  if (!body) throw new Error('empty');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error('too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
