import { createSolarMap, loadGoogleMaps } from '../src/lib/solar-map.js';
import type { SolarRoof } from '../worker/solar';

const status = document.querySelector<HTMLElement>('#status')!;
const button = document.querySelector<HTMLButtonElement>('#load')!;
const toggle = document.querySelector<HTMLButtonElement>('#toggle')!;
let activeView: ReturnType<typeof createSolarMap> | undefined;
window.addEventListener('incetekh:maps-unavailable', () => {
  activeView?.clear();
  toggle.hidden = true;
  status.textContent =
    'Google Maps is unavailable. Alignment has not been accepted; use a free manual site visit.';
});
button.addEventListener('click', async () => {
  const consent = document.querySelector<HTMLInputElement>('#approved')!;
  if (!consent.checked) {
    status.textContent =
      'Confirm the approved Maps-load budget before continuing.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Loading approved alignment proof…';
  try {
    const response = await fetch('/roof', { cache: 'no-store' });
    if (!response.ok)
      throw new Error('No approved roof configured on this local harness.');
    const { roof } = (await response.json()) as { roof: SolarRoof };
    const api = await loadGoogleMaps(
      document.querySelector<HTMLInputElement>('#key')!.value.trim(),
    );
    const view = createSolarMap(
      document.querySelector<HTMLElement>('#map')!,
      api,
      { lat: roof.center.latitude, lng: roof.center.longitude },
    );
    activeView = view;
    view.show(roof, roof.configurations[0].panelsCount);
    view.fit(roof);
    let visible = true;
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      visible = !visible;
      view.setVisible(visible);
      toggle.textContent = visible ? 'Show Before' : 'Show With Solar';
      toggle.setAttribute('aria-pressed', String(!visible));
    });
    status.textContent = `Preliminary alignment proof. ${roof.configurations[0].panelsCount} model panels. Solar imagery acquired ${roof.imageryDate}; processed ${roof.imageryProcessedDate ?? 'date unavailable'}. Quality: ${roof.imageryQuality}. Verify the actual roof, orientation and spills; this is not construction design.`;
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Alignment proof unavailable.';
  }
});
