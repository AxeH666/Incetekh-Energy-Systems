// Test-only Google substitute. Never real imagery, never network access.
class SyntheticPlace extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    if (this.childNodes.length) return;
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Enter your full address');
    const suggestion = document.createElement('button');
    suggestion.textContent = '15 Example Street, Proddatur (test address)';
    suggestion.hidden = true;
    input.addEventListener('input', () => {
      suggestion.hidden = !input.value.trim();
    });
    suggestion.addEventListener('click', () => {
      this.dispatchEvent(
        Object.assign(new Event('gmp-select'), {
          placePrediction: {
            toPlace: () => ({
              location: { lat: () => 15, lng: () => 79 },
              fetchFields: async () => {},
            }),
          },
        }),
      );
      suggestion.hidden = true;
    });
    this.append(input, suggestion);
  }
}
customElements.define('synthetic-place-search', SyntheticPlace);
window.google = {
  maps: {
    Map: class {
      constructor(element) {
        this.element = element;
        element.textContent = 'SYNTHETIC MAP — not satellite imagery';
      }
      setCenter() {}
      setZoom() {}
      fitBounds() {}
      addListener(_name, callback) {
        window.syntheticMapClick = callback;
        return { remove() {} };
      }
    },
    Circle: class {
      setCenter() {}
      setMap() {}
    },
    Polygon: class {
      constructor(options) {
        this.node = document.createElement('span');
        this.node.dataset.mockPanel = 'true';
        this.node.textContent = ' ▣ ';
        this.setMap(options.map);
      }
      setMap(map) {
        this.node.remove();
        if (map) map.element.append(this.node);
      }
    },
    GroundOverlay: class {
      constructor(url) {
        this.node = document.createElement('span');
        this.node.dataset.mockRoofImage = url;
      }
      setMap(map) {
        this.node.remove();
        if (map) map.element.append(this.node);
      }
    },
    importLibrary: async () => ({ PlaceAutocompleteElement: SyntheticPlace }),
  },
};
window.incetekhMapsReady();
