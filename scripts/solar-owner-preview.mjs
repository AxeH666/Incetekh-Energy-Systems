// Private loopback harness. Demo by default; approved live mode has persistent caps.
import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { parse, serialize } from 'parse5';
import ts from 'typescript';
import { solarFixture } from '../tests/fixtures/solar.mjs';
import { ownerBudget } from './solar-owner-budget.mjs';
import { ownerLiveProvider } from './solar-owner-live.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = await realpath(resolve(root, 'dist'));
const port = Number(process.env.SOLAR_OWNER_PORT || 4333);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid local port');
const origin = `http://127.0.0.1:${port}`;
const adapter = ts.transpileModule(
  await readFile(resolve(root, 'worker/solar.ts'), 'utf8'),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const { normalizeSolar, fetchSolar } = await import(
  'data:text/javascript;base64,' + Buffer.from(adapter).toString('base64')
);
const synthetic = normalizeSolar(solarFixture());
let live;
let ssMall;
const ssMallMode =
  process.env.SOLAR_OWNER_LIVE === 'approved-2026-10-18-ss-mall';
if (ssMallMode) {
  const folder = resolve(root, '.wrangler/solar-ss-mall');
  const retention = JSON.parse(
    await readFile(resolve(folder, 'retention.json'), 'utf8'),
  );
  const expires = Date.parse(retention.deleteBy);
  if (
    !Number.isFinite(expires) ||
    expires <= Date.now() ||
    expires > Date.now() + 30 * 86400000
  )
    throw new Error('SS Mall review data missing or expired');
  const result = JSON.parse(
    await readFile(resolve(folder, 'roof.json'), 'utf8'),
  );
  const bounds = JSON.parse(
    await readFile(resolve(folder, 'map-bounds.json'), 'utf8'),
  );
  const metadata = JSON.parse(
    await readFile(resolve(folder, 'layers-metadata.json'), 'utf8'),
  );
  const sourceDate = `${metadata.imageryDate.year}-${String(metadata.imageryDate.month).padStart(2, '0')}-${String(metadata.imageryDate.day).padStart(2, '0')}`;
  if (result.status !== 'available' || result.roof.imageryDate !== sourceDate)
    throw new Error('SS Mall imagery does not match roof data');
  result.roofImage = {
    url: '/api/solar-imagery/ss-mall.png',
    imageryDate: sourceDate,
    bounds,
  };
  ssMall = {
    result,
    expires,
    image: await readFile(resolve(folder, 'map-rgb.png')),
  };
}
if (process.env.SOLAR_OWNER_LIVE === 'approved-2026-10-18' || ssMallMode) {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096)
      throw new Error('Private credential input rejected');
  }
  let keys;
  try {
    keys = JSON.parse(input);
  } catch {
    throw new Error('Private credential input unavailable');
  }
  input = '';
  if (
    !/^AIza[0-9A-Za-z_-]{35}$/.test(keys.browserKey) ||
    !/^AIza[0-9A-Za-z_-]{35}$/.test(keys.serverKey)
  )
    throw new Error('Private key format invalid');
  live = ownerLiveProvider(
    keys,
    ownerBudget(
      resolve(
        root,
        ssMallMode
          ? '.wrangler/solar-ss-mall/owner-review'
          : '.wrangler/solar-owner-live',
      ),
    ),
    ssMallMode
      ? async () => ({ status: 'no_coverage', data_available: false })
      : fetchSolar,
    ssMallMode,
  );
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};
function transformHtml(html, nonce) {
  const tree = parse(html);
  function walk(node) {
    if (node.childNodes) {
      node.childNodes = node.childNodes.filter(
        (child) =>
          !(
            child.tagName === 'meta' &&
            child.attrs.some(
              (a) =>
                a.name === 'http-equiv' &&
                a.value.toLowerCase() === 'content-security-policy',
            )
          ),
      );
      node.childNodes.forEach(walk);
    }
    if (node.tagName === 'script' || node.tagName === 'style')
      node.attrs.push({ name: 'nonce', value: nonce });
    if (node.attrs?.some((a) => a.name === 'data-site-visit-form')) {
      const key = node.attrs.find((a) => a.name === 'data-site-key');
      if (key) key.value = 'local-synthetic-widget';
    }
  }
  walk(tree);
  return serialize(tree)
    .replace(
      /(<body[^>]*>)/,
      `$1<div id="owner-preview-notice" role="note">${ssMall ? `Private SS Mall review. Search “SS Mall Proddatur” and select “ss mall, YMR Colony”. Real address lookup; saved Google roof image from ${ssMall.result.roof.imageryDate}. Other roofs are unavailable in this review. ${live.remaining().maps} map loads remain; no new Solar requests or saved enquiries.` : live ? `Private live Google test. Remaining allowance: ${live.remaining().maps} map loads and ${live.remaining().solar} Solar attempts. Address search is disabled. No enquiries or emails are saved or sent.` : 'Private local rehearsal · simulated roof, not satellite imagery. No Google calls, saved enquiries or emails. Choose a capacity below, then “Preview … on my roof”.'}</div>`,
    )
    .replace(
      '</head>',
      `<meta name="robots" content="noindex,nofollow"><style nonce="${nonce}">#owner-preview-notice{padding:14px 24px;background:#fff3d5;color:#302a16;font:600 15px/1.5 sans-serif;border-bottom:2px solid #bb8b29}#solar-map svg{width:100%;height:100%;display:block}</style></head>`,
    );
}
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader(
    'Referrer-Policy',
    live ? 'strict-origin-when-cross-origin' : 'no-referrer',
  );
  const send = (code, body, type = 'application/json') => {
    response.writeHead(code, { 'Content-Type': type });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (
    request.headers.host !== `127.0.0.1:${port}` ||
    (request.headers.origin && request.headers.origin !== origin) ||
    request.headers['sec-fetch-site'] === 'cross-site'
  )
    return send(403, '{}');
  try {
    const url = new URL(request.url, origin);
    if (url.origin !== origin) return send(403, '{}');
    // Refresh-safe saved review: no calculator session or provider bootstrap.
    if (
      ssMall &&
      url.pathname === '/solar-preview/' &&
      live.remaining().maps === 0
    ) {
      response.setHeader('Location', '/__owner/ss-mall/');
      return send(302, '');
    }
    if (url.pathname.startsWith('/__owner/ss-mall/')) {
      if (!ssMall || Date.now() >= ssMall.expires) return send(404, '{}');
      if (!['GET', 'HEAD'].includes(request.method)) return send(405, '{}');
      const captures = {
        '/__owner/ss-mall/before.png': 'saved-before.png',
        '/__owner/ss-mall/with-solar.png': 'saved-with-solar.png',
      };
      if (Object.hasOwn(captures, url.pathname))
        return send(
          200,
          await readFile(
            resolve(root, '.wrangler/solar-ss-mall', captures[url.pathname]),
          ),
          'image/png',
        );
      if (url.pathname !== '/__owner/ss-mall/') return send(404, '{}');
      const nonce = randomBytes(24).toString('base64');
      response.setHeader(
        'Content-Security-Policy',
        `default-src 'none'; img-src 'self'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      );
      return send(
        200,
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SS Mall | Private saved review</title><style nonce="${nonce}">
      *{box-sizing:border-box}body{margin:0;background:#f5f4ee;color:#202722;font:16px/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:28px 20px}header{border-bottom:1px solid #c9cec6;padding:12px 20px;background:#202722;color:white}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;margin:16px 0}p{max-width:800px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:12px}fieldset{border:0;padding:0;margin:24px 0 12px}legend{font-weight:600;margin-bottom:8px}label{display:inline-block;margin-right:20px;cursor:pointer}input{accent-color:#075e54;width:18px;height:18px;vertical-align:middle}figure{margin:16px 0}img{width:100%;height:auto;display:block}#before-image{display:none}main:has(#before:checked) #before-image{display:block}main:has(#before:checked) #solar-image{display:none}figcaption,footer{font-size:14px;color:#475147}a{color:inherit}
      </style></head><body><header>INCETEKH SOLAR - Private review on this computer</header><main><p class="eyebrow">Saved rooftop preview</p><h1>SS Mall, Proddatur</h1><p>5 kW selected / 12 model panels / 4.8 kW modeled capacity</p><p>This saved view reopens without the calculator or another Google request. You can refresh this page. Address search and map navigation are unavailable in this saved review.</p><fieldset><legend>Compare the roof</legend><label><input id="before" type="radio" name="view"> Before</label><label><input id="solar" type="radio" name="view" checked> With solar</label></fieldset><figure><img id="solar-image" src="with-solar.png" alt="Saved Google map view of SS Mall with 12 preliminary model solar panels"><img id="before-image" src="before.png" alt="Saved Google map view of the same SS Mall roof without panel overlays"><figcaption>Saved Google Maps captures. Includes solar data from Google. Roof imagery: 14 January 2023. Map credits remain in each image.</figcaption></figure><footer>Preliminary model only. A site visit must confirm current obstacles, structure and installation layout. <a href="/#solar-planner">Return to calculator</a></footer></main></body></html>`,
        'text/html; charset=utf-8',
      );
    }
    if (url.pathname === '/api/site-visits')
      return send(503, JSON.stringify({ code: 'unavailable' }));
    if (url.pathname === '/api/solar-imagery/ss-mall.png') {
      if (
        !ssMall ||
        Date.now() >= ssMall.expires ||
        !['GET', 'HEAD'].includes(request.method)
      )
        return send(404, '{}');
      return send(200, ssMall.image, 'image/png');
    }
    if (url.pathname === '/api/solar-assessments') {
      if (request.method !== 'POST') return send(405, '{}');
      if (
        request.headers.origin !== origin ||
        !request.headers['content-type']?.startsWith('application/json')
      )
        return send(403, '{}');
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 4096) return send(413, '{}');
      }
      const input = JSON.parse(body);
      if (
        typeof input.latitude !== 'number' ||
        typeof input.longitude !== 'number' ||
        input.latitude < 12 ||
        input.latitude > 20 ||
        input.longitude < 75 ||
        input.longitude > 85
      )
        return send(400, '{}');
      const savedPoint = ssMall?.result.selectedLocation;
      const result = ssMall
        ? Date.now() < ssMall.expires &&
          Math.abs(input.latitude - savedPoint.latitude) < 0.000001 &&
          Math.abs(input.longitude - savedPoint.longitude) < 0.000001
          ? ssMall.result
          : { status: 'no_coverage', data_available: false }
        : live
          ? await live.assess({
              latitude: input.latitude,
              longitude: input.longitude,
            })
          : synthetic;
      return send(
        200,
        JSON.stringify({
          ...result,
          reference: randomUUID(),
          selectedLocation: {
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }),
      );
    }
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, '{}');
    if (url.pathname === '/api/solar-preview-config')
      return send(
        200,
        JSON.stringify({
          enabled: true,
          mapsKey: 'local-synthetic-map',
          turnstileSiteKey: 'local-synthetic-widget',
        }),
      );
    if (url.pathname === '/__owner/allowance')
      return send(
        200,
        JSON.stringify(
          ssMall
            ? { mode: 'ss-mall-review', maps: live.remaining().maps, solar: 0 }
            : live
              ? live.remaining()
              : { mode: 'synthetic', maps: 0, solar: 0 },
        ),
      );
    if (url.pathname === '/__owner/maps.js') {
      if (live) {
        if (request.method !== 'GET') return send(405, '{}');
        const script = live.mapScript();
        return send(
          script ? 200 : 429,
          script ?? 'window.gm_authFailure?.();',
          'application/javascript',
        );
      }
      return send(
        200,
        await readFile(resolve(root, 'scripts/solar-owner-map.js'), 'utf8'),
        'application/javascript',
      );
    }
    if (url.pathname === '/__owner/turnstile.js')
      return send(
        200,
        `const widgets={};window.turnstile={render:(_el,o)=>{widgets[o.action]=o;o.callback('local-synthetic-'+o.action);return o.action;},reset:(id)=>widgets[id]?.callback('local-synthetic-'+id)};`,
        'application/javascript',
      );
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes('\\') || decoded.includes('\0'))
      return send(404, '{}');
    let file = resolve(dist, '.' + decoded);
    if (decoded.endsWith('/')) file = resolve(file, 'index.html');
    file = await realpath(file);
    if (!file.startsWith(dist + sep)) return send(404, '{}');
    const extension = extname(file);
    if (!mime[extension]) return send(404, '{}');
    let body = await readFile(file);
    if (extension === '.html') {
      const nonce = randomBytes(24).toString('base64');
      response.setHeader(
        'Content-Security-Policy',
        live
          ? `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' blob:; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; img-src 'self' blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com data: blob:; frame-src https://*.google.com; worker-src blob:`
          : `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-src 'none'`,
      );
      body = transformHtml(body.toString(), nonce);
    } else if (extension === '.js') {
      // Rewrite responses only, never build artifacts or deployed code.
      body = body
        .toString()
        .replaceAll(
          'https://maps.googleapis.com/maps/api/js',
          origin + '/__owner/maps.js',
        )
        .replaceAll(
          'https://challenges.cloudflare.com/turnstile/v0/api.js',
          origin + '/__owner/turnstile.js',
        );
    }
    send(200, body, mime[extension]);
  } catch {
    send(404, '{}');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Private ${ssMall ? 'SS Mall review (3 Maps cap; saved Solar roof and matching imagery)' : live ? 'approved live Google test (persistent 3 Maps / 1 Solar cap)' : 'synthetic rehearsal (no external calls)'}: ${origin}/#solar-planner`,
  ),
);
