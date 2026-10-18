import { abortable } from './solar-response';

export interface AddressPlace {
  location?: { lat(): number; lng(): number };
  fetchFields(options: { fields: string[] }): Promise<void>;
}
interface Prediction {
  text: { toString(): string };
  toPlace(): AddressPlace;
}
export interface AddressLibrary {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: Record<string, unknown>): Promise<{
      suggestions: { placePrediction?: Prediction }[];
    }>;
  };
}

// Own only the search UI; Google's predictions, session tokens and place details
// still come from Places (New). Never inspect the widget's private shadow DOM.
export function createAddressSearch(
  root: HTMLElement,
  api: AddressLibrary,
  isCurrent: () => boolean,
) {
  const input = root.querySelector<HTMLInputElement>('input')!;
  const list = root.querySelector<HTMLUListElement>('[role="listbox"]')!;
  const panel = root.querySelector<HTMLElement>('[data-address-panel]')!;
  const message = root.querySelector<HTMLElement>('[role="status"]')!;
  const help = root.querySelector<HTMLElement>('[data-address-help]')!;
  const attribution = root.querySelector<HTMLElement>(
    '[data-address-attribution]',
  )!;
  let revision = 0,
    active = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  let token: object | undefined,
    tokenTime = 0;
  let predictions: Prediction[] = [];
  function cancel() {
    revision++;
    clearTimeout(timer);
    request?.abort();
    request = undefined;
    predictions = [];
    list.replaceChildren();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    input.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  }
  function state(text: string, contact = false) {
    panel.hidden = false;
    message.textContent = text;
    help.hidden = !contact;
    attribution.hidden = !predictions.length;
  }
  function pick(index: number) {
    const prediction = predictions[index];
    if (!prediction || !isCurrent()) return;
    input.value = prediction.text.toString();
    cancel();
    token = undefined;
    root.dispatchEvent(
      Object.assign(new Event('address-select'), {
        placePrediction: prediction,
      }),
    );
  }
  async function lookup() {
    if (!isCurrent()) return;
    const current = revision;
    const controller = new AbortController();
    request = controller;
    const deadline = setTimeout(() => controller.abort(), 15000);
    if (!token || Date.now() - tokenTime > 180000) {
      token = new api.AutocompleteSessionToken();
      tokenTime = Date.now();
    }
    try {
      const result = await abortable(
        api.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: input.value.trim(),
          includedRegionCodes: ['in'],
          locationBias: { south: 12, west: 75, north: 20, east: 85 },
          sessionToken: token,
        }),
        controller.signal,
      );
      if (revision !== current || !isCurrent()) return;
      predictions = result.suggestions.flatMap((suggestion) =>
        suggestion.placePrediction ? [suggestion.placePrediction] : [],
      );
      state(
        predictions.length ? 'Choose your address below.' : 'No results found.',
        !predictions.length,
      );
      predictions.forEach((prediction, index) => {
        const option = document.createElement('li');
        option.id = `address-option-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.textContent = prediction.text.toString();
        option.addEventListener('pointerdown', (event) =>
          event.preventDefault(),
        );
        option.addEventListener('click', () => pick(index));
        list.append(option);
      });
      input.setAttribute('aria-expanded', String(predictions.length > 0));
    } catch {
      if (revision !== current || !isCurrent()) return;
      state(
        'Address search is unavailable. Please try again or contact us.',
        true,
      );
    } finally {
      clearTimeout(deadline);
      if (request === controller) request = undefined;
    }
  }
  input.addEventListener('input', (event) => {
    cancel();
    root.dispatchEvent(new Event('address-input'));
    if (!isCurrent()) return;
    if (!input.value.trim()) {
      token = undefined;
      return;
    }
    if ((event as InputEvent).isComposing) return;
    state('Searching addresses…');
    timer = setTimeout(() => void lookup(), 350);
  });
  input.addEventListener('compositionend', () =>
    input.dispatchEvent(new Event('input')),
  );
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      cancel();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (active >= 0) pick(active);
      return;
    }
    if (!predictions.length || !['ArrowDown', 'ArrowUp'].includes(event.key))
      return;
    event.preventDefault();
    active =
      active === -1
        ? event.key === 'ArrowDown'
          ? 0
          : predictions.length - 1
        : (active +
            (event.key === 'ArrowDown' ? 1 : predictions.length - 1) +
            predictions.length) %
          predictions.length;
    Array.from(list.children).forEach((option, index) =>
      option.setAttribute('aria-selected', String(index === active)),
    );
    input.setAttribute('aria-activedescendant', `address-option-${active}`);
    list.children[active].scrollIntoView({ block: 'nearest' });
  });
  root.querySelector('[data-address-clear]')!.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  });
  input.disabled = false;
  return {
    cancel,
    unavailable(message: string) {
      cancel();
      state(message, true);
    },
  };
}
