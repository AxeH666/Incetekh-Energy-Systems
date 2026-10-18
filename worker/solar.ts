// Google content is transient. Never persist this contract in D1 or email.
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface SolarRoof {
  center: Coordinates;
  bounds: { sw: Coordinates; ne: Coordinates };
  imageryDate: string;
  imageryProcessedDate: string | null;
  imageryQuality: 'HIGH' | 'MEDIUM' | 'BASE';
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  segments: { pitchDegrees: number; azimuthDegrees: number }[];
  panels: {
    center: Coordinates;
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    segmentIndex: number;
    yearlyEnergyDcKwh: number;
  }[];
  configurations: { panelsCount: number; yearlyEnergyDcKwh: number }[];
}
export type SolarResult =
  | { status: 'available'; data_available: true; roof: SolarRoof }
  | {
      status:
        | 'no_coverage'
        | 'unusable_geometry'
        | 'roof_mismatch'
        | 'imagery_unavailable'
        | 'invalid_input'
        | 'throttled'
        | 'budget_exhausted'
        | 'provider_configuration_failure'
        | 'transient_failure'
        | 'disabled';
      data_available: false;
    };

export function unavailable(
  status: Exclude<SolarResult['status'], 'available'>,
): SolarResult {
  return { status, data_available: false };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error('invalid');
  return value;
}
export function coordinates(value: unknown): Coordinates {
  const point = object(value);
  return {
    latitude: number(point.latitude, -85, 85),
    longitude: number(point.longitude, -180, 180),
  };
}
function date(value: unknown): string {
  const input = object(value);
  const year = number(input.year, 2000, 2100);
  const month = number(input.month, 1, 12);
  const day = number(input.day, 1, 31);
  if (![year, month, day].every(Number.isInteger)) throw new Error('invalid');
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getTime() > Date.now()
  )
    throw new Error('invalid');
  return parsed.toISOString().slice(0, 10);
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || !value.length || value.length > max)
    throw new Error('invalid');
  return value;
}
function inside(point: Coordinates, bounds: SolarRoof['bounds']) {
  return (
    point.latitude >= bounds.sw.latitude &&
    point.latitude <= bounds.ne.latitude &&
    point.longitude >= bounds.sw.longitude &&
    point.longitude <= bounds.ne.longitude
  );
}

// Reject the whole layout if any candidate is malformed: filtering/reordering would
// break Google's rule that a configuration uses the FIRST N returned panels.
export function normalizeSolar(value: unknown): SolarResult {
  try {
    const data = object(value);
    const potential = object(data.solarPotential);
    const box = object(data.boundingBox);
    const bounds = { sw: coordinates(box.sw), ne: coordinates(box.ne) };
    if (
      bounds.sw.latitude >= bounds.ne.latitude ||
      bounds.sw.longitude >= bounds.ne.longitude ||
      bounds.ne.latitude - bounds.sw.latitude > 0.1 ||
      bounds.ne.longitude - bounds.sw.longitude > 0.1
    )
      throw new Error('invalid');
    const center = coordinates(data.center);
    if (!inside(center, bounds)) throw new Error('invalid');
    const quality = data.imageryQuality;
    if (quality !== 'HIGH' && quality !== 'MEDIUM' && quality !== 'BASE')
      throw new Error('invalid');
    const segments = array(potential.roofSegmentStats, 1000).map((item) => {
      const segment = object(item);
      return {
        pitchDegrees: number(segment.pitchDegrees, 0, 89),
        azimuthDegrees: number(segment.azimuthDegrees, 0, 360),
      };
    });
    const panels: SolarRoof['panels'] = array(potential.solarPanels, 10000).map(
      (item) => {
        const panel = object(item);
        const center = coordinates(panel.center);
        const segmentIndex = number(panel.segmentIndex, 0, segments.length - 1);
        if (!Number.isInteger(segmentIndex) || !inside(center, bounds))
          throw new Error('invalid');
        const orientation = panel.orientation;
        if (orientation !== 'PORTRAIT' && orientation !== 'LANDSCAPE')
          throw new Error('invalid');
        return {
          center,
          segmentIndex,
          orientation,
          yearlyEnergyDcKwh: number(panel.yearlyEnergyDcKwh, 0, 100000),
        };
      },
    );
    let previous = 0;
    const configurations = array(potential.solarPanelConfigs, 10000).map(
      (item) => {
        const config = object(item);
        const panelsCount = number(config.panelsCount, 1, panels.length);
        if (!Number.isInteger(panelsCount) || panelsCount <= previous)
          throw new Error('invalid');
        previous = panelsCount;
        return {
          panelsCount,
          yearlyEnergyDcKwh: number(config.yearlyEnergyDcKwh, 0.01, 100000000),
        };
      },
    );
    return {
      status: 'available',
      data_available: true,
      roof: {
        center,
        bounds,
        imageryQuality: quality,
        imageryDate: date(data.imageryDate),
        imageryProcessedDate:
          data.imageryProcessedDate == null
            ? null
            : date(data.imageryProcessedDate),
        panelCapacityWatts: number(potential.panelCapacityWatts, 1, 2000),
        panelHeightMeters: number(potential.panelHeightMeters, 0.1, 5),
        panelWidthMeters: number(potential.panelWidthMeters, 0.1, 5),
        segments,
        panels,
        configurations,
      },
    };
  } catch {
    return unavailable('unusable_geometry');
  }
}

export async function readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<unknown> {
  if (!body) throw new Error('invalid');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes),
  );
}

export async function fetchSolar(
  point: Coordinates,
  key: string,
): Promise<SolarResult> {
  const url = new URL(
    'https://solar.googleapis.com/v1/buildingInsights:findClosest',
  );
  url.searchParams.set('location.latitude', String(point.latitude));
  url.searchParams.set('location.longitude', String(point.longitude));
  url.searchParams.set('requiredQuality', 'BASE');
  try {
    const response = await fetch(url, {
      headers: { 'X-Goog-Api-Key': key },
      signal: AbortSignal.timeout(10000),
      redirect: 'manual',
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404) return unavailable('no_coverage');
      if (response.status === 429) return unavailable('throttled');
      if ([400, 401, 403].includes(response.status))
        return unavailable('provider_configuration_failure');
      return unavailable('transient_failure');
    }
    return normalizeSolar(await readBoundedJson(response.body, 2_000_000));
  } catch {
    return unavailable('transient_failure');
  }
}
