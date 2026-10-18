import { test, expect } from '@playwright/test';
import { footprintsOnMask } from '../src/lib/solar-roof-mask';

test('every touched cell is checked including holes between sample points and edges', () => {
  const mask = new Uint8Array(40 * 40).fill(1);
  const panel: [number, number][][] = [
    [
      [4.1, 4.1],
      [24.9, 4.1],
      [24.9, 14.9],
      [4.1, 14.9],
    ],
  ];
  expect(footprintsOnMask(panel, 40, 40, mask)).toBe(true);
  mask[5 * 40 + 5] = 0; // A 9x9 sampler would skip this cell.
  expect(footprintsOnMask(panel, 40, 40, mask)).toBe(false);
  mask.fill(1);
  mask[14 * 40 + 24] = 0;
  expect(footprintsOnMask(panel, 40, 40, mask)).toBe(false);
});
test('rotated footprint ignores disjoint corner cells but rejects intersected cells', () => {
  const mask = new Uint8Array(20 * 20).fill(1);
  const panel: [number, number][][] = [
    [
      [10, 3.2],
      [16.8, 10],
      [10, 16.8],
      [3.2, 10],
    ],
  ];
  mask[3 * 20 + 3] = 0;
  expect(footprintsOnMask(panel, 20, 20, mask)).toBe(true);
  mask[10 * 20 + 10] = 0;
  expect(footprintsOnMask(panel, 20, 20, mask)).toBe(false);
  expect(
    footprintsOnMask(
      [
        [
          [0, 0],
          [2, 2],
          [0, 2],
          [2, 0],
        ],
      ],
      20,
      20,
      mask,
    ),
  ).toBe(false);
  expect(
    footprintsOnMask(
      [
        [
          [0, 0],
          [1000, 0],
          [1000, 1000],
          [0, 1000],
        ],
      ],
      20,
      20,
      mask,
    ),
  ).toBe(false);
});
