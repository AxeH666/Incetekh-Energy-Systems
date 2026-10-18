import {
  createSolarMap,
  loadGoogleMaps,
  loadRoofImage,
  type MapsApi,
  type RoofImage,
} from '../lib/solar-map';
import type { SolarResult, Coordinates } from '../../worker/solar';
import {
  readSolarSession,
  billEstimate,
  sessionLifetime,
  planForTarget,
} from '../lib/solar-session';
import { loadTurnstile } from '../lib/turnstile';
import { rooftopResults } from '../lib/solar-results';
import { moduleLayout, referenceModule } from '../lib/solar-module-layout';
import { configurationPaths } from '../lib/solar-geometry';
import type { SolarRaster } from '../../worker/solar-imagery';
import type { MatchedRoofImage } from '../lib/solar-raster';
import { localPath } from '../i18n/languages';
import { financialEstimate } from '../data/solar';

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
  roofImage?: RoofImage;
  roofRaster?: SolarRaster;
};
const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const status = byId('preview-status');
const session = readSolarSession();
const need = session ? billEstimate(session) : null;
const targetKw = session?.requestedKw ?? need?.kw;
const enquiryForm = document.querySelector<HTMLFormElement>(
  '[data-site-visit-form]',
)!;
const contextConsent = byId<HTMLInputElement>('preview-context-consent');
byId('preview-visit').addEventListener('click', () => {
  byId<HTMLDetailsElement>('preview-enquiry').open = true;
});
const journeyReference = crypto.randomUUID();
const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
const number = (value: number) =>
  value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
if (session && need) {
  byId<HTMLAnchorElement>('back-calculator').href =
    localPath('/', session.language) + '#solar-planner';
  byId<HTMLAnchorElement>('preview-visit').href = '#site-visit';
  enquiryForm.dataset.enquiryLanguage = session.language;
  (enquiryForm.elements.namedItem('plan') as HTMLSelectElement).value =
    planForTarget(targetKw!);
  byId('chosen-system').textContent =
    `${targetKw} kW ${session.requestedKw ? 'selected system' : 'bill-based estimate'}`;
  byId('bill-summary-text').textContent =
    `${money(session.bill)}/month · ${session.residential ? 'Residential' : 'Commercial'} · ${need.kw} kW bill-based target · approximately ${need.units} units used/month. Original calculator generation-value scenario: ${money(financialEstimate(need.kw, need.subsidy).monthlySavings)}/month, not guaranteed bill reduction.`;
  if (session.requestedKw)
    byId('bill-summary-text').textContent +=
      ` Your selected system: ${session.requestedKw} kW${session.requestedKw === 10 ? ' (starting point for 10+ kW)' : ''}. The rooftop preview will aim for this chosen size; your bill-based recommendation stays separate.`;
}
const assess = byId<HTMLButtonElement>('assess-property');
let view: ReturnType<typeof createSolarMap> | undefined;
let selectedMarker: Marker | undefined;
let selected: Coordinates | undefined;
let assessment: Assessment | undefined;
let matchedRoof: MatchedRoofImage | undefined;
let preferGrouped = true;
let closeView = false;
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
  assess.disabled = !selected || !token || pending || mapFailed || !!assessment;
  assess.hidden = !!assessment;
}
function discardRoof() {
  matchedRoof = undefined;
  assessment = undefined;
  preferGrouped = true;
  closeView = false;
  byId('grouped-layout-note').hidden = true;
  byId('module-details').hidden = true;
  byId('module-unavailable').hidden = true;
  byId('roof-limited').hidden = true;
  byId('grouped-layout').hidden = true;
  byId('panel-view').textContent = 'Closer view';
  byId('panel-view').setAttribute('aria-pressed', 'false');
  view?.clear();
  byId('returned-building').hidden = true;
  byId('roof-controls').hidden = true;
  byId('solar-source').hidden = true;
  byId('roof-details').textContent = '';
  byId('roof-results').hidden = true;
  byId('roof-configuration').replaceChildren();
  delete enquiryForm.dataset.previewContext;
  contextConsent.checked = false;
  contextConsent.disabled = true;
  enquiryForm.querySelector('[data-preview-context-summary]')!.textContent =
    'Select a property to attach your bill-based estimate and selected coordinates. You can send an ordinary enquiry without them.';
}
function syncEnquiryContext() {
  if (
    !session ||
    !need ||
    !selected ||
    Date.now() - session.createdAt >= sessionLifetime
  )
    return;
  enquiryForm.dataset.previewContext = JSON.stringify({
    version: 1,
    consent: true,
    calculatorVersion: 'bill-v1',
    bill: session.bill,
    residential: session.residential,
    targetKw: need.kw,
    latitude: selected.latitude,
    longitude: selected.longitude,
    reference: assessment?.reference ?? journeyReference,
    preferredContact: 'none',
  });
  contextConsent.disabled = enquiryForm.getAttribute('aria-busy') === 'true';
  enquiryForm.querySelector('[data-preview-context-summary]')!.textContent =
    `Optional context: ${money(session.bill)}/month, ${session.residential ? 'residential' : 'commercial'}, ${need.kw} kW bill-based target; selected coordinates ${selected.latitude}, ${selected.longitude}. Enter your own location description above. The journey reference does not restore a roof design.`;
}
function freshSession() {
  if (session && need && Date.now() - session.createdAt < sessionLifetime)
    return true;
  generation++;
  searchGeneration++;
  controller?.abort();
  pending = false;
  selected = undefined;
  token = '';
  discardRoof();
  updateButton();
  byId('preview-intro').hidden = true;
  byId('property-controls').hidden = true;
  show(
    'Your calculator estimate is missing or expired. Return to the calculator to start again, or book a free site visit.',
    true,
  );
  return false;
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
  const center = { lat: point.latitude, lng: point.longitude };
  selectedMarker?.setCenter(center);
  selectedMarker?.setMap(view?.map);
  if (recenter) {
    view?.map.setCenter(center);
    view?.map.setZoom(20);
  }
  byId('selection-label').textContent =
    'Is the pin on your roof? Tap the roof to adjust it.';
  show('Check the pin, then confirm your roof.');
  syncEnquiryContext();
  updateButton();
}
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
  void loadTurnstile().then(render).catch(fail);
}
async function search(api: PropertyMaps) {
  try {
    const { PlaceAutocompleteElement } = await api.importLibrary('places');
    const element = new PlaceAutocompleteElement({
      includedRegionCodes: ['in'],
      locationRestriction: { south: 12, west: 75, north: 20, east: 85 },
    });
    element.setAttribute('aria-label', 'Enter your full address');
    element.setAttribute('placeholder', 'House number, street, city');
    byId('property-search').append(element);
    element.focus();
    element.addEventListener('input', () => {
      searchGeneration++;
      generation++;
      controller?.abort();
      pending = false;
      selected = undefined;
      selectedMarker?.setMap(null);
      discardRoof();
      updateButton();
      byId('selection-label').textContent =
        'Choose an address suggestion to locate your roof.';
    });
    element.addEventListener('gmp-error', () =>
      show('Address search is unavailable. Tap your roof on the map instead.'),
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
            'Search could not locate this property. Tap your roof on the map instead.',
          );
      }
    });
  } catch {
    show('Address search is unavailable. Tap your roof on the map instead.');
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
  if (!freshSession()) return;
  if (!selected || !token || pending || mapFailed || assessment) return;
  const revision = generation;
  const point = { ...selected };
  const submittedToken = token;
  token = '';
  pending = true;
  discardRoof();
  updateButton();
  const attemptController = new AbortController();
  controller = attemptController;
  const timeout = setTimeout(() => attemptController.abort(), 55000);
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
      roofImage?: RoofImage;
      roofRaster?: SolarRaster;
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
    // This rejects obvious mismatches; a bounding box is not a roof outline.
    // Never translate Google's panel coordinates to make a neighbouring roof fit.
    const bounds = result.roof.bounds;
    if (
      point.latitude < bounds.sw.latitude ||
      point.latitude > bounds.ne.latitude ||
      point.longitude < bounds.sw.longitude ||
      point.longitude > bounds.ne.longitude
    ) {
      byId('returned-building').hidden = false;
      byId('returned-location').textContent =
        'No layout shown for this location.';
      show(
        'The returned roof does not match your pin. Choose your roof again.',
        true,
      );
      return;
    }
    if (result.roofRaster) {
      const { loadSolarRaster } = await import('../lib/solar-raster');
      const raster = await loadSolarRaster(
        result.roofRaster,
        result.roof,
        attemptController.signal,
      );
      if (revision !== generation || mapFailed || !view) {
        raster.release();
        return;
      }
      view.setRoofImage(raster);
      matchedRoof = raster;
      // Release encoded provider bytes after decoding; never put them in storage.
      delete result.roofRaster;
    } else if (result.roofImage) {
      const roofImage = await loadRoofImage(
        result.roofImage,
        result.roof,
        attemptController.signal,
      );
      if (revision !== generation || mapFailed || !view) {
        roofImage.release();
        return;
      }
      view.setRoofImage(roofImage);
    }
    assessment = result;
    selectedMarker?.setMap(null);
    view?.fit(result.roof);
    showAssessment();
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
      syncEnquiryContext();
      updateButton();
      if (widgetId) window.turnstile?.reset(widgetId);
    }
  }
});
function renderResults(panelsCount?: number) {
  if (!assessment || !view || mapFailed || !need || !freshSession()) return;
  const roof = assessment.roof;
  try {
    const result = rooftopResults(roof, targetKw!, panelsCount);
    if (!result) throw new Error('Unavailable configuration');
    let concept = moduleLayout(roof, targetKw!);
    if (concept && matchedRoof && !matchedRoof.contains(concept.paths))
      concept = null;
    const grouped = preferGrouped && !!concept;
    if (grouped) view.showConcept(concept!.paths);
    else {
      if (
        matchedRoof &&
        !matchedRoof.contains(configurationPaths(roof, result.panelsCount))
      )
        throw new Error('Roof mask mismatch');
      view.show(roof, result.panelsCount);
    }
    byId('grouped-layout').hidden = !concept;
    byId('grouped-layout').textContent = grouped
      ? 'Compare Google model'
      : 'Try grouped layout';
    byId('grouped-layout-note').hidden = !grouped;
    byId('grouped-layout-note').textContent = concept
      ? `${concept.count} x ${referenceModule.watts} W = ${number(concept.capacityKw)} kWp for your ${targetKw} kW selection. ${concept.rows} rows, up to ${concept.columns} panels per row. Preliminary reference-module layout; engineer verification required.`
      : '';
    byId('module-details').hidden = !grouped;
    byId('module-unavailable').hidden = !!concept;
    byId('module-assumptions').textContent =
      `Reference module: ${referenceModule.name}, ${referenceModule.lengthMeters} by ${referenceModule.widthMeters} m. Count is the nearest whole number to your selected capacity. A 20 mm gap is a visualization assumption, not an approved mounting clearance. The array follows the modeled roof plane; raised tilt and row shading are not modeled. Access, setbacks, obstacles, drainage, structure and mounting need an engineer's site check. Energy and savings are not shown for this rearranged concept. Product availability and final equipment are not confirmed.`;
    byId('returned-building').hidden = true;
    byId('roof-controls').hidden = false;
    byId('solar-source').hidden = false;
    byId('solar-source').textContent =
      assessment.roofImage || matchedRoof
        ? `Source: Includes solar data from Google. Roof imagery: ${roof.imageryDate}. A site visit must confirm the roof's current condition.`
        : 'Source: Includes solar data from Google. Map imagery may differ; panel alignment needs verification.';
    byId('roof-results').hidden = grouped;
    byId<HTMLSelectElement>('roof-configuration').value = String(
      result.panelsCount,
    );
    byId('result-panels').textContent = String(result.panelsCount);
    byId('result-capacity').textContent = `${number(result.capacityKw)} kW`;
    byId('result-dc').textContent = `${number(result.annualDc)} kWh DC/year`;
    byId('result-ac').textContent = `${number(result.annualAc)} kWh AC/year`;
    byId('result-monthly').textContent =
      `${number(result.monthlyAc)} kWh AC/month`;
    byId('result-value').textContent = `${money(result.monthlyValue)}/month`;
    byId('roof-comparison').textContent =
      `Bill-based target: ${need.kw} kW.${session?.requestedKw ? ` Your selected system: ${session.requestedKw} kW.` : ''} Selected returned configuration: ${number(result.capacityKw)} kW (${number(Math.abs(result.capacityKw - targetKw!))} kW ${result.capacityKw >= targetKw! ? 'above' : 'below'} ${session?.requestedKw ? 'your selected size' : 'target'}). Modeled roof maximum: ${number(result.maximumKw)} kW. Initial selection is the closest returned configuration, with ties toward the smaller size.`;
    byId('roof-limited').hidden = grouped || !result.limited;
    byId('panel-model').textContent =
      `Model panel: ${number(roof.panelCapacityWatts)} W, ${number(roof.panelHeightMeters)} m × ${number(roof.panelWidthMeters)} m. Model hardware is not a committed Incetekh product. Physical inspection must confirm setbacks, access, mounting, tanks, existing installations and structure.`;
    byId('roof-details').textContent =
      `${result.panelsCount} preliminary model panels. Solar imagery acquired ${roof.imageryDate}; processed ${roof.imageryProcessedDate ?? 'date unavailable'}. Data quality: ${roof.imageryQuality}. Map imagery may differ. Roof changes, obstacles, access and structure need physical inspection.`;
    show(
      grouped
        ? 'Grouped layout concept. Review the roof and arrange a site visit.'
        : 'Preliminary rooftop concept. Check the layout and arrange a free site visit.',
    );
    if (closeView) view.focusPanels();
  } catch {
    discardRoof();
    show(
      'The layout is unusable. Please arrange a free manual site visit.',
      true,
    );
  }
}
function showAssessment() {
  if (!assessment || !view || !freshSession()) return;
  byId('roof-configuration').replaceChildren(
    ...assessment.roof.configurations.map((config) => {
      const option = document.createElement('option');
      option.value = String(config.panelsCount);
      option.textContent = `${config.panelsCount} panels · ${number((config.panelsCount * assessment!.roof.panelCapacityWatts) / 1000)} kW`;
      return option;
    }),
  );
  view.setVisible(true);
  byId('before-solar').textContent = 'Show Before';
  byId('before-solar').setAttribute('aria-pressed', 'false');
  renderResults();
}
byId('roof-configuration').addEventListener('change', () =>
  renderResults(Number(byId<HTMLSelectElement>('roof-configuration').value)),
);
byId('grouped-layout').addEventListener('click', () => {
  if (!assessment || !freshSession()) return;
  preferGrouped = !preferGrouped;
  renderResults(Number(byId<HTMLSelectElement>('roof-configuration').value));
});
byId('panel-view').addEventListener('click', () => {
  if (!assessment || !view || !freshSession()) return;
  closeView = !closeView;
  if (closeView) view.focusPanels();
  else view.fit(assessment.roof);
  byId('panel-view').textContent = closeView ? 'Whole roof' : 'Closer view';
  byId('panel-view').setAttribute('aria-pressed', String(closeView));
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
    selected = undefined;
    updateButton();
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
    ) {
      show(
        'Solar Preview is not publicly enabled yet. Use the private preview link supplied for your review, or return to the calculator.',
      );
      return;
    }
    if (!freshSession()) return;
    byId('preview-intro').hidden = false;
    show('Start with your address. No phone number needed.');
    byId<HTMLButtonElement>('open-map').addEventListener(
      'click',
      async (event) => {
        if (!freshSession()) return;
        (event.currentTarget as HTMLButtonElement).disabled = true;
        byId('open-map').hidden = true;
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
            radius: 1.5,
            strokeColor: '#176b9c',
            strokeWeight: 2,
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
          show('Enter your address and select a suggestion.');
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
