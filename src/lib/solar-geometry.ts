import type { SolarRoof } from '../../worker/solar';

export interface MapPoint {
  lat: number;
  lng: number;
}
const radians = Math.PI / 180;
const earthRadius = 6378137;

// Small local tangent-plane displacement, metres east/north -> geographic point.
// Suitable for a panel footprint, not surveying or large-area projection.
export function offsetPoint(
  center: MapPoint,
  east: number,
  north: number,
): MapPoint {
  if (
    ![center.lat, center.lng, east, north].every(Number.isFinite) ||
    Math.abs(center.lat) > 85
  )
    throw new Error('Invalid panel coordinates');
  return {
    lat: center.lat + north / earthRadius / radians,
    lng:
      center.lng +
      east / (earthRadius * Math.cos(center.lat * radians)) / radians,
  };
}

export function panelCorners(roof: SolarRoof, index: number): MapPoint[] {
  const panel = roof.panels[index];
  if (!panel) throw new Error('Missing panel');
  const segment = roof.segments[panel.segmentIndex];
  if (
    !segment ||
    ![roof.panelHeightMeters, roof.panelWidthMeters].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    !Number.isFinite(segment.pitchDegrees) ||
    segment.pitchDegrees < 0 ||
    segment.pitchDegrees >= 90 ||
    !Number.isFinite(segment.azimuthDegrees) ||
    !['PORTRAIT', 'LANDSCAPE'].includes(panel.orientation)
  )
    throw new Error('Unusable panel geometry');
  // Portrait's LONG axis points down the roof slope. Landscape swaps the axes.
  // Only the axis along the slope is shortened in an overhead projection.
  const along =
    (panel.orientation === 'PORTRAIT'
      ? roof.panelHeightMeters
      : roof.panelWidthMeters) * Math.cos(segment.pitchDegrees * radians);
  const across =
    panel.orientation === 'PORTRAIT'
      ? roof.panelWidthMeters
      : roof.panelHeightMeters;
  const bearing = segment.azimuthDegrees * radians;
  const center = { lat: panel.center.latitude, lng: panel.center.longitude };
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => {
    const downhill = (a * along) / 2,
      cross = (b * across) / 2;
    return offsetPoint(
      center,
      downhill * Math.sin(bearing) + cross * Math.cos(bearing),
      downhill * Math.cos(bearing) - cross * Math.sin(bearing),
    );
  });
}

export function configurationPaths(
  roof: SolarRoof,
  panelsCount: number,
): MapPoint[][] {
  if (
    !Number.isInteger(panelsCount) ||
    !roof.configurations.some((c) => c.panelsCount === panelsCount) ||
    panelsCount > roof.panels.length
  )
    throw new Error('Use a returned configuration');
  return Array.from({ length: panelsCount }, (_, index) =>
    panelCorners(roof, index),
  );
}
