import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewWorker } from '../support/solar-preview-worker.mjs';

test('enabled page rewrites actual built HTML with fresh nonce and no conflicting static CSP', async () => {
  const mf = previewWorker();
  try {
    const first = await mf.dispatchFetch(
      'https://incetekhenergy.com/solar-preview/',
    );
    const second = await mf.dispatchFetch(
      'https://incetekhenergy.com/solar-preview/',
    );
    const policy = first.headers.get('content-security-policy');
    assert.match(policy, /strict-dynamic/);
    assert.notEqual(second.headers.get('content-security-policy'), policy);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    const nonce = policy.match(/nonce-([^']+)/)[1];
    const html = await first.text();
    assert.equal(/http-equiv="content-security-policy"/i.test(html), false);
    for (const script of html.matchAll(/<script\b[^>]*>/g))
      assert.ok(script[0].includes(`nonce="${nonce}"`));
    assert.ok(html.includes(`<style nonce="${nonce}"></style>`));
    const config = await (
      await mf.dispatchFetch(
        'https://incetekhenergy.com/api/solar-preview-config',
      )
    ).json();
    assert.equal(config.enabled, true);
    assert.equal(JSON.stringify(config).includes('private'), false);
    assert.equal(
      (
        await (
          await mf.dispatchFetch(
            'https://incetekh-energy-systems.incetekhenergy.workers.dev/api/solar-preview-config',
          )
        ).json()
      ).enabled,
      false,
    );
  } finally {
    await mf.dispose();
  }
});
test('disabled or missing browser configuration exposes no key and retains site CSP', async () => {
  for (const patch of [
    { SOLAR_PREVIEW_ENABLED: 'false' },
    { SOLAR_MAPS_BROWSER_KEY: '' },
    { SOLAR_ALLOWED_ORIGIN: 'https://other.example' },
    { SOLAR_DAILY_LIMIT: '0' },
    { SOLAR_MONTHLY_LIMIT: '301' },
    { RATE_LIMIT_KEY_SECRET: 'short' },
    { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' },
  ]) {
    const mf = previewWorker(patch);
    try {
      const config = await (
        await mf.dispatchFetch(
          'https://incetekhenergy.com/api/solar-preview-config',
        )
      ).json();
      assert.deepEqual(config, { enabled: false });
      const response = await mf.dispatchFetch(
        'https://incetekhenergy.com/solar-preview/',
      );
      assert.equal(response.headers.get('content-security-policy'), null);
      assert.match(
        await response.text(),
        /http-equiv="content-security-policy"/i,
      );
    } finally {
      await mf.dispose();
    }
  }
});
