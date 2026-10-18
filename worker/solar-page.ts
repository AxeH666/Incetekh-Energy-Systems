import { solarConfigured, type SolarEnv } from './solar-endpoint.js';

export interface SolarPageEnv extends SolarEnv {
  ASSETS: Fetcher;
  SOLAR_MAPS_BROWSER_KEY?: string;
  SOLAR_TURNSTILE_SITE_KEY?: string;
}
function enabled(env: SolarPageEnv, url: URL) {
  return (
    env.SOLAR_PREVIEW_ENABLED === 'true' &&
    env.SOLAR_ALLOWED_ORIGIN === url.origin &&
    url.protocol === 'https:' &&
    (url.origin === 'https://incetekhenergy.com' ||
      /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.origin)) &&
    url.hostname !== 'incetekh-energy-systems.incetekhenergy.workers.dev' &&
    Boolean(env.SOLAR_MAPS_BROWSER_KEY && env.SOLAR_TURNSTILE_SITE_KEY) &&
    solarConfigured(env)
  );
}
export function solarConfig(request: Request, env: SolarPageEnv) {
  const url = new URL(request.url);
  const ready = enabled(env, url);
  return Response.json(
    request.method === 'GET' && !url.search && ready
      ? {
          enabled: true,
          mapsKey: env.SOLAR_MAPS_BROWSER_KEY,
          turnstileSiteKey: env.SOLAR_TURNSTILE_SITE_KEY,
        }
      : { enabled: false },
    {
      status: request.method === 'GET' ? 200 : 405,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
export async function solarPage(request: Request, env: SolarPageEnv) {
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response(null, {
      status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
    });
  const url = new URL(request.url);
  if (url.pathname === '/solar-preview')
    return Response.redirect(url.origin + '/solar-preview/', 308);
  const asset = await env.ASSETS.fetch(
    new Request(url.origin + '/solar-preview/', request),
  );
  const response = new Response(asset.body, asset);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!enabled(env, url) || !asset.ok) return response;
  const nonce = crypto.randomUUID().replaceAll('-', '');
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' blob:; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; img-src 'self' blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com data:; connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com https://challenges.cloudflare.com data: blob:; font-src 'self' https://fonts.gstatic.com; frame-src https://*.google.com https://challenges.cloudflare.com; worker-src blob:`,
  );
  return new HTMLRewriter()
    .on('meta', {
      element(element) {
        if (
          element.getAttribute('http-equiv')?.toLowerCase() ===
          'content-security-policy'
        )
          element.remove();
      },
    })
    .on('script', {
      element(element) {
        element.setAttribute('nonce', nonce);
      },
    })
    .on('style', {
      element(element) {
        element.setAttribute('nonce', nonce);
      },
    })
    .on('head', {
      element(element) {
        element.append(`<style nonce="${nonce}"></style>`, { html: true });
      },
    })
    .transform(response);
}
