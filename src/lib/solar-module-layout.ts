import type { SolarRoof } from '../../worker/solar';
import { groupedLayout } from './solar-grouped-layout';
import { offsetPoint, panelCorners, type MapPoint } from './solar-geometry';

// Documented reference hardware, not an inventory, partnership or supply promise.
export const referenceModule = {
  name: 'Waaree AHNAY Bi-55-550',
  watts: 550,
  lengthMeters: 2.272,
  widthMeters: 1.133,
  source:
    'https://waaree.com/upload/media/datasheet_bi_55_520_550_12_03012025_1756379026.pdf',
  checked: '2026-10-18',
  gapMeters: 0.02,
  patchInsetMeters: 0.25,
} as const;
export function moduleCount(targetKw: number) {
  if (!Number.isFinite(targetKw) || targetKw <= 0) return null;
  const count = Math.max(
    1,
    Math.round((targetKw * 1000) / referenceModule.watts),
  );
  return count <= 40 ? count : null;
}
export interface ModuleConcept {
  paths: MapPoint[][];
  count: number;
  capacityKw: number;
  rows: number;
  columns: number;
  segmentIndex: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
}
// Fit a fresh module grid inside an intact provider-candidate rectangle. The outer
// candidate ring and 25 cm inset are model filters, not verified roof setbacks.
// No provider yield is assigned to these new positions/dimensions.
export function moduleLayout(
  roof: SolarRoof,
  targetKw: number,
): ModuleConcept | null {
  const count = moduleCount(targetKw);
  if (!count) return null;
  const sourceArea = roof.panelHeightMeters * roof.panelWidthMeters;
  if (!Number.isFinite(sourceArea) || sourceArea <= 0) return null;
  const desired = Math.max(
    12,
    Math.ceil(
      (((count * referenceModule.lengthMeters * referenceModule.widthMeters) /
        sourceArea) *
        1.05) /
        4,
    ) * 4,
  );
  for (const patchSize of [desired, desired + 4, desired + 8]) {
    if (patchSize > 100) continue;
    const patch = groupedLayout(roof, patchSize);
    if (!patch) continue;
    const anchor = roof.panels[patch[0]],
      segment = roof.segments[anchor.segmentIndex];
    const angle = (segment.azimuthDegrees * Math.PI) / 180,
      cosPitch = Math.cos((segment.pitchDegrees * Math.PI) / 180);
    const sourceAlong =
      (anchor.orientation === 'PORTRAIT'
        ? roof.panelHeightMeters
        : roof.panelWidthMeters) * cosPitch;
    const sourceAcross =
      anchor.orientation === 'PORTRAIT'
        ? roof.panelWidthMeters
        : roof.panelHeightMeters;
    const origin = {
      lat: anchor.center.latitude,
      lng: anchor.center.longitude,
    };
    const local = patch.map((index) => {
      const c = roof.panels[index].center;
      const e =
          (((c.longitude - origin.lng) * Math.PI) / 180) *
          6378137 *
          Math.cos((origin.lat * Math.PI) / 180),
        n = (((c.latitude - origin.lat) * Math.PI) / 180) * 6378137;
      return {
        x: e * Math.cos(angle) - n * Math.sin(angle),
        y: e * Math.sin(angle) + n * Math.cos(angle),
      };
    });
    const inset = referenceModule.patchInsetMeters;
    const left = Math.min(...local.map((p) => p.x)) - sourceAcross / 2 + inset,
      right = Math.max(...local.map((p) => p.x)) + sourceAcross / 2 - inset;
    const bottom = Math.min(...local.map((p) => p.y)) - sourceAlong / 2 + inset,
      top = Math.max(...local.map((p) => p.y)) + sourceAlong / 2 - inset;
    let best:
      | {
          orientation: 'PORTRAIT' | 'LANDSCAPE';
          rows: number;
          columns: number;
          across: number;
          along: number;
          width: number;
          height: number;
          score: number;
        }
      | undefined;
    for (const orientation of ['PORTRAIT', 'LANDSCAPE'] as const) {
      const across =
        orientation === 'PORTRAIT'
          ? referenceModule.widthMeters
          : referenceModule.lengthMeters;
      const along =
        (orientation === 'PORTRAIT'
          ? referenceModule.lengthMeters
          : referenceModule.widthMeters) * cosPitch;
      for (let columns = 1; columns <= count; columns++) {
        const rows = Math.ceil(count / columns),
          width = columns * across + (columns - 1) * referenceModule.gapMeters,
          height =
            rows * along + (rows - 1) * referenceModule.gapMeters * cosPitch;
        if (width > right - left || height > top - bottom) continue;
        const score =
          Math.max(width / height, height / width) +
          (rows * columns - count) * 0.1;
        if (!best || score < best.score)
          best = {
            orientation,
            rows,
            columns,
            across,
            along,
            width,
            height,
            score,
          };
      }
    }
    if (!best) continue;
    const { rows, columns, orientation, across, along, width, height } = best;
    const centers = Array.from({ length: count }, (_, i) => {
      const x =
        (left + right - width) / 2 +
        across / 2 +
        (i % columns) * (across + referenceModule.gapMeters);
      const y =
        (bottom + top - height) / 2 +
        along / 2 +
        Math.floor(i / columns) *
          (along + referenceModule.gapMeters * cosPitch);
      return offsetPoint(
        origin,
        x * Math.cos(angle) + y * Math.sin(angle),
        -x * Math.sin(angle) + y * Math.cos(angle),
      );
    });
    // Geometry-only copy. Never feed this conceptual roof to yield/lead calculations.
    const geometry: SolarRoof = {
      ...roof,
      panelHeightMeters: referenceModule.lengthMeters,
      panelWidthMeters: referenceModule.widthMeters,
      panels: centers.map((p) => ({
        center: { latitude: p.lat, longitude: p.lng },
        segmentIndex: anchor.segmentIndex,
        orientation,
        yearlyEnergyDcKwh: 0,
      })),
    };
    const paths = centers.map((_, i) => panelCorners(geometry, i));
    if (
      paths
        .flat()
        .some(
          (p) =>
            p.lat < roof.bounds.sw.latitude ||
            p.lat > roof.bounds.ne.latitude ||
            p.lng < roof.bounds.sw.longitude ||
            p.lng > roof.bounds.ne.longitude,
        )
    )
      continue;
    return {
      paths,
      count,
      capacityKw: (count * referenceModule.watts) / 1000,
      rows,
      columns,
      segmentIndex: anchor.segmentIndex,
      orientation,
    };
  }
  return null;
}
