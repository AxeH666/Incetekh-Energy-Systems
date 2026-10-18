# Private local Solar Preview

This change is for owner review on this computer. It is not a public activation
or a live Google Maps acceptance result. Production and preview Solar flags stay
false; no secret is required by the local demo.

Build with `npm run build`, then run `node scripts/solar-owner-preview.mjs`.
Open **http://127.0.0.1:4333/#solar-planner** on the same computer. Leave the server
running. Stop that process when finished. It binds only to 127.0.0.1 and rejects
foreign Host/Origin and cross-site requests; it is not reachable from a phone or
the internet. `SOLAR_OWNER_PORT` can select another local port.

Choose a bill and connection type, then click **Preview 3/5/7/10 kW on my roof**
on the desired capacity card. Alternatively use the calculator's bill-based
preview button. The selected size is carried in validated temporary session state;
the original bill recommendation remains separate. The 10+ card uses 10 kW as a
clearly disclosed starting point. Choosing the calculator button again clears the
explicit capacity choice. Ordinary enquiry plan prefill reflects the chosen size;
the optional context's bill-based target remains the original calculation.

Click **Open property map**, **Select the simulated example roof**, confirm the
selected building, and confirm the returned roof. Then review the panel layer,
Before/With Solar toggle and results. This is a schematic synthetic fixture with
limited roof capacity. It does not locate or assess an actual property, implement
Google camera behavior, or establish real alignment. The banner states this on
every local page. Local enquiry POST returns unavailable: no receipt is fabricated,
no contact data is saved, and no email or WhatsApp message is sent by this server.

The local harness serves only files under the built `dist` folder and explicit
demo endpoints. It rewrites Google/Turnstile loader URLs in served JavaScript to
local substitutes; it does not alter build artifacts or deployed code. CSP blocks
external requests. The harness and schematic scripts remain outside `dist`.

Public-disabled configuration keeps all five preview buttons hidden. Direct access
to the public preview explains that access is disabled rather than showing the
missing-session error first. The public deployment is unchanged until a separately
authorized release of this local branch.

The owner installed a separate browser key after confirming its restrictions.
The owner approved up to three map loads and one Solar
assessment on 18 October 2026. This approval does not enable public access.
Do not expose the existing server Solar
credential as a browser key. The licensed cached roof may be reused only before
its existing 15 November 2026 expiry. See
[Google key security guidance](https://developers.google.com/maps/api-security-best-practices)
and [release gates](SOLAR-PREVIEW-RELEASE.md). No live calls are made by this demo.

## Approved live mode, separate from the default demo

Create a separate browser key in the existing Google Cloud project with Website
restriction `http://127.0.0.1:4333/*` and API restriction **Maps JavaScript API
only**. Ensure that API is enabled. The supplied server key must remain private.
The browser-control tool failed to initialize during this work, so its actual
Google Cloud restrictions cannot be independently inspected here. The owner must
verify them before saving it. Do not paste keys into chat.

Run `powershell -File scripts/Set-SolarOwnerBrowserKey.ps1` from the repository.
It asks for restriction confirmation and hidden key input, rejects reuse of the
existing server key, and uses Windows-user encryption in a restricted folder
outside Git. It does not make Google requests or overwrite an existing key.
`-Check` verifies local readability only, not Google's configuration.

After stopping the known demo process on port4333, run
`powershell -File scripts/Start-SolarOwnerLivePreview.ps1`. Keep that launcher
running. It passes the two keys through a private stdin pipe, never command-line
arguments, and starts only the loopback server. There is no production deployment
or remote database connection. Enquiry submission remains disabled.

Live mode uses the existing bounded Solar adapter. It reserves at most three
Maps bootstrap attempts and one Solar attempt, **including failures**, in
`.wrangler/solar-owner-live/approved-2026-10-18-budget.json`. The allowance persists
across restarts, uses an exclusive lock and fails closed on corruption or a held
lock. Never delete/reset it to obtain more attempts; another allowance requires
fresh explicit approval. Map scripts load only after the owner clicks Open map.
Reloading and opening another map consumes another attempt. Solar is requested
only after selecting and explicitly confirming a property. Live Places search is
blocked because its billable requests were not included in this approval; click
the map or enter coordinates instead.

`/__owner/allowance` exposes only the remaining local counts. The banner labels
live mode separately and shows a snapshot of these counts. Google requests and
real rooftop visual acceptance must be evaluated separately. No cached roof is automatically used
by this harness. The existing cached response remains subject to its original
expiry and is not committed or copied into the demo.

## Local verification on 18 October 2026

Formatting, type checks, the 145-page production build and all 40 focused tests
passed. The broader run passed 83 Worker tests and 160 browser tests, with one
optional test skipped; its one capacity-link counting failure was corrected and
passed in the focused run. Independent review found no blocking issues.

The approved live test used two Maps loads and one Solar request. The separate
browser key loaded actual satellite imagery without a reported Maps API error.
The fresh assessment returned `available` for the previously approved Proddatur
test location. A subsequent assessment action returned the exhausted-budget
fallback and cleared the visible result; it made no extra provider request.

To finish the visual check without another Solar request, the isolated development
browser replayed the already retained 17 October response for that exact test
coordinate only. Its prominent banner labels the retained data. This is a browser
test override, not a server cache or public behavior. The 5 kW choice selected the
closest returned configuration, 4.8 kW / 12 model panels. Before/With Solar and
390px/1280px rendering worked on the real satellite map. The browser was left open
for owner review. Keep that tab open: navigating away or refreshing discards its
in-memory result. The live server has one Maps attempt and zero Solar attempts
remaining; opening a new ordinary preview cannot obtain another assessment.

This demonstrates the local flow and rendering, not accepted rooftop alignment
or an installation design. Owner confirmation on an actual Incetekh property
remains open. Temporary Google-derived screenshots and the retained response
remain ignored under `.wrangler` and must be removed by the retained evidence
deadline, **15 November 2026 at 17:15:22 UTC**. No automatic cleanup is installed.
Public `/api/solar-preview-config` was checked and returned `enabled: false`.
This branch has not been pushed or deployed.
