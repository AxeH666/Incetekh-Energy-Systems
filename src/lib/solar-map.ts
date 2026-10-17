import type { SolarRoof } from '../../worker/solar';
import { configurationPaths, type MapPoint } from './solar-geometry.js';

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
export interface MapsApi {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => MapHandle;
  Polygon: new (options: Record<string, unknown>) => PolygonHandle;
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
  let visible = true;
  function clear() {
    for (const polygon of polygons) polygon.setMap(null);
    polygons = [];
  }
  return {
    map,
    clear,
    setVisible(value: boolean) {
      visible = value;
      for (const polygon of polygons) polygon.setMap(value ? map : null);
    },
    show(roof: SolarRoof, panelsCount: number) {
      const paths = configurationPaths(roof, panelsCount); // Validate before replacing.
      clear();
      try {
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
