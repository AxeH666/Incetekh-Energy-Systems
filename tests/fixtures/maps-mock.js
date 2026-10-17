// Browser-only synthetic Maps substitute. No imagery or external traffic.
window.google = {
  maps: {
    Map: class {
      constructor(element) {
        this.element = element;
        element.textContent = 'SYNTHETIC MAP — not satellite imagery';
      }
      fitBounds() {}
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
  },
};
window.incetekhMapsReady();
