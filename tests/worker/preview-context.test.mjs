import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  previewContext,
  contextEmail,
} from '../../.wrangler/test-worker/preview-context.js';
import { contextFixture } from '../fixtures/preview-context.mjs';
test('preview context is strictly bounded, consented customer input only', () => {
  assert.deepEqual(previewContext(contextFixture()), contextFixture());
  for (const patch of [
    { consent: false },
    { consent: 'true' },
    { version: 2 },
    { bill: 2501 },
    { bill: 50100 },
    { targetKw: 5 },
    { residential: 'yes' },
    { latitude: NaN },
    { longitude: 99 },
    { longitude: 67 },
    { latitude: 5 },
    { latitude: 39 },
    { preferredContact: ['phone'] },
    { preferredContact: 'sms' },
    { reference: 'not-a-reference' },
    { calculatorVersion: 'other' },
    { address: 'Google address' },
    { panels: [] },
    { yearlyEnergyDcKwh: 4800 },
  ])
    assert.equal(previewContext({ ...contextFixture(), ...patch }), undefined);
  assert.equal(previewContext(null), undefined);
  assert.deepEqual(contextEmail('{invalid'), []);
  assert.deepEqual(
    contextEmail(JSON.stringify({ ...contextFixture(), consent: false })),
    [],
  );
  assert.deepEqual(
    contextEmail(JSON.stringify({ ...contextFixture(), roof: {} })),
    [],
  );
  const email = contextEmail(JSON.stringify(contextFixture())).join('\n');
  assert.match(email, /Bill-based target: 3 kW/);
  assert.doesNotMatch(email, /annual|DC|AC generation|geometry|solarPanels/);
});

test('consented context accepts wider India locations without changing existing receipt values', () => {
  for (const point of [
    { latitude: 13.33467, longitude: 74.74617 },
    { latitude: 28.61, longitude: 77.21 },
    { latitude: 11.62, longitude: 92.73 },
    { latitude: 26.14, longitude: 91.74 },
  ]) {
    const context = { ...contextFixture(), ...point };
    assert.deepEqual(previewContext(context), context);
    assert.match(
      contextEmail(JSON.stringify(context)).join('\n'),
      new RegExp(String(point.latitude)),
    );
  }
});
