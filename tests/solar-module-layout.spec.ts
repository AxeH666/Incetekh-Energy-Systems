import { test, expect } from '@playwright/test';
import {
  moduleLayout,
  moduleCount,
  referenceModule,
} from '../src/lib/solar-module-layout';
import { offsetPoint } from '../src/lib/solar-geometry';
import { gridRoof } from './fixtures/grouped-roof';
test('documented module dimensions are fixed and capacity changes the count', () => {
  expect(referenceModule.watts).toBe(550);
  expect(referenceModule.lengthMeters).toBe(2.272);
  expect(referenceModule.widthMeters).toBe(1.133);
  expect([3, 5, 7, 10].map(moduleCount)).toEqual([5, 9, 13, 18]);
  for (const n of [NaN, 0, -1, 100]) expect(moduleCount(n)).toBeNull();
});
test('reference layout uses true physical dimensions, consistent rows and positive gaps without changing Google yield', () => {
  const roof = gridRoof(),
    before = JSON.stringify(roof),
    layout = moduleLayout(roof, 5)!;
  expect(layout.count).toBe(9);
  expect(layout.capacityKw).toBe(4.95);
  expect(layout.rows * layout.columns).toBe(9);
  const cos = Math.cos((10 * Math.PI) / 180);
  const project = (p: { lat: number; lng: number }) => ({
    x:
      (((p.lng - 79) * Math.PI) / 180) *
      6378137 *
      Math.cos((15 * Math.PI) / 180),
    y: (((p.lat - 15) * Math.PI) / 180) * 6378137,
  });
  const polygons = layout.paths.map((path) => path.map(project));
  const across = layout.orientation === 'LANDSCAPE' ? 2.272 : 1.133,
    along = (layout.orientation === 'LANDSCAPE' ? 1.133 : 2.272) * cos;
  const extents = polygons.map((p) => ({
    left: Math.min(...p.map((v) => v.x)),
    right: Math.max(...p.map((v) => v.x)),
    bottom: Math.min(...p.map((v) => v.y)),
    top: Math.max(...p.map((v) => v.y)),
  }));
  for (const box of extents) {
    expect(box.right - box.left).toBeCloseTo(across, 4);
    expect(box.top - box.bottom).toBeCloseTo(along, 4);
  }
  for (let i = 0; i < extents.length; i++)
    for (let j = i + 1; j < extents.length; j++) {
      const a = extents[i],
        b = extents[j];
      expect(
        a.right <= b.left + 1e-4 ||
          b.right <= a.left + 1e-4 ||
          a.top <= b.bottom + 1e-4 ||
          b.top <= a.bottom + 1e-4,
      ).toBe(true);
    }
  expect(extents[1].left - extents[0].right).toBeCloseTo(0.02, 4);
  expect(JSON.stringify(roof)).toBe(before);
});
test('unsupported roof patch or unknown flat roof orientation fails closed', () => {
  const roof = gridRoof();
  roof.segments[0].pitchDegrees = 0;
  expect(moduleLayout(roof, 5)).toBeNull();
  const tiny = gridRoof();
  tiny.panels = tiny.panels.slice(0, 8);
  expect(moduleLayout(tiny, 5)).toBeNull();
  const bounded = gridRoof();
  bounded.bounds.ne.latitude = 15.000001;
  expect(moduleLayout(bounded, 5)).toBeNull();
});

test('rotated steep roofs preserve a 20 mm gap measured on the roof plane', () => {
  const roof = gridRoof(),
    angle = (37 * Math.PI) / 180,
    pitch = (59 * Math.PI) / 180;
  roof.segments = [{ pitchDegrees: 59, azimuthDegrees: 37 }];
  roof.panels = Array.from({ length: 144 }, (_, i) => {
    const x = (i % 12) * 2,
      y = Math.floor(i / 12) * Math.cos(pitch);
    const p = offsetPoint(
      { lat: 15, lng: 79 },
      x * Math.cos(angle) + y * Math.sin(angle),
      -x * Math.sin(angle) + y * Math.cos(angle),
    );
    return { ...roof.panels[0], center: { latitude: p.lat, longitude: p.lng } };
  });
  const layout = moduleLayout(roof, 5)!;
  expect(layout).not.toBeNull();
  const box = layout.paths
    .map((path) =>
      path.map((p) => {
        const e =
            (((p.lng - 79) * Math.PI) / 180) *
            6378137 *
            Math.cos((15 * Math.PI) / 180),
          n = (((p.lat - 15) * Math.PI) / 180) * 6378137;
        return {
          x: e * Math.cos(angle) - n * Math.sin(angle),
          y: (e * Math.sin(angle) + n * Math.cos(angle)) / Math.cos(pitch),
        };
      }),
    )
    .map((p) => ({
      bottom: Math.min(...p.map((v) => v.y)),
      top: Math.max(...p.map((v) => v.y)),
    }));
  expect(box[layout.columns].bottom - box[0].top).toBeCloseTo(0.02, 3);
  expect(box[0].top - box[0].bottom).toBeCloseTo(
    layout.orientation === 'LANDSCAPE' ? 1.133 : 2.272,
    3,
  );
});
