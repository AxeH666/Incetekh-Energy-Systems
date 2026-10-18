import { test, expect } from '@playwright/test';
import { groupedLayout } from '../src/lib/solar-grouped-layout';
import { panelCorners, offsetPoint } from '../src/lib/solar-geometry';
import { createSolarMap, type MapsApi } from '../src/lib/solar-map';
import { gridRoof } from './fixtures/grouped-roof';
test('grouped concepts reuse a complete interior block at physical model size without mutating the provider order', () => {
  const roof = gridRoof(),
    original = JSON.stringify(roof);
  const indices = groupedLayout(roof, 12)!;
  expect(indices).toHaveLength(12);
  expect(new Set(indices).size).toBe(12);
  expect(new Set(indices.map((i) => roof.panels[i].segmentIndex)).size).toBe(1);
  expect(
    indices.every(
      (i) =>
        i % 8 > 0 &&
        i % 8 < 7 &&
        Math.floor(i / 8) > 0 &&
        Math.floor(i / 8) < 7,
    ),
  ).toBe(true);
  expect(JSON.stringify(roof)).toBe(original);
  const xs = new Set(indices.map((i) => i % 8)),
    ys = new Set(indices.map((i) => Math.floor(i / 8)));
  expect(xs.size * ys.size).toBe(12);
});
test('unknown flat-roof bearing, incomplete grids, unsupported counts and incompatible segments have no grouped claim', () => {
  const roof = gridRoof();
  roof.segments[0].pitchDegrees = 0;
  expect(groupedLayout(roof, 12)).toBeNull();
  const sparse = gridRoof();
  sparse.panels = sparse.panels.filter((_, i) => i % 2 === 0);
  expect(groupedLayout(sparse, 12)).toBeNull();
  for (const n of [0, 5, 101, NaN])
    expect(groupedLayout(gridRoof(), n)).toBeNull();
  const mixed = gridRoof();
  mixed.segments.push({ ...mixed.segments[0] });
  mixed.panels.forEach((p, i) => (p.segmentIndex = i % 2));
  expect(groupedLayout(mixed, 12)).toBeNull();
});
test('closer view changes the camera only and grouped replacement preserves candidate geometry', () => {
  const roof = gridRoof(),
    indices = groupedLayout(roof, 12)!;
  let fitted: any;
  const drawn: any[] = [];
  const api = {
    Map: class {
      fitBounds(bounds: any) {
        fitted = bounds;
      }
    },
    Polygon: class {
      constructor(options: any) {
        drawn.push(options.paths);
      }
      setMap() {}
    },
  } as unknown as MapsApi;
  const view = createSolarMap({} as HTMLElement, api, { lat: 15, lng: 79 });
  view.show(roof, 12, indices);
  const original = JSON.stringify(drawn);
  view.focusPanels();
  expect(drawn).toEqual(indices.map((i) => panelCorners(roof, i)));
  expect(JSON.stringify(drawn)).toBe(original);
  expect(fitted.north - fitted.south).toBeLessThan(
    roof.bounds.ne.latitude - roof.bounds.sw.latitude,
  );
  expect(fitted.west).toBeLessThan(Math.min(...drawn.flat().map((p) => p.lng)));
  view.clear();
  const last = fitted;
  view.focusPanels();
  expect(fitted).toBe(last);
  expect(() => view.show(roof, 12, [0, 0])).toThrow();
});

test('large or colliding provider grids stay bounded for interactive use', () => {
  const roof = gridRoof();
  roof.panels = Array.from({ length: 10000 }, (_, i) => {
    const p = offsetPoint(
      { lat: 15, lng: 79 },
      (i % 100) * 2,
      Math.floor(i / 100) * Math.cos((10 * Math.PI) / 180),
    );
    return { ...roof.panels[0], center: { latitude: p.lat, longitude: p.lng } };
  });
  const start = performance.now();
  const result = groupedLayout(roof, 100);
  expect(result).toHaveLength(100);
  expect(performance.now() - start).toBeLessThan(1500);
  roof.panels.forEach((p) => (p.center = { latitude: 15, longitude: 79 }));
  const collidingStart = performance.now();
  expect(groupedLayout(roof, 100)).toBeNull();
  expect(performance.now() - collidingStart).toBeLessThan(1500);
});
