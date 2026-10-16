import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function readConfig(file) {
  const { config, error } = ts.parseConfigFileTextToJson(
    file,
    await readFile(file, 'utf8'),
  );
  assert.equal(error, undefined, `${file} must parse as JSONC`);
  return config;
}

test('preview application and migration target the same approved non-production DB', async () => {
  const app = await readConfig('wrangler.jsonc');
  const migration = await readConfig('wrangler.preview-migrations.jsonc');
  const previewId = 'e38a341f-de7f-48be-9195-917c9695b13a';
  const productionId = 'e5db446c-699e-4e19-8db0-816a3b83f3ad';
  assert.notEqual(previewId, productionId);
  assert.equal(app.previews.d1_databases.length, 1);
  assert.equal(migration.d1_databases.length, 1);
  assert.equal(app.previews.d1_databases[0].binding, 'LEADS_DB');
  assert.equal(migration.d1_databases[0].binding, 'PREVIEW_DB');
  for (const db of [app.previews.d1_databases[0], migration.d1_databases[0]]) {
    assert.equal(db.database_id, previewId);
    assert.equal(db.database_name, 'incetekh-site-visits-preview');
    assert.equal(db.migrations_dir, 'migrations');
  }
  assert.equal(JSON.stringify(migration).includes(productionId), false);
  assert.equal(migration.main, undefined);
  assert.equal(migration.build, undefined);
});

test('production activation keeps preview disabled and separates data and rate namespaces', async () => {
  const app = await readConfig('wrangler.jsonc');
  assert.equal(app.vars.LEAD_CAPTURE_ENABLED, 'true');
  assert.equal(app.vars.LEAD_CAPTURE_ENV, 'production');
  assert.equal(app.vars.LEAD_ALLOWED_ORIGIN, 'https://incetekhenergy.com');
  assert.equal(app.previews.vars.LEAD_CAPTURE_ENABLED, 'false');
  assert.equal(app.d1_databases.length, 1);
  assert.equal(app.d1_databases[0].binding, 'LEADS_DB');
  assert.equal(
    app.d1_databases[0].database_id,
    'e5db446c-699e-4e19-8db0-816a3b83f3ad',
  );
  assert.notEqual(
    app.d1_databases[0].database_id,
    app.previews.d1_databases[0].database_id,
  );
  assert.equal(app.ratelimits.length, 1);
  assert.equal(app.ratelimits[0].name, 'LEAD_RATE_LIMIT');
  assert.notEqual(
    app.ratelimits[0].namespace_id,
    app.previews.ratelimits[0].namespace_id,
  );
  assert.deepEqual(app.ratelimits[0].simple, { limit: 5, period: 60 });
  assert.equal(app.previews.vars.LEAD_CAPTURE_ENV, 'preview');
  assert.equal(
    app.previews.vars.LEAD_ALLOWED_ORIGIN,
    'https://feat-site-visit-lead-capture-incetekh-energy-systems.incetekhenergy.workers.dev',
  );
  const limiter = app.previews.ratelimits;
  assert.equal(limiter.length, 1);
  assert.equal(limiter[0].name, 'LEAD_RATE_LIMIT');
  assert.match(limiter[0].namespace_id, /^[1-9][0-9]*$/);
  assert.deepEqual(limiter[0].simple, { limit: 5, period: 60 });
  for (const vars of [app.vars, app.previews.vars]) {
    assert.equal(vars.TURNSTILE_SECRET_KEY, undefined);
    assert.equal(vars.RATE_LIMIT_KEY_SECRET, undefined);
    assert.equal(vars.WHATSAPP_NOTIFY_ENABLED, 'false');
    assert.equal(vars.WHATSAPP_WEBHOOK_ENABLED, 'false');
    for (const name of [
      'WHATSAPP_ACCESS_TOKEN',
      'META_APP_SECRET',
      'WHATSAPP_STAFF_NUMBER',
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    ]) {
      assert.equal(vars[name], undefined);
    }
  }
  assert.equal(
    app.triggers,
    undefined,
    'No schedule is deployed before approval',
  );
});
