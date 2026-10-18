type Pixel = [number, number];

// Check every mask cell touched by a convex panel footprint, including internal
// holes. The small pixel margin makes boundary/rounding uncertainty conservative.
export function footprintsOnMask(
  paths: Pixel[][],
  width: number,
  height: number,
  data: Uint8Array,
) {
  if (!paths.length || paths.length > 10000 || data.length !== width * height)
    return false;
  let work = 0;
  for (const path of paths) {
    if (path.length !== 4 || path.flat().some((v) => !Number.isFinite(v)))
      return false;
    const axes: Pixel[] = [
      [1, 0],
      [0, 1],
    ];
    let direction = 0;
    for (let i = 0; i < 4; i++) {
      const p = path[i],
        q = path[(i + 1) % 4],
        r = path[(i + 2) % 4];
      const dx = q[0] - p[0],
        dy = q[1] - p[1],
        length = Math.hypot(dx, dy);
      const cross = dx * (r[1] - q[1]) - dy * (r[0] - q[0]);
      if (
        length < 0.001 ||
        Math.abs(cross) < 0.000001 ||
        (direction && Math.sign(cross) !== direction)
      )
        return false;
      direction = Math.sign(cross);
      axes.push([-dy / length, dx / length]);
    }
    const ranges = axes.map(([x, y]) => {
      const values = path.map((p) => p[0] * x + p[1] * y);
      return [Math.min(...values) - 0.01, Math.max(...values) + 0.01];
    });
    const left = Math.floor(ranges[0][0]),
      right = Math.floor(ranges[0][1]),
      top = Math.floor(ranges[1][0]),
      bottom = Math.floor(ranges[1][1]);
    if (
      left < 0 ||
      top < 0 ||
      right >= width ||
      bottom >= height ||
      (right - left + 1) * (bottom - top + 1) > 4096
    )
      return false;
    for (let row = top; row <= bottom; row++)
      for (let col = left; col <= right; col++) {
        if (++work > 2_000_000) return false;
        if (data[row * width + col] === 1) continue;
        // Separating axis test: a zero cell is harmless only if it is disjoint.
        const disjoint = axes.some(([x, y], i) => {
          const a = col * x + row * y,
            b = (col + 1) * x + row * y,
            c = (col + 1) * x + (row + 1) * y,
            d = col * x + (row + 1) * y;
          return (
            Math.max(a, b, c, d) < ranges[i][0] ||
            Math.min(a, b, c, d) > ranges[i][1]
          );
        });
        if (!disjoint) return false;
      }
  }
  return true;
}
