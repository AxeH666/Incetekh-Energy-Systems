# Private local Solar Preview

Public activation remains disabled. This branch is for owner review on this
computer only; no push, deployment, lead writes, email or WhatsApp messages.

## Open the SS Mall review

Build with `npm run build`, then run:

```powershell
powershell -File scripts/Start-SolarOwnerLivePreview.ps1 -SsMall
```

Open **http://127.0.0.1:4333/#solar-planner** on this computer. Choose a capacity,
click **Preview ... on my roof**, then **Enter your address**. Search
**SS Mall Proddatur** and select **ss mall, YMR Colony**. Check the pin and click
**Confirm roof & preview**. Before/With Solar keeps the same roof image in place.
The selected size and the original bill recommendation remain separate.
Detailed calculator assumptions and the enquiry form are collapsed.

This mode makes live Google Maps/Places requests, but reuses the saved SS Mall
Solar assessment and matching roof image. It cannot assess other properties or
make new Solar requests. Only the saved selected point (within 0.000001 degrees)
is accepted; moving the pin elsewhere produces an unavailable result. This is a
bounded alignment review, not a general matched-imagery service.

The server binds only to `127.0.0.1:4333`, rejects foreign Host/Origin and cross-site
requests, and serves files only from `dist` or explicit private routes. Stop the
known process when finished. Do not expose it through a tunnel. Local enquiry
submission returns unavailable, never a fabricated success receipt.

The owner installed a separate browser key and enabled the needed APIs. Maps
JavaScript and Places API (New) are needed for this mode; the website restriction
must remain `http://127.0.0.1:4333/*`. Actual Cloud Console restrictions were not
independently inspected. Keys remain Windows-user encrypted outside Git and pass
to Node through private stdin, never command-line arguments. Do not paste keys
into chat. `scripts/Set-SolarOwnerBrowserKey.ps1 -Check` verifies local readability,
not Google's restrictions.

## Evidence and limits, 18 October 2026

The owner requested SS Mall after approving the simpler address flow. The selected
Places point was 14.755558, 78.5564468. Building Insights returned a nearby roof
centre of 14.7555807, 78.5564084. Its closest configuration to the chosen 5 kW was
12 panels / 4.8 kW. Geometry uses Google's panel centres, dimensions, orientation
and roof pitch; no manual offsets were applied.

Solar RGB and roof-mask layers share the assessment's **14 January 2023** imagery
date and BASE quality. The source rasters are EPSG:32644, 479 by 479 pixels at
0.25 metres per pixel. A local diagnostic reprojected RGB to EPSG:3857 for a native
Google GroundOverlay. The PNG contains imagery only; panel polygons remain
geographic overlays. A 9 by 9 sample grid across each of the 12 panel footprints
fell on Google's roof mask. This supports alignment with the provider's model;
it does not prove every footprint pixel, current obstacles, surveyed boundaries,
structural suitability or owner acceptance. The image is dated, not a live view.

The initial review used 3 Maps loads, 4 Places RPCs, 1 Solar assessment, 1 DataLayers
request, and one RGB plus one mask download. Separate ignored counters are under
`.wrangler/solar-ss-mall`. The normal `-SsMall` server has an additional persistent
3-Maps-load review cap under `.wrangler/solar-ss-mall/owner-review`; live Places
requests are allowed on user interaction. It makes zero new Solar assessments.
`/__owner/allowance` reports remaining Maps loads. Restarting does not reset the
counter; never delete or reset it to obtain more calls. Reloading and opening the
map consumes another load; toggles and configuration changes do not.

Saved Google-derived data and screenshots remain ignored under `.wrangler` and
must be removed by **16 November 2026 at 09:07:37.762 UTC**. Startup and each cached
assessment/image request reject expired data. No automatic deletion is installed.
Older retained evidence has its separate **15 November 2026 at 17:15:22 UTC**
deadline. Neither evidence set is committed or included in the public build.

## Final verification

Formatting, type checks and the 145-page production build passed. All 83 Worker
tests and 40 relevant browser/harness/geometry/budget checks passed across focused
runs (Chrome channel). Tests cover stale images, blob lifetime, local CSP, expiry,
no outbound Solar calls in saved-roof mode, private access and disabled public UI.
The real Google browser displayed the matched image with panels and source
attribution, and Before/With Solar worked without a new request. Desktop and
390px screenshots were inspected; resizing preserves the current map zoom.

The three additional normal-server Maps loads have now been consumed, including
one image-CSP failure corrected before the successful final check. The working
private browser tab remains open. Reloading and starting another map will be
blocked by the exhausted cap; the counter is deliberately not reset. An additional
live allowance requires owner approval. No new Solar call was made in this mode.

## Behaviour and failure handling

A selected Places suggestion supplies its location directly; no separate
Geocoding call is needed. Address edits immediately invalidate the old selection,
image and results. A pin outside returned bounds produces a fallback; being
inside bounds alone does not establish an exact roof match. Expired sessions,
failed image loading and stale responses cannot restore panels or consent context.
The matched PNG is validated, bounded to 8 MB, decoded once and held as an owned
blob URL so the overlay uses the verified bytes. Its URL is revoked on clearing.
Google source attribution remains visible. The approved illustrative 0.85 AC
factor is disclosed in result details.

## Offline demo and earlier live test

`node scripts/solar-owner-preview.mjs` starts the default synthetic demo. It uses
local substitutes for Maps/Places/Turnstile, blocks external calls and labels the
roof as simulated. Select the simulated example and confirm to rehearse the flow.
It is not geographic alignment evidence and needs no keys.

The earlier launcher without `-SsMall` uses the original 3 Maps / 1 Solar allowance
under `.wrangler/solar-owner-live`. That allowance is exhausted and unchanged.
Places is blocked in that mode. Do not reuse or reset that budget. The SS Mall
mode replaces the earlier fragile in-memory browser replay for this review.

Official references: [Places address widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new),
[Solar data layers](https://developers.google.com/maps/documentation/solar/data-layers),
[GeoTIFF interpretation](https://developers.google.com/maps/documentation/solar/geotiff),
[GroundOverlay](https://developers.google.com/maps/documentation/javascript/groundoverlays),
and [key restrictions](https://developers.google.com/maps/api-security-best-practices).
