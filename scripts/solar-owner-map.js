// Local owner UI rehearsal only. Deliberately a schematic, never satellite imagery.
const svgNode = (tag, attributes = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes))
    node.setAttribute(name, String(value));
  return node;
};
const project = (point) => [
  400 + (point.lng - 79) * 2000000,
  250 - (point.lat - 15.00007) * 2000000,
];
class LocalMap {
  constructor(element) {
    this.svg = svgNode('svg', {
      viewBox: '0 0 800 500',
      role: 'img',
      'aria-label':
        'Simulated example roof. Not satellite imagery or a real property.',
    });
    this.svg.append(
      svgNode('rect', { width: 800, height: 500, fill: '#e2e6e6' }),
    );
    this.svg.append(
      svgNode('rect', {
        x: 340,
        y: 60,
        width: 120,
        height: 380,
        fill: '#d2c7b9',
        stroke: '#78766b',
        'stroke-width': 2,
      }),
    );
    const text = svgNode('text', {
      x: 25,
      y: 30,
      fill: '#253830',
      'font-size': 17,
    });
    text.textContent = 'SIMULATED EXAMPLE ROOF — click to select';
    this.svg.append(text);
    element.replaceChildren(this.svg);
  }
  setCenter() {}
  setZoom() {}
  fitBounds() {}
  addListener(_event, callback) {
    this.svg.addEventListener('click', () =>
      callback({ latLng: { lat: () => 15, lng: () => 79 } }),
    );
  }
}
class LocalPolygon {
  constructor(options) {
    this.node = svgNode('polygon', {
      points: options.paths.map((point) => project(point).join(',')).join(' '),
      fill: '#17384d',
      stroke: '#d8ecf5',
      'stroke-width': 2,
    });
    this.setMap(options.map);
  }
  setMap(map) {
    this.node.remove();
    if (map) map.svg.append(this.node);
  }
}
class LocalCircle {
  constructor(options) {
    this.node = svgNode('circle', { r: 6, fill: options.strokeColor });
  }
  setCenter(point) {
    const [x, y] = project(point);
    this.node.setAttribute('cx', String(x));
    this.node.setAttribute('cy', String(y));
  }
  setMap(map) {
    this.node.remove();
    if (map) map.svg.append(this.node);
  }
}
class LocalPlace extends HTMLElement {
  connectedCallback() {
    if (this.childNodes.length) return;
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Enter your full address');
    input.placeholder = 'Try the simulated example address';
    input.style.cssText =
      'padding:14px;width:100%;box-sizing:border-box;min-height:48px';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Select the simulated example roof';
    button.addEventListener('click', () => {
      const event = new Event('gmp-select');
      event.placePrediction = {
        toPlace: () => ({
          location: { lat: () => 15, lng: () => 79 },
          fetchFields: async () => {},
        }),
      };
      this.dispatchEvent(event);
    });
    this.append(input, button);
  }
}
customElements.define('local-owner-place', LocalPlace);
window.google = {
  maps: {
    Map: LocalMap,
    Polygon: LocalPolygon,
    Circle: LocalCircle,
    importLibrary: async () => ({ PlaceAutocompleteElement: LocalPlace }),
  },
};
window.incetekhMapsReady();
