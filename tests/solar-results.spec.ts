import { test, expect } from '@playwright/test';
import { rooftopResults } from '../src/lib/solar-results';
import {
  parseSolarSession,
  sessionLifetime,
  billEstimate,
  planForTarget,
} from '../src/lib/solar-session';
import { solarFixture } from './fixtures/solar.mjs';
import { normalizeSolar } from '../worker/solar';

test('returned configurations select nearest capacity, tie down and use one model consistently', () => {
  const result = normalizeSolar(solarFixture());
  if (result.status !== 'available') throw new Error('Fixture unavailable');
  const roof = result.roof;
  expect(rooftopResults(roof, 2.4)).toMatchObject({
    panelsCount: 4,
    capacityKw: 1.6,
    annualDc: 2400,
    annualAc: 2040,
    monthlyAc: 170,
    monthlyValue: 1360,
    limited: false,
  });
  expect(rooftopResults(roof, 3)).toMatchObject({
    panelsCount: 8,
    capacityKw: 3.2,
    annualDc: 4800,
    annualAc: 4080,
    monthlyValue: 2720,
  });
  expect(rooftopResults(roof, 53)).toMatchObject({
    panelsCount: 8,
    limited: true,
    maximumKw: 3.2,
  });
  expect(rooftopResults(roof, 1)?.panelsCount).toBe(4);
  expect(rooftopResults(roof, 3, 4)?.annualDc).toBe(2400);
  expect(rooftopResults(roof, 3, 6)).toBeNull();
  expect(rooftopResults({ ...roof, configurations: [] }, 3)).toBeNull();
  expect(
    rooftopResults(
      { ...roof, configurations: [{ panelsCount: 1, yearlyEnergyDcKwh: 600 }] },
      1,
    ),
  ).toMatchObject({ capacityKw: 0.4, panelsCount: 1, limited: true });
  expect(
    rooftopResults(
      { ...roof, configurations: [{ panelsCount: 9, yearlyEnergyDcKwh: 600 }] },
      3,
    ),
  ).toBeNull();
  expect(rooftopResults({ ...roof, panelCapacityWatts: NaN }, 3)).toBeNull();
  expect(
    rooftopResults(
      { ...roof, configurations: [...roof.configurations].reverse() },
      2.4,
    )?.panelsCount,
  ).toBe(4);
});
test('enquiry prefill never rounds an unsupported bill target into a sold plan', () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 53].map(planForTarget)).toEqual([
    'advice',
    'advice',
    '3kw',
    'advice',
    '5kw',
    'advice',
    '7kw',
    'advice',
    'advice',
    '10plus',
    '10plus',
  ]);
});
test('session accepts only current bounded calculator inputs and recomputes existing target', () => {
  const now = Date.now();
  const valid = {
    version: 1,
    createdAt: now,
    bill: 50000,
    residential: false,
    language: 'te',
  };
  const parse = (value: unknown) =>
    parseSolarSession(JSON.stringify(value), now);
  expect(billEstimate(parse(valid)!)).toMatchObject({ kw: 53, subsidy: 0 });
  for (const patch of [
    { version: 2 },
    { createdAt: now - sessionLifetime },
    { createdAt: now + 1 },
    { bill: 0 },
    { bill: 50100 },
    { bill: NaN },
    { bill: 2501 },
    { residential: 'yes' },
    { language: 'xx' },
    { latitude: 15 },
    { target: 3 },
  ])
    expect(parse({ ...valid, ...patch })).toBeNull();
  expect(parseSolarSession('invalid')).toBeNull();
  expect(parseSolarSession(null)).toBeNull();
});
