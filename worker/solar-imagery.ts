import { readBoundedJson, type SolarRoof } from './solar.js';

export interface SolarRaster {
  kind: 'geotiff';
  imageryDate: string;
  rgb: string;
  mask: string;
}

function assetUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 16384)
    throw new Error('image');
  const url = new URL(value);
  if (
    url.origin !== 'https://solar.googleapis.com' ||
    url.pathname !== '/v1/geoTiff:get' ||
    url.username ||
    url.password ||
    url.hash ||
    !url.searchParams.get('id') ||
    [...url.searchParams.keys()].some((key) => key !== 'id')
  )
    throw new Error('image');
  return url;
}

async function raster(url: URL, key: string, signal: AbortSignal) {
  const response = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key },
    redirect: 'manual',
    signal,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error('image');
  }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4_000_000) {
        await reader.cancel();
        throw new Error('image');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  if (
    size < 8 ||
    !(
      (bytes[0] === 73 &&
        bytes[1] === 73 &&
        bytes[2] === 42 &&
        bytes[3] === 0) ||
      (bytes[0] === 77 && bytes[1] === 77 && bytes[2] === 0 && bytes[3] === 42)
    )
  )
    throw new Error('image');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

// One assessment reservation covers at most one Insights, one DataLayers and
// two GeoTIFF calls. No retry, cache, external URL proxy or additional service.
export async function fetchSolarImagery(
  roof: SolarRoof,
  key: string,
): Promise<SolarRaster> {
  const signal = AbortSignal.timeout(20000);
  const url = new URL('https://solar.googleapis.com/v1/dataLayers:get');
  url.search = new URLSearchParams({
    'location.latitude': String(roof.center.latitude),
    'location.longitude': String(roof.center.longitude),
    radiusMeters: '100',
    view: 'IMAGERY_LAYERS',
    requiredQuality: roof.imageryQuality,
    exactQualityRequired: 'true',
    pixelSizeMeters: '0.25',
  }).toString();
  const response = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key },
    redirect: 'manual',
    signal,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('image');
  }
  const data = (await readBoundedJson(response.body, 32768)) as Record<
    string,
    unknown
  >;
  const date = data?.imageryDate as
    { year?: unknown; month?: unknown; day?: unknown } | undefined;
  const formatted =
    date &&
    `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  if (
    formatted !== roof.imageryDate ||
    data.imageryQuality !== roof.imageryQuality
  )
    throw new Error('image');
  // Validate BOTH URLs before any download; never send the server key elsewhere.
  const rgbUrl = assetUrl(data.rgbUrl),
    maskUrl = assetUrl(data.maskUrl);
  const rgb = await raster(rgbUrl, key, signal);
  const mask = await raster(maskUrl, key, signal);
  return { kind: 'geotiff', imageryDate: roof.imageryDate, rgb, mask };
}
