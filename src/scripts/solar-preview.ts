import { createSolarMap, loadGoogleMaps, type MapsApi } from '../lib/solar-map';
import type { SolarResult, Coordinates } from '../../worker/solar';

interface Marker {
  setCenter(point: { lat: number; lng: number }): void;
  setMap(map: unknown): void;
}
interface Place {
  location?: { lat(): number; lng(): number };
  fetchFields(options: { fields: string[] }): Promise<void>;
}
interface PropertyMaps extends MapsApi {
  Circle: new (options: Record<string, unknown>) => Marker;
  importLibrary(name: string): Promise<{
    PlaceAutocompleteElement: new (
      options: Record<string, unknown>,
    ) => HTMLElement;
  }>;
}
type Assessment = Extract<SolarResult, { status: 'available' }> & {
  reference: string;
  selectedLocation: Coordinates;
};
const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const status = byId('preview-status');
const assess = byId<HTMLButtonElement>('assess-property');
const coordinateForm = byId<HTMLFormElement>('coordinate-form');
const latInput = coordinateForm.elements.namedItem(
  'latitude',
) as HTMLInputElement;
const lngInput = coordinateForm.elements.namedItem(
  'longitude',
) as HTMLInputElement;
let view: ReturnType<typeof createSolarMap> | undefined;
let selectedMarker: Marker | undefined;
let returnedMarker: Marker | undefined;
let selected: Coordinates | undefined;
let assessment: Assessment | undefined;
let pending = false,
  generation = 0,
  searchGeneration = 0,
  token = '',
  widgetId: string | undefined;
let controller: AbortController | undefined;
let mapFailed = false;
function show(message: string, focus = false) {
  status.textContent = message;
  if (focus) status.focus();
}
function updateButton() {
  assess.disabled = !selected || !token || pending || mapFailed;
}
function discardRoof() {
  assessment = undefined;
  view?.clear();
  returnedMarker?.setMap(null);
  byId('returned-building').hidden = true;
  byId('roof-controls').hidden = true;
  byId('solar-source').hidden = true;
  byId('roof-details').textContent = '';
}
function choose(point: Coordinates, recenter = true) {
  if (mapFailed) {
    show('The map is unavailable. Please arrange a free manual site visit.');
    return;
  }
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    point.latitude < 12 ||
    point.latitude > 20 ||
    point.longitude < 75 ||
    point.longitude > 85
  ) {
    show(
      'Choose a property within our assessment region, or arrange a free manual site visit.',
    );
    return;
  }
  generation++;
  searchGeneration++;
  controller?.abort();
  pending = false;
  discardRoof();
  selected = point;
  token = '';
  if (widgetId) window.turnstile?.reset(widgetId);
  latInput.value = String(point.latitude);
  lngInput.value = String(point.longitude);
  const center = { lat: point.latitude, lng: point.longitude };
  selectedMarker?.setCenter(center);
  selectedMarker?.setMap(view?.map);
  if (recenter) {
    view?.map.setCenter(center);
    view?.map.setZoom(20);
  }
  byId('selection-label').textContent =
    `Selected marker: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}. Confirm the building visually.`;
  show('Check the selected building, then request its rooftop assessment.');
  updateButton();
}
coordinateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (coordinateForm.reportValidity())
    choose({
      latitude: Number(latInput.value),
      longitude: Number(lngInput.value),
    });
});
coordinateForm.addEventListener('input', () => {
  generation++;
  searchGeneration++;
  controller?.abort();
  pending = false;
  selected = undefined;
  discardRoof();
  updateButton();
  byId('selection-label').textContent =
    'Coordinates changed. Use Move selection, then confirm the building.';
});
window.addEventListener('incetekh:maps-unavailable', () => {
  mapFailed = true;
  generation++;
  controller?.abort();
  pending = false;
  discardRoof();
  updateButton();
  show(
    'Google Maps is unavailable. We can assess your property during a free site visit.',
    true,
  );
});
function security(sitekey: string) {
  const fail = () => {
    token = '';
    updateButton();
    show(
      'The security check is unavailable. Please use the free site visit option.',
    );
  };
  const render = () => {
    if (!window.turnstile) return fail();
    widgetId = window.turnstile.render(byId('solar-security'), {
      sitekey,
      action: 'solar_assessment',
      size: 'flexible',
      callback: (value: string) => {
        token = value;
        updateButton();
      },
      'expired-callback': () => {
        token = '';
        updateButton();
      },
      'error-callback': () => {
        fail();
        return true;
      },
    });
  };
  if (window.turnstile) return render();
  const script = document.createElement('script');
  script.src =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  const nonce =
    document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
  if (nonce) script.nonce = nonce;
  script.onload = render;
  script.onerror = fail;
  document.head.append(script);
}
async function search(api: PropertyMaps) {
  try {
    const { PlaceAutocompleteElement } = await api.importLibrary('places');
    const element = new PlaceAutocompleteElement({
      includedRegionCodes: ['in'],
      locationRestriction: { south: 12, west: 75, north: 20, east: 85 },
    });
    element.setAttribute('aria-label', 'Search address or business');
    byId('property-search').append(element);
    element.addEventListener('gmp-error', () =>
      show(
        'Address search is unavailable. Click the map or enter coordinates instead.',
      ),
    );
    element.addEventListener('gmp-select', async (event) => {
      const revision = ++searchGeneration;
      generation++;
      controller?.abort();
      pending = false;
      selected = undefined;
      selectedMarker?.setMap(null);
      discardRoof();
      updateButton();
      latInput.value = '';
      lngInput.value = '';
      byId('selection-label').textContent =
        'Locating the newly selected property…';
      show(
        'Locating the selected property. Confirm its building when it appears.',
      );
      try {
        const place = (
          event as Event & { placePrediction: { toPlace(): Place } }
        ).placePrediction.toPlace();
        await place.fetchFields({ fields: ['location'] });
        if (revision !== searchGeneration || mapFailed) return;
        if (!place.location) throw new Error('No location');
        choose({
          latitude: place.location.lat(),
          longitude: place.location.lng(),
        });
      } catch {
        if (revision === searchGeneration)
          show(
            'Search could not locate this property. Click the map or enter coordinates instead.',
          );
      }
    });
  } catch {
    show(
      'Address search is unavailable. Click the map or enter coordinates instead.',
    );
  }
}
const messages: Record<string, string> = {
  no_coverage:
    "Solar data is unavailable for this property. We'll assess it during a free site visit.",
  unusable_geometry:
    "The roof data cannot support a reliable layout. We'll assess it during a free site visit.",
  throttled:
    'The assessment limit has been reached. Please try later or arrange a free site visit.',
  budget_exhausted:
    'Online assessments are at their usage limit. A free manual site visit is still available.',
};
assess.addEventListener('click', async () => {
  if (!selected || !token || pending || mapFailed) return;
  const revision = generation;
  const point = { ...selected };
  const submittedToken = token;
  token = '';
  pending = true;
  discardRoof();
  updateButton();
  const attemptController = new AbortController();
  controller = attemptController;
  const timeout = setTimeout(() => attemptController.abort(), 20000);
  show('Assessing the confirmed property…');
  try {
    const response = await fetch('/api/solar-assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...point, token: submittedToken }),
      signal: attemptController.signal,
      cache: 'no-store',
    });
    const result = (await response.json()) as SolarResult & {
      reference: string;
      selectedLocation: Coordinates;
    };
    if (revision !== generation || mapFailed) return;
    if (
      !response.ok ||
      result.status !== 'available' ||
      !result.data_available
    ) {
      show(
        messages[result.status] ??
          'The online assessment is unavailable. Please arrange a free manual site visit.',
        true,
      );
      return;
    }
    assessment = result;
    returnedMarker?.setCenter({
      lat: result.roof.center.latitude,
      lng: result.roof.center.longitude,
    });
    returnedMarker?.setMap(view?.map);
    view?.map.fitBounds({
      south: Math.min(point.latitude, result.roof.bounds.sw.latitude),
      west: Math.min(point.longitude, result.roof.bounds.sw.longitude),
      north: Math.max(point.latitude, result.roof.bounds.ne.latitude),
      east: Math.max(point.longitude, result.roof.bounds.ne.longitude),
    });
    byId('returned-location').textContent =
      `Returned building centre: ${result.roof.center.latitude.toFixed(6)}, ${result.roof.center.longitude.toFixed(6)}. Your selected marker is blue; the returned centre is orange.`;
    byId('returned-building').hidden = false;
    show(
      'Confirm the returned building marked in orange before showing proposed panels.',
      true,
    );
  } catch {
    if (revision === generation && !mapFailed)
      show(
        'The assessment could not finish. No layout is shown. Please try later or book a free site visit.',
        true,
      );
  } finally {
    clearTimeout(timeout);
    if (revision === generation) {
      pending = false;
      updateButton();
      if (widgetId) window.turnstile?.reset(widgetId);
    }
  }
});
byId('accept-roof').addEventListener('click', () => {
  if (!assessment || !view || mapFailed) return;
  const roof = assessment.roof;
  try {
    view.setVisible(true);
    view.show(roof, roof.configurations[0].panelsCount);
    byId('returned-building').hidden = true;
    byId('roof-controls').hidden = false;
    byId('solar-source').hidden = false;
    const toggle = byId('before-solar');
    toggle.textContent = 'Show Before';
    toggle.setAttribute('aria-pressed', 'false');
    byId('roof-details').textContent =
      `${roof.configurations[0].panelsCount} preliminary model panels. Solar imagery acquired ${roof.imageryDate}; processed ${roof.imageryProcessedDate ?? 'date unavailable'}. Data quality: ${roof.imageryQuality}. Map imagery may differ. Roof changes, obstacles, access and structure need physical inspection.`;
    show(
      'Preliminary rooftop concept. Check the layout and arrange a free site visit.',
      true,
    );
  } catch {
    discardRoof();
    show(
      'The layout is unusable. Please arrange a free manual site visit.',
      true,
    );
  }
});
byId('before-solar').addEventListener('click', () => {
  const button = byId('before-solar');
  const before = button.getAttribute('aria-pressed') !== 'true';
  view?.setVisible(!before);
  button.setAttribute('aria-pressed', String(before));
  button.textContent = before ? 'Show With Solar' : 'Show Before';
});
for (const id of ['reject-roof', 'unusable-roof'])
  byId(id).addEventListener('click', () => {
    discardRoof();
    show(
      "We won't show a layout for an uncertain or changed roof. Select again or book a free manual site visit.",
      true,
    );
  });

async function initialize() {
  try {
    const response = await fetch('/api/solar-preview-config', {
      cache: 'no-store',
    });
    const config = await response.json();
    if (
      !response.ok ||
      config.enabled !== true ||
      !config.mapsKey ||
      !config.turnstileSiteKey
    )
      return;
    byId('preview-intro').hidden = false;
    show(
      'Start with your actual property. No account or phone number is needed to see a preliminary concept.',
    );
    byId<HTMLButtonElement>('open-map').addEventListener(
      'click',
      async (event) => {
        (event.currentTarget as HTMLButtonElement).disabled = true;
        show('Loading Google satellite map…');
        try {
          // Recheck runtime shutoff immediately before a potentially billable load.
          const current = await (
            await fetch('/api/solar-preview-config', { cache: 'no-store' })
          ).json();
          if (current.enabled !== true) throw new Error('Disabled');
          const api = (await loadGoogleMaps(current.mapsKey)) as PropertyMaps;
          byId('property-controls').hidden = false;
          view = createSolarMap(byId('solar-map'), api, {
            lat: 15.5,
            lng: 79.5,
          });
          view.map.setZoom(7);
          selectedMarker = new api.Circle({
            map: null,
            radius: 3,
            strokeColor: '#176b9c',
            strokeWeight: 4,
            fillColor: '#ffffff',
            fillOpacity: 1,
            clickable: false,
          });
          returnedMarker = new api.Circle({
            map: null,
            radius: 4,
            strokeColor: '#ad5b14',
            strokeWeight: 4,
            fillColor: '#ffffff',
            fillOpacity: 1,
            clickable: false,
          });
          view.map.addListener('click', (point) => {
            if (point.latLng)
              choose(
                { latitude: point.latLng.lat(), longitude: point.latLng.lng() },
                false,
              );
          });
          show(
            'Search, click the map, or enter coordinates to select your building.',
          );
          security(current.turnstileSiteKey);
          void search(api);
        } catch {
          show(
            'The property map is unavailable. You can still book a free manual site visit.',
            true,
          );
        }
      },
      { once: true },
    );
  } catch {
    /* The initial honest disabled/manual-assessment state remains visible. */
  }
}
void initialize();
