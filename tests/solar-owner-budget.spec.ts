import { test, expect } from '@playwright/test';
import { mkdtemp, readFile, writeFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import { ownerBudget } from '../scripts/solar-owner-budget.mjs';
import { ownerLiveProvider } from '../scripts/solar-owner-live.mjs';

test('owner live budget persists and caps Maps/Solar attempts without external calls', async () => {
  const folder = await mkdtemp('.wrangler/owner-budget-test-');
  let calls = 0;
  const budget = ownerBudget(folder);
  const live = ownerLiveProvider(
    { browserKey: 'synthetic-browser', serverKey: 'synthetic-server' },
    budget,
    async (point: unknown, key: string) => {
      calls++;
      expect(point).toEqual({ latitude: 15, longitude: 79 });
      expect(key).toBe('synthetic-server');
      return { status: 'transient_failure', data_available: false };
    },
  );
  const script = live.mapScript()!;
  expect(script).not.toContain('synthetic-server');
  let bootstrap: any;
  const api = { importLibrary: async (_name: string) => 'native library' };
  let ready = 0;
  const window = {
    incetekhMapsReady: () => ready++,
    incetekhOwnerMapsReady: () => {},
  };
  vm.runInNewContext(script, {
    window,
    google: { maps: api },
    document: {
      currentScript: { nonce: 'synthetic-nonce' },
      createElement: () => ({}),
      head: {
        append: (node: any) => {
          bootstrap = node;
        },
      },
    },
    Error,
    Promise,
  });
  expect(new URL(bootstrap.src).origin).toBe('https://maps.googleapis.com');
  expect(new URL(bootstrap.src).searchParams.get('key')).toBe(
    'synthetic-browser',
  );
  expect(bootstrap.nonce).toBe('synthetic-nonce');
  window.incetekhOwnerMapsReady();
  expect(ready).toBe(1);
  await expect(api.importLibrary('places')).rejects.toThrow(
    'Address search disabled',
  );
  expect(live.mapScript()).toBeTruthy();
  expect(live.mapScript()).toBeTruthy();
  expect(live.mapScript()).toBeNull();
  expect(await live.assess({ latitude: 15, longitude: 79 })).toMatchObject({
    status: 'transient_failure',
  });
  expect(await live.assess({ latitude: 15, longitude: 79 })).toMatchObject({
    status: 'budget_exhausted',
  });
  expect(calls).toBe(1);
  expect(ownerBudget(folder).remaining()).toEqual({ maps: 0, solar: 0 });
  expect(
    await readFile(join(folder, 'approved-2026-10-18-budget.json'), 'utf8'),
  ).not.toContain('synthetic-');
});
test('owner budget corruption and concurrent lock fail closed', async () => {
  const folder = await mkdtemp('.wrangler/owner-budget-test-');
  const budget = ownerBudget(folder);
  const path = join(folder, 'approved-2026-10-18-budget.json');
  const lock = await open(path + '.lock', 'wx');
  try {
    expect(() => budget.reserve('solar')).toThrow();
  } finally {
    await lock.close();
  }
  const corrupted = await mkdtemp('.wrangler/owner-budget-test-');
  const corruptBudget = ownerBudget(corrupted);
  await writeFile(join(corrupted, 'approved-2026-10-18-budget.json'), '{}');
  expect(() => corruptBudget.reserve('maps')).toThrow();
});
