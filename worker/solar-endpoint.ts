import {
  coordinates,
  fetchSolar,
  readBoundedJson,
  unavailable,
  type SolarResult,
} from './solar.js';
import {
  fetchSolarImagery,
  SolarImageryError,
  type SolarRaster,
} from './solar-imagery.js';

export interface SolarEnv {
  SOLAR_PREVIEW_ENABLED?: string;
  SOLAR_MATCHED_IMAGERY_ENABLED?: string;
  SOLAR_ALLOWED_ORIGIN?: string;
  SOLAR_API_KEY?: string;
  SOLAR_DAILY_LIMIT?: string;
  SOLAR_MONTHLY_LIMIT?: string;
  SOLAR_RATE_LIMIT?: RateLimit;
  LEADS_DB?: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  RATE_LIMIT_KEY_SECRET?: string;
}
function reply(result: SolarResult, status: number, extra = {}) {
  return Response.json(
    { ...result, ...extra },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        ...(status === 405 ? { Allow: 'POST' } : {}),
        ...(status === 429 ? { 'Retry-After': '60' } : {}),
      },
    },
  );
}
function limit(value: string | undefined, max: number) {
  // Explicit owner-selected mode; missing or malformed limits still fail closed.
  if (value === 'unlimited') return null;
  if (!value || !/^[1-9][0-9]*$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : 0;
}
export function solarConfigured(
  env: SolarEnv,
): env is SolarEnv &
  Required<
    Pick<
      SolarEnv,
      | 'LEADS_DB'
      | 'SOLAR_RATE_LIMIT'
      | 'SOLAR_API_KEY'
      | 'TURNSTILE_SECRET_KEY'
      | 'RATE_LIMIT_KEY_SECRET'
    >
  > {
  return Boolean(
    limit(env.SOLAR_DAILY_LIMIT, 50) !== 0 &&
    limit(env.SOLAR_MONTHLY_LIMIT, 300) !== 0 &&
    env.LEADS_DB &&
    env.SOLAR_RATE_LIMIT &&
    env.SOLAR_API_KEY &&
    env.TURNSTILE_SECRET_KEY &&
    !/^[123]x0+AA$/.test(env.TURNSTILE_SECRET_KEY) &&
    env.RATE_LIMIT_KEY_SECRET &&
    env.RATE_LIMIT_KEY_SECRET.length >= 32,
  );
}

// Both counters change in ONE SQLite statement. Failed outbound attempts are
// intentionally not refunded. This table contains no locations or Google data.
export async function reserveSolar(
  db: D1Database,
  daily: number | null,
  monthly: number | null,
) {
  const result = await db
    .prepare(
      `
    INSERT INTO solar_usage (id, day, month, daily_count, monthly_count)
    VALUES (1, strftime('%Y-%m-%d', 'now'), strftime('%Y-%m', 'now'), 1, 1)
    ON CONFLICT(id) DO UPDATE SET
      day = excluded.day, month = excluded.month,
      daily_count = CASE WHEN solar_usage.day = excluded.day THEN solar_usage.daily_count + 1 ELSE 1 END,
      monthly_count = CASE WHEN solar_usage.month = excluded.month THEN solar_usage.monthly_count + 1 ELSE 1 END
    WHERE (? IS NULL OR solar_usage.day <> excluded.day OR solar_usage.daily_count < ?)
      AND (? IS NULL OR solar_usage.month <> excluded.month OR solar_usage.monthly_count < ?)
  `,
    )
    .bind(daily, daily, monthly, monthly)
    .run();
  if (!result.success) throw new Error('unavailable');
  return result.meta.changes === 1;
}

export async function solarEndpoint(
  request: Request,
  env: SolarEnv,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.search) return reply(unavailable('invalid_input'), 400);
  if (request.method !== 'POST')
    return reply(unavailable('invalid_input'), 405);
  if (env.SOLAR_PREVIEW_ENABLED !== 'true')
    return reply(unavailable('disabled'), 503);
  const origin = env.SOLAR_ALLOWED_ORIGIN;
  if (
    !origin ||
    (origin !== 'https://incetekhenergy.com' &&
      !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(origin)) ||
    origin === 'https://incetekh-energy-systems.incetekhenergy.workers.dev' ||
    url.origin !== origin ||
    request.headers.get('Origin') !== origin
  )
    return reply(unavailable('invalid_input'), 403);
  const daily = limit(env.SOLAR_DAILY_LIMIT, 50);
  const monthly = limit(env.SOLAR_MONTHLY_LIMIT, 300);
  if (!solarConfigured(env))
    return reply(unavailable('provider_configuration_failure'), 503);
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    return reply(unavailable('invalid_input'), 415);
  if (Number(request.headers.get('Content-Length')) > 4096)
    return reply(unavailable('invalid_input'), 413);
  try {
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return reply(unavailable('transient_failure'), 503);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.RATE_LIMIT_KEY_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const hash = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(
        'solar:' + new Date().toISOString().slice(0, 10) + ':' + ip,
      ),
    );
    const rateKey = Array.from(new Uint8Array(hash), (v) =>
      v.toString(16).padStart(2, '0'),
    ).join('');
    if (!(await env.SOLAR_RATE_LIMIT.limit({ key: rateKey })).success)
      return reply(unavailable('throttled'), 429);
    let point;
    let token;
    try {
      const input = (await readBoundedJson(request.body, 4096)) as Record<
        string,
        unknown
      >;
      if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input) ||
        Object.keys(input).some(
          (k) => !['latitude', 'longitude', 'token'].includes(k),
        )
      )
        throw new Error('invalid');
      point = coordinates(input);
      // Broad Andhra Pradesh / neighbouring service-area envelope. Not a claim of
      // exact state boundaries or service eligibility; a physical visit confirms it.
      if (
        point.latitude < 12 ||
        point.latitude > 20 ||
        point.longitude < 75 ||
        point.longitude > 85
      )
        throw new Error('invalid');
      token = input.token;
      if (typeof token !== 'string' || !token || token.length > 2048)
        throw new Error('invalid');
    } catch (error) {
      return reply(
        unavailable('invalid_input'),
        error instanceof Error && error.message === 'too_large' ? 413 : 400,
      );
    }
    const verification = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      },
    );
    if (!verification.ok) {
      await verification.body?.cancel();
      return reply(unavailable('transient_failure'), 503);
    }
    const verified = (await readBoundedJson(verification.body, 8192)) as Record<
      string,
      unknown
    >;
    if (
      verified?.success !== true ||
      verified.hostname !== url.hostname ||
      verified.action !== 'solar_assessment'
    )
      return reply(unavailable('invalid_input'), 422);
    if (!(await reserveSolar(env.LEADS_DB, daily, monthly)))
      return reply(unavailable('budget_exhausted'), 429);
    const started = Date.now();
    let result = await fetchSolar(point, env.SOLAR_API_KEY);
    let roofRaster: SolarRaster | undefined;
    let imageryFailure:
      | {
          imageryStage: string;
          imageryReason: string;
          providerHttpStatus?: number;
        }
      | undefined;
    if (
      result.status === 'available' &&
      env.SOLAR_MATCHED_IMAGERY_ENABLED === 'true'
    ) {
      const bounds = result.roof.bounds;
      if (
        point.latitude < bounds.sw.latitude ||
        point.latitude > bounds.ne.latitude ||
        point.longitude < bounds.sw.longitude ||
        point.longitude > bounds.ne.longitude
      ) {
        result = unavailable('roof_mismatch');
      } else {
        try {
          roofRaster = await fetchSolarImagery(result.roof, env.SOLAR_API_KEY);
        } catch (error) {
          result = unavailable('imagery_unavailable');
          if (error instanceof SolarImageryError)
            imageryFailure = {
              imageryStage: error.stage,
              imageryReason: error.reason,
              providerHttpStatus: error.httpStatus,
            };
        }
      }
    }
    // No request URL, error text, key, IP, coordinates, token or content in logs.
    console.log(
      JSON.stringify({
        event: 'solar_attempt',
        status: result.status,
        latencyMs: Date.now() - started,
        ...imageryFailure,
      }),
    );
    return reply(
      result,
      result.status === 'throttled'
        ? 429
        : ['transient_failure', 'provider_configuration_failure'].includes(
              result.status,
            )
          ? 503
          : 200,
      {
        reference: crypto.randomUUID(),
        selectedLocation: point,
        ...(roofRaster ? { roofRaster } : {}),
      },
    );
  } catch {
    return reply(unavailable('transient_failure'), 503);
  }
}
