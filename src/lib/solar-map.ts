import type { SolarRoof } from '../../worker/solar';
import {
  configurationPaths,
  panelCorners,
  offsetPoint,
  type MapPoint,
} from './solar-geometry.js';

export interface MapHandle {
  setCenter(point: MapPoint): void;
  setZoom(zoom: number): void;
  fitBounds(bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  }): void;
  addListener(
    event: string,
    callback: (event: { latLng?: { lat(): number; lng(): number } }) => void,
  ): { remove(): void };
}
export interface PolygonHandle {
  setMap(map: MapHandle | null): void;
}
export interface RoofImage {
  url: string;
  imageryDate: string;
  bounds: { south: number; west: number; north: number; east: number };
}
export interface LoadedRoofImage extends RoofImage {
  release(): void;
}
export async function loadRoofImage(
  value: RoofImage,
  roof: SolarRoof,
  signal: AbortSignal,
): Promise<LoadedRoofImage> {
  if (
    !value ||
    !/^\/api\/solar-imagery\/[a-z0-9-]+\.png$/.test(value.url) ||
    value.imageryDate !== roof.imageryDate ||
    !value.bounds
  )
    throw new Error('Unmatched roof imagery');
  const { south, west, north, east } = value.bounds;
  if (
    ![south, west, north, east].every(Number.isFinite) ||
    south >= north ||
    west >= east ||
    north - south > 0.02 ||
    east - west > 0.02 ||
    south > roof.bounds.sw.latitude ||
    west > roof.bounds.sw.longitude ||
    north < roof.bounds.ne.latitude ||
    east < roof.bounds.ne.longitude
  )
    throw new Error('Invalid roof image coverage');
  const response = await fetch(value.url, { signal, cache: 'no-store' });
  if (
    !response.ok ||
    !response.headers.get('Content-Type')?.startsWith('image/png') ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new Error('Roof imagery unavailable');
  }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > 8_000_000) {
      await reader.cancel();
      throw new Error('Roof imagery too large');
    }
    parts.push(part.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  const imageUrl = URL.createObjectURL(
    new Blob([bytes.buffer], { type: 'image/png' }),
  );
  const release = () => URL.revokeObjectURL(imageUrl);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const finish = (error?: Error) => {
        image.onload = null;
        image.onerror = null;
        signal.removeEventListener('abort', abort);
        if (error) {
          image.src = '';
          reject(error);
        } else resolve();
      };
      const abort = () => finish(new Error('Roof imagery cancelled'));
      image.onload = () =>
        image.naturalWidth && image.naturalHeight
          ? finish()
          : finish(new Error('Empty roof imagery'));
      image.onerror = () => finish(new Error('Roof imagery unavailable'));
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      image.src = imageUrl;
    });
  } catch (error) {
    release();
    throw error;
  }
  return { ...value, url: imageUrl, release };
}
export interface MapsApi {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => MapHandle;
  Polygon: new (options: Record<string, unknown>) => PolygonHandle;
  GroundOverlay?: new (
    url: string,
    bounds: RoofImage['bounds'],
    options: Record<string, unknown>,
  ) => PolygonHandle;
}
let mapsUnavailable = false;

// Google owns the geographic projection and camera. No pixel-positioned panels,
// per-roof nudges, screenshots, tile downloads or new map loads for toggles.
export function createSolarMap(
  element: HTMLElement,
  api: MapsApi,
  center: MapPoint,
) {
  if (mapsUnavailable) throw new Error('Google Maps is unavailable');
  const map = new api.Map(element, {
    center,
    zoom: 20,
    mapTypeId: 'satellite',
    tilt: 0,
    heading: 0,
    rotateControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    gestureHandling: 'cooperative',
  });
  let polygons: PolygonHandle[] = [];
  let roofImage: PolygonHandle | undefined;
  let releaseRoofImage: (() => void) | undefined;
  let visible = true;
  let displayedPaths: MapPoint[][] = [];
  function clear() {
    for (const polygon of polygons) polygon.setMap(null);
    polygons = [];
    displayedPaths = [];
  }
  return {
    map,
    clear() {
      clear();
      roofImage?.setMap(null);
      roofImage = undefined;
      releaseRoofImage?.();
      releaseRoofImage = undefined;
    },
    setRoofImage(image: LoadedRoofImage) {
      roofImage?.setMap(null);
      releaseRoofImage?.();
      roofImage = undefined;
      releaseRoofImage = undefined;
      try {
        if (!api.GroundOverlay) throw new Error('Roof imagery unsupported');
        roofImage = new api.GroundOverlay(image.url, image.bounds, {
          clickable: false,
          opacity: 1,
        });
        roofImage.setMap(map);
        releaseRoofImage = image.release;
      } catch (error) {
        roofImage?.setMap(null);
        roofImage = undefined;
        image.release();
        throw error;
      }
    },
    setVisible(value: boolean) {
      visible = value;
      for (const polygon of polygons) polygon.setMap(value ? map : null);
    },
    show(roof: SolarRoof, panelsCount: number, conceptIndices?: number[]) {
      if (
        conceptIndices &&
        (conceptIndices.length !== panelsCount ||
          new Set(conceptIndices).size !== panelsCount ||
          conceptIndices.some((i) => !Number.isSafeInteger(i) || i < 0))
      )
        throw new Error('Invalid grouped concept');
      const paths = conceptIndices
        ? conceptIndices.map((i) => panelCorners(roof, i))
        : configurationPaths(roof, panelsCount);
      clear();
      try {
        displayedPaths = paths;
        for (const path of paths)
          polygons.push(
            new api.Polygon({
              paths: path,
              map: visible ? map : null,
              geodesic: false,
              strokeColor: '#d8ecf5',
              strokeOpacity: 0.95,
              strokeWeight: 1,
              fillColor: '#17384d',
              fillOpacity: 0.85,
              clickable: false,
            }),
          );
      } catch (error) {
        clear();
        throw error;
      }
    },
    focusPanels() {
      const points = displayedPaths.flat();
      if (!points.length) return;
      const south = Math.min(...points.map((p) => p.lat)),
        north = Math.max(...points.map((p) => p.lat));
      const west = Math.min(...points.map((p) => p.lng)),
        east = Math.max(...points.map((p) => p.lng));
      const sw = offsetPoint({ lat: south, lng: west }, -3, -3),
        ne = offsetPoint({ lat: north, lng: east }, 3, 3);
      map.fitBounds({
        south: sw.lat,
        west: sw.lng,
        north: ne.lat,
        east: ne.lng,
      });
    },
    fit(roof: SolarRoof) {
      map.fitBounds({
        south: roof.bounds.sw.latitude,
        west: roof.bounds.sw.longitude,
        north: roof.bounds.ne.latitude,
        east: roof.bounds.ne.longitude,
      });
    },
  };
}

let loading: Promise<MapsApi> | undefined;
export function loadGoogleMaps(key: string): Promise<MapsApi> {
  if (loading) return loading;
  if (!key || key.length > 256)
    return Promise.reject(new Error('Maps is not configured'));
  loading = new Promise((resolve, reject) => {
    const global = window as unknown as {
      google?: { maps?: MapsApi };
      incetekhMapsReady?: () => void;
      gm_authFailure?: () => void;
    };
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timer);
      mapsUnavailable = true;
      // Auth failures can arrive AFTER the API callback resolved this promise.
      // Keep consumers informed so they never retain a false successful preview.
      window.dispatchEvent(new Event('incetekh:maps-unavailable'));
      reject(
        new Error(
          'Google Maps is unavailable. Request a free manual site visit.',
        ),
      );
    };
    const timer = window.setTimeout(fail, 15000);
    global.incetekhMapsReady = () => {
      clearTimeout(timer);
      if (global.google?.maps) resolve(global.google.maps);
      else fail();
      delete global.incetekhMapsReady;
    };
    global.gm_authFailure = fail;
    script.onerror = fail;
    const nonce =
      document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
    if (nonce) script.nonce = nonce;
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.searchParams.set('key', key);
    url.searchParams.set('v', 'quarterly');
    url.searchParams.set('loading', 'async');
    url.searchParams.set('callback', 'incetekhMapsReady');
    script.src = url.href;
    script.async = true;
    document.head.append(script);
  });
  return loading;
}
