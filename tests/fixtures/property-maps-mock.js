// Test-only Google substitute. Never real imagery, never network access.
class SyntheticPlace extends HTMLElement {
  constructor() {
    super();
    this.textContent = 'Synthetic address search';
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
    importLibrary: async () => ({ PlaceAutocompleteElement: SyntheticPlace }),
  },
};
window.incetekhMapsReady();
