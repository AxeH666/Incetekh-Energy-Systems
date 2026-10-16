import { type NotificationEnv } from './notification-config.js';
import { dispatchNotifications } from './notifications.js';
import { whatsappWebhook, processStatusEvents } from './whatsapp-webhook.js';

interface Env extends NotificationEnv {
  ASSETS: Fetcher;
  LEADS_DB?: D1Database;
  LEAD_RATE_LIMIT?: RateLimit;
  LEAD_CAPTURE_ENABLED?: string;
  LEAD_CAPTURE_ENV?: string;
  LEAD_ALLOWED_ORIGIN?: string;
  TURNSTILE_SECRET_KEY?: string;
  RATE_LIMIT_KEY_SECRET?: string;
}

const endpoint = '/api/site-visits';
const privacyVersion = '2026-10-16';
const encoder = new TextEncoder();
const fields = [
  'id',
  'fullName',
  'phone',
  'email',
  'location',
  'plan',
  'language',
  'token',
];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const invalidText = /[\u0000-\u001f\u007f]/;

function reply(status: number, code: string, id?: string) {
  return new Response(JSON.stringify({ code, ...(id ? { id } : {}) }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
      ...(status === 405 ? { Allow: 'POST' } : {}),
    },
  });
}

// Enforce the size cap while reading, including requests without Content-Length.
async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new Error('too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes),
  );
}

function validate(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).some((key) => !fields.includes(key))) return;
  if (fields.some((key) => typeof obj[key] !== 'string')) return;
  const value = obj as Record<(typeof fields)[number], string>;
  const fullName = value.fullName.trim();
  const location = value.location.trim();
  const email = value.email.trim();
  const phone = value.phone.trim();
  if (
    !uuid.test(value.id) ||
    !fullName ||
    fullName.length > 100 ||
    invalidText.test(fullName) ||
    !location ||
    location.length > 200 ||
    invalidText.test(location) ||
    !/^(?:\+91\s?)?[6-9][0-9]{9}$/.test(phone) ||
    email.length > 254 ||
    invalidText.test(email) ||
    (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !['3kw', '5kw', '7kw', '10plus', 'water-heater', 'advice'].includes(
      value.plan,
    ) ||
    !['en', 'te', 'hi', 'ta', 'ml', 'kn'].includes(value.language) ||
    value.token.length > 2048
  )
    return;
  return {
    id: value.id,
    fullName,
    phone: '+91' + phone.slice(-10),
    email,
    location,
    plan: value.plan,
    language: value.language,
    token: value.token,
  };
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

function allowedOrigin(env: Env) {
  if (env.LEAD_CAPTURE_ENV === 'production')
    return env.LEAD_ALLOWED_ORIGIN === 'https://incetekhenergy.com'
      ? env.LEAD_ALLOWED_ORIGIN
      : undefined;
  // One exact preview hostname, never a wildcard or the production alias.
  if (
    env.LEAD_CAPTURE_ENV === 'preview' &&
    /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(
      env.LEAD_ALLOWED_ORIGIN ?? '',
    ) &&
    env.LEAD_ALLOWED_ORIGIN !==
      'https://incetekh-energy-systems.incetekhenergy.workers.dev'
  )
    return env.LEAD_ALLOWED_ORIGIN;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      (async () => {
        try {
          await processStatusEvents(env);
          await dispatchNotifications(env);
        } catch {
          console.error(
            'WhatsApp status processing deferred; saved enquiries are unaffected.',
          );
        }
      })(),
    );
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/whatsapp/webhook')
      return whatsappWebhook(request, env);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname !== endpoint || url.search) return reply(404, 'not_found');
    if (request.method !== 'POST') return reply(405, 'method_not_allowed');
    const origin = allowedOrigin(env);
    if (
      !origin ||
      url.origin !== origin ||
      request.headers.get('Origin') !== origin
    )
      return reply(403, 'forbidden');
    if (
      env.LEAD_CAPTURE_ENABLED !== 'true' ||
      !env.LEADS_DB ||
      !env.LEAD_RATE_LIMIT ||
      !env.TURNSTILE_SECRET_KEY ||
      /^[123]x0+AA$/.test(env.TURNSTILE_SECRET_KEY) ||
      !env.RATE_LIMIT_KEY_SECRET ||
      env.RATE_LIMIT_KEY_SECRET.length < 32
    )
      return reply(503, 'unavailable');
    if (
      request.headers
        .get('Content-Type')
        ?.split(';')[0]
        .trim()
        .toLowerCase() !== 'application/json'
    )
      return reply(415, 'invalid_content_type');
    if (Number(request.headers.get('Content-Length')) > 8192)
      return reply(413, 'too_large');
    try {
      // Cloudflare supplies this header. No X-Forwarded-For fallback.
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return reply(503, 'unavailable');
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.RATE_LIMIT_KEY_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const day = new Date().toISOString().slice(0, 10);
      const rateKey = hex(
        await crypto.subtle.sign('HMAC', key, encoder.encode(day + ':' + ip)),
      );
      if (!(await env.LEAD_RATE_LIMIT.limit({ key: rateKey })).success)
        return reply(429, 'rate_limited');
      let input: unknown;
      try {
        input = await readBody(request);
      } catch (error) {
        return reply(
          error instanceof Error && error.message === 'too_large' ? 413 : 400,
          'invalid_request',
        );
      }
      const lead = validate(input);
      if (!lead) return reply(400, 'invalid_request');
      const { id, token, ...payload } = lead;
      const hash = hex(
        await crypto.subtle.digest(
          'SHA-256',
          encoder.encode(JSON.stringify(payload)),
        ),
      );
      const existing = await env.LEADS_DB.prepare(
        'SELECT payload_hash FROM site_visit_leads WHERE id = ?',
      )
        .bind(id)
        .first<{ payload_hash: string }>();
      if (existing)
        return existing.payload_hash === hash
          ? reply(200, 'received', id)
          : reply(409, 'conflict');
      if (!token) return reply(422, 'security_check');
      let verified: { success?: boolean; hostname?: string; action?: string };
      try {
        const result = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: env.TURNSTILE_SECRET_KEY,
              response: token,
            }),
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!result.ok) return reply(503, 'unavailable');
        verified = await result.json();
      } catch {
        return reply(503, 'unavailable');
      }
      if (
        verified.success !== true ||
        verified.hostname !== url.hostname ||
        verified.action !== 'site_visit'
      )
        return reply(422, 'security_check');
      // Bound SQL and a UNIQUE key make concurrent retries safe. Only this ID is deduplicated.
      const inserted = await env.LEADS_DB.prepare(
        `INSERT INTO site_visit_leads
        (id, created_at, full_name, phone, email, location, plan, language, payload_hash, privacy_notice_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
      )
        .bind(
          id,
          new Date().toISOString(),
          lead.fullName,
          lead.phone,
          lead.email || null,
          lead.location,
          lead.plan,
          lead.language,
          hash,
          privacyVersion,
        )
        .run();
      if (!inserted.success) return reply(503, 'unavailable');
      if (inserted.meta.changes === 1) return reply(201, 'received', id);
      const saved = await env.LEADS_DB.prepare(
        'SELECT payload_hash FROM site_visit_leads WHERE id = ?',
      )
        .bind(id)
        .first<{ payload_hash: string }>();
      if (!saved) return reply(503, 'unavailable');
      return saved.payload_hash === hash
        ? reply(200, 'received', id)
        : reply(409, 'conflict');
    } catch {
      // Never log request bodies, tokens, database errors or identifying values.
      return reply(503, 'unavailable');
    }
  },
};
