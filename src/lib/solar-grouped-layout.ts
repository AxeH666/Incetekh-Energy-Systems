import type { SolarRoof } from '../../worker/solar';
import { panelCorners } from './solar-geometry';

// Visual concept only. Reuses provider candidate locations at their real dimensions.
// A surrounding candidate ring is a conservative model filter, NOT a setback rule.
export function groupedLayout(roof: SolarRoof, count: number): number[] | null {
  if (
    !Number.isSafeInteger(count) ||
    count < 4 ||
    count > 100 ||
    roof.panels.length > 10000
  )
    return null;
  const shapes: [number, number][] = [];
  for (let rows = 2; rows <= count / 2; rows++)
    if (count % rows === 0) shapes.push([rows, count / rows]);
  if (!shapes.length) return null;
  const groups = new Map<string, number[]>();
  roof.panels.forEach((p, i) => {
    const key = `${p.segmentIndex}:${p.orientation}`;
    const indices = groups.get(key) ?? [];
    indices.push(i);
    groups.set(key, indices);
  });
  let remainingChecks = 100_000;
  let best: { indices: number[]; score: number } | undefined;
  for (const indices of groups.values()) {
    if (indices.length < count) continue;
    const first = roof.panels[indices[0]],
      segment = roof.segments[first.segmentIndex];
    if (!segment || segment.pitchDegrees < 2 || segment.pitchDegrees >= 60)
      continue; // Near-flat azimuth is undefined; do not invent an array bearing.
    const angle = (segment.azimuthDegrees * Math.PI) / 180;
    const along =
      (first.orientation === 'PORTRAIT'
        ? roof.panelHeightMeters
        : roof.panelWidthMeters) *
      Math.cos((segment.pitchDegrees * Math.PI) / 180);
    const across =
      first.orientation === 'PORTRAIT'
        ? roof.panelWidthMeters
        : roof.panelHeightMeters;
    if (![along, across].every((n) => Number.isFinite(n) && n > 0.1)) continue;
    const points = indices.map((index) => {
      const p = roof.panels[index].center;
      const e =
        (((p.longitude - first.center.longitude) * Math.PI) / 180) *
        6378137 *
        Math.cos((first.center.latitude * Math.PI) / 180);
      const n =
        (((p.latitude - first.center.latitude) * Math.PI) / 180) * 6378137;
      return {
        index,
        x: e * Math.cos(angle) - n * Math.sin(angle),
        y: e * Math.sin(angle) + n * Math.cos(angle),
      };
    });
    const byIndex = new Map(points.map((p) => [p.index, p]));
    // Spatial buckets keep lookup bounded for large model roofs.
    const tolerance = Math.min(0.12, Math.min(along, across) * 0.1);
    const buckets = new Map<string, typeof points>();
    for (const p of points) {
      const key = `${Math.floor(p.x / tolerance)}:${Math.floor(p.y / tolerance)}`;
      const cell = buckets.get(key) ?? [];
      cell.push(p);
      buckets.set(key, cell);
    }
    function at(x: number, y: number) {
      const cx = Math.floor(x / tolerance),
        cy = Math.floor(y / tolerance);
      let found: (typeof points)[number] | undefined;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const p of buckets.get(`${cx + dx}:${cy + dy}`) ?? []) {
            if (--remainingChecks < 0) return undefined;
            if (
              Math.hypot(p.x - x, p.y - y) <= tolerance &&
              (!found || p.index < found.index)
            )
              found = p;
          }
      return found;
    }
    for (const [rows, columns] of shapes) {
      const aspect = Math.max(
        (rows * along) / (columns * across),
        (columns * across) / (rows * along),
      );
      if (aspect > 2.5) continue;
      for (const anchor of points) {
        remainingChecks -= (rows + 2) * (columns + 2);
        if (remainingChecks < 0) return best?.indices ?? null;
        const selected: number[] = [];
        let valid = true;
        // Include an intact one-cell ring, rejecting holes and boundary candidates.
        for (let r = -1; r <= rows && valid; r++)
          for (let c = -1; c <= columns; c++) {
            const p = at(anchor.x + c * across, anchor.y + r * along);
            if (!p) {
              valid = false;
              break;
            }
            if (r >= 0 && r < rows && c >= 0 && c < columns)
              selected.push(p.index);
          }
        if (!valid || new Set(selected).size !== count) continue;
        // Reject substantial overlap, allowing up to 3 cm provider coordinate rounding.
        // This is below imagery resolution and is NOT a mounting-clearance allowance.
        const overlaps = selected.some((index, i) =>
          selected.slice(i + 1).some((other) => {
            if (--remainingChecks < 0) return true;
            const a = byIndex.get(index)!,
              b = byIndex.get(other)!;
            return (
              Math.abs(a.x - b.x) < across - 0.03 &&
              Math.abs(a.y - b.y) < along - 0.03
            );
          }),
        );
        if (overlaps) continue;
        remainingChecks -= selected.length * 4;
        if (remainingChecks < 0) return best?.indices ?? null;
        try {
          selected.forEach((index) => panelCorners(roof, index));
        } catch {
          continue;
        }
        const energy = selected.reduce(
          (sum, index) => sum + roof.panels[index].yearlyEnergyDcKwh,
          0,
        );
        const score = energy / aspect;
        if (Number.isFinite(score) && (!best || score > best.score))
          best = { indices: selected, score };
      }
    }
  }
  return best?.indices ?? null;
}
