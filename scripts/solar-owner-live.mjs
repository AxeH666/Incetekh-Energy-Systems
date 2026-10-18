// Used only by the local owner harness after explicit live-test approval.
export function ownerLiveProvider(
  keys,
  budget,
  fetchSolar,
  allowPlaces = false,
) {
  if (!keys.browserKey || !keys.serverKey || keys.browserKey === keys.serverKey)
    throw new Error('Separate private-test credentials required');
  return {
    remaining: () => budget.remaining(),
    mapScript() {
      if (!budget.reserve('maps')) return null;
      const url = new URL('https://maps.googleapis.com/maps/api/js');
      url.searchParams.set('key', keys.browserKey);
      url.searchParams.set('v', 'quarterly');
      url.searchParams.set('loading', 'async');
      url.searchParams.set('callback', 'incetekhOwnerMapsReady');
      // Places is allowed only in the separately authorized SS Mall review.
      const placesGuard = allowPlaces
        ? ''
        : "const original=google.maps.importLibrary.bind(google.maps);google.maps.importLibrary=name=>name==='places'?Promise.reject(new Error('Address search disabled for this bounded private test')):original(name);";
      return `window.incetekhOwnerMapsReady=()=>{${placesGuard}window.incetekhMapsReady();};const script=document.createElement('script');script.nonce=document.currentScript.nonce;script.async=true;script.src=${JSON.stringify(url.href)};script.onerror=()=>window.gm_authFailure?.();document.head.append(script);`;
    },
    async assess(point) {
      if (!budget.reserve('solar'))
        return { status: 'budget_exhausted', data_available: false };
      // Reservation is retained on all failures and timeouts; no automatic retry.
      return fetchSolar(point, keys.serverKey);
    },
  };
}
