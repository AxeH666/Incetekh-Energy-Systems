// Local-only manual harness, never part of the Astro deployment. No provider calls.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { solarFixture } from '../tests/fixtures/solar.mjs';

const root = new URL('../', import.meta.url);
const compile = async (path) =>
  ts.transpileModule(await readFile(new URL(path, root), 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const adapter = await compile('worker/solar.ts');
const { normalizeSolar } = await import(
  'data:text/javascript;base64,' + Buffer.from(adapter).toString('base64')
);
const mock = process.env.SOLAR_ALIGNMENT_SYNTHETIC === 'true';
let roof;
if (mock) roof = normalizeSolar(solarFixture());
else if (process.env.SOLAR_ALIGNMENT_ROOF) {
  // Caller must confirm the file's licensed cache deadline before starting.
  const expiry = Date.parse(process.env.SOLAR_ALIGNMENT_EXPIRES ?? '');
  if (!Number.isFinite(expiry) || expiry <= Date.now())
    throw new Error('A valid approved cache expiry is required');
  roof = normalizeSolar(
    JSON.parse(await readFile(process.env.SOLAR_ALIGNMENT_ROOF, 'utf8')),
  );
}
const files = {
  '/client.js': 'scripts/solar-alignment-client.ts',
  '/src/lib/solar-map.js': 'src/lib/solar-map.ts',
  '/src/lib/solar-geometry.js': 'src/lib/solar-geometry.ts',
};
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (
    request.method !== 'GET' ||
    !/^127\.0\.0\.1:\d+$/.test(request.headers.host ?? '')
  ) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (request.url === '/') {
      const nonce = randomBytes(24).toString('base64');
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader(
        'Content-Security-Policy',
        `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' blob:; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; img-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com data:; connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com data: blob:; font-src https://fonts.gstatic.com; frame-src https://*.google.com; worker-src blob:`,
      );
      let html = (
        await readFile(new URL('scripts/solar-alignment.html', root), 'utf8')
      ).replaceAll('NONCE_VALUE', nonce);
      if (mock)
        html = html.replace(
          'Local rooftop alignment proof',
          'SYNTHETIC TEST — no real property evidence',
        );
      response.end(html);
      return;
    }
    if (request.url === '/roof') {
      if (!roof?.data_available) {
        response.writeHead(503).end();
        return;
      }
      if (
        !mock &&
        Date.parse(process.env.SOLAR_ALIGNMENT_EXPIRES) <= Date.now()
      ) {
        response.writeHead(410).end();
        return;
      }
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(roof));
      return;
    }
    if (Object.hasOwn(files, request.url)) {
      response.setHeader('Content-Type', 'application/javascript');
      response.end(await compile(files[request.url]));
      return;
    }
    response.writeHead(404).end();
  } catch {
    response.writeHead(500).end();
  }
});
server.listen(
  Number(process.env.SOLAR_ALIGNMENT_PORT || 4332),
  '127.0.0.1',
  () =>
    console.log(
      'Local alignment harness ready on loopback. No Google requests made.',
    ),
);
