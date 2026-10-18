// Test-only Google substitute. Never real imagery, never network access.
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
        if (options.fillOpacity === 0 && window.syntheticBuildingAreaFailure)
          throw new Error('Synthetic building highlight failure');
        this.node = document.createElement('span');
        if (options.fillOpacity === 0)
          this.node.dataset.mockBuildingArea = 'true';
        else this.node.dataset.mockPanel = 'true';
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
    importLibrary: async () => {
      if (window.syntheticLibraryGate) await window.syntheticLibraryGate;
      return {
        AutocompleteSessionToken: class {},
        AutocompleteSuggestion: {
          fetchAutocompleteSuggestions: async (request) => {
            window.syntheticAutocompleteOptions = request;
            (window.syntheticSearchRequests ??= []).push(request);
            if (window.syntheticSearch) return window.syntheticSearch(request);
            return {
              suggestions: [
                {
                  placePrediction: {
                    text: {
                      toString: () =>
                        '15 Example Street, Proddatur (test address)',
                    },
                    toPlace: () => ({
                      location: { lat: () => 15, lng: () => 79 },
                      fetchFields: async () => {},
                    }),
                  },
                },
              ],
            };
          },
        },
      };
    },
  },
};
window.incetekhMapsReady();
