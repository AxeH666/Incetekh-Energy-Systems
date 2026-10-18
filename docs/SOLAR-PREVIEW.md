# Solar Preview v1.2 implementation and acceptance

## Authority and sequence

The owner authorized the six-PR implementation, independent review, merge and
normal Git-triggered deployments on 18 October 2026. Solar Preview must remain
publicly disabled until separate approval. No billable Google calls, paid service
creation or production enquiry changes are authorized by that deployment grant.

The supplied `Solar visual work/Incetekh_Solar_Preview_Product_Spec_v1.2.md` is
the product authority. The approved sequence comes from the local owner plan at
`.wrangler/solar-preview-planning/PLAN.md`; retain that original unchanged.
SolarCAD is excluded.

| Order | Component                                               | Status     |
| ----- | ------------------------------------------------------- | ---------- |
| 1     | Server adapter, safeguards and atomic usage allowance   | Merged #35 |
| 2     | Geographic panel geometry and alignment proof           | Merged #36 |
| 3     | Property selector and confirmed assessment              | Merged #37 |
| 4     | Existing calculator handoff and consistent results      | Merged #38 |
| 5     | Consented enquiry context and compatible receipts/email | Merged #39 |
| 6     | Release readiness and acceptance evidence               | PR 6       |

Exactly one component/PR is active. Each must pass self-review, independent
review, relevant validation and deployment verification before the next branch.
The goal permits mock/local development where live approval is unavailable;
that never constitutes real-rooftop visual acceptance. Real placement and owner
approval remain release gates. On 18 October 2026 the owner approved the disclosed
0.85 DC-to-AC factor for the illustrative estimate in PR 4.

## PR 1 design

Released as PR #35, merge `ac26cfcb7414e1209e145064b4fc5518a1e71a90`.
Self-review and separate exact-head review passed. Full verification passed:
lint/types/build, 79 Worker tests, 126 browser tests and an additional opt-in
Worker routing test. Production build `857e6475-8367-42e4-81fa-ee295fd94677`
succeeded. Live homepage/contact returned 200, enquiry GET retained 405, and Solar
POST returned 503 `disabled`. No customer enquiry was submitted or changed.

`POST /api/solar-assessments` is independent of `/api/site-visits` and the email
dispatcher. Production and preview configuration explicitly disable it. The
disabled route returns 503 with `status: disabled`, without accessing a database,
Turnstile or Google. Existing assets, enquiry receipt hashes and email settings
are unchanged. There is no new frontend in this PR.

An enabled request requires one exact allowed origin, JSON, a bounded 4 KB body,
numeric latitude/longitude and a Turnstile token with action `solar_assessment`.
The initial service envelope is 12–20 degrees north and 75–85 degrees east:
a coarse Andhra Pradesh/neighbouring-region bound, not an exact state boundary
or promise of service. A separate 3/minute rate namespace is required before
activation. Rate keys are daily, Solar-specific HMACs; raw IPs are never persisted.

After security verification, one SQLite statement reserves both daily and monthly
allowance in an additive `solar_usage` table. Its UTC periods come from SQLite,
so a delayed request cannot reset the counter using an older caller date.
Reservations precede outbound attempts; failures, timeouts and ambiguous results
are not refunded. Database failure prevents an upstream request. The table is a
single aggregate counter with no customer or Google content. It is a strict
application request cap, not a cap on calls made elsewhere in the Google project.

The provider request uses only the fixed Building Insights endpoint, BASE minimum
quality, a server secret in `X-Goog-Api-Key`, a 10-second timeout and a 2 MB response
limit. Redirects are returned manually and treated as failures; there are no
automatic retries. The adapter retains original panel order, model dimensions,
segment orientation, returned bounds, dates and configurations. Invalid geometry
or missing configurations produces a fallback; no replacement panels are made up.
The selected pin and returned building are distinct. The private simplified UI
rejects a returned bounding box that excludes the pin. This is only an obvious
mismatch check: a bounding box is not a surveyed roof outline or alignment proof.

Results are a discriminated `available`/fallback contract with `data_available`.
Provider configuration failure, throttling, no coverage and transient errors are
distinct. Public responses and logs exclude provider error bodies and credentials.
Responses are `no-store`; the only emitted application event contains status and
duration. No Google geometry, response, address, bill or precise location enters
D1 or email. A reference is a random journey identifier, not a saved roof design.

## Configuration and migration gate

Leave `SOLAR_PREVIEW_ENABLED=false` in both deployed environments. Missing config
fails closed. No secrets, Solar rate binding, remote migration or Google quota
changes are installed by this PR.

Before an owner-approved live test:

1. Verify the correct Google project/billing account, Solar API enablement and
   pricing eligibility. Restrict the server key to Solar API; install it as the
   runtime secret `SOLAR_API_KEY`, never as a PUBLIC build value. Worker egress is
   not a dedicated static IP. Do not claim a browser-referrer restriction protects
   this server credential. Verify applicable quotas and billing alerts; alerts
   alone do not stop spending.
2. Set `SOLAR_ALLOWED_ORIGIN` to the exact approved host. Production is only
   `https://incetekhenergy.com`; an explicit isolated workers.dev preview is allowed,
   but the production Worker alias is rejected. Preview must use its own existing
   database and challenge credentials. Do not share production data or secrets.
3. Set explicit positive `SOLAR_DAILY_LIMIT` and `SOLAR_MONTHLY_LIMIT` only after
   budget approval. Code ceilings are 50/day and 300/month; defaults are absent,
   which disables requests. They count attempts, not successful assessments.
4. Allocate a verified-unused `SOLAR_RATE_LIMIT` namespace separate from the lead
   limiter and other environments, with 3 attempts/60 seconds. Require a real
   Turnstile secret and the existing sufficiently long `RATE_LIMIT_KEY_SECRET`.
   Google provider quotas remain a second defence. Do not change lead limits.
5. Verify recovery/export before applying `0003_solar_usage.sql` to an approved
   database. Rehearse against a local copy, verify existing receipts/counts remain
   unchanged, and apply the additive table only. The existing application tolerates
   this extra table. Missing migration disables only Solar. Roll back flags/code;
   never drop enquiries, restore over new leads or reset usage to recover budget.
6. Obtain approval for the exact property and maximum outbound calls. Enable only
   the controlled environment after genuine challenge/configuration checks. One
   confirmed assessment produces at most one Solar call. Inspect identity, quality,
   imagery acquisition versus processing dates and coverage. A returned neighbour
   must not be accepted as the customer's building.

PR 2 can use the previously retained, licensed temporary response only while its
documented cache permission remains valid (the owner plan records 15 November
2026 expiry). Do not commit it or copy it into permanent fixtures. A Google map
load requires separate approval even if no new Solar request is needed. Permanent
test data is entirely synthetic. Provider content remains in memory/no-store.

## Validation and remaining acceptance

Run `npm run verify`. Worker tests use local workerd/D1 and replace every outbound
request. They cover normalization, unavailable data, method/origin/body validation,
security action/hostname, burst denial, bounded provider failures, timeout and
atomic daily/monthly reservation races. Existing enquiry/email regression tests
remain required. Owner source specifications are excluded from formatter writes
to preserve their original contents.

No mock or source check establishes live Google configuration, paid-call approval,
correct real-rooftop alignment, device acceptance, inbox delivery or public
activation approval. Keep those gates explicit in the final release record.

## PR 2 local alignment proof

Released as PR #36, merge `ee0ef773b7cdb46b1ef790456558e5b321a9e250`.
Self-review and independent exact-head review passed, with lint, types, build and
15 focused tests. Production build `7f7c88c9-83e8-46c7-b3a3-1d3e9fbb568a`
succeeded. Homepage/contact stayed healthy; enquiry GET remained 405 and Solar
POST remained disabled. The local harness URL returned 404 in production.

`src/lib/solar-geometry.ts` converts each returned panel centre into four
geographic corners. The long axis follows the segment azimuth for portrait,
and crosses it for landscape. Only the slope-axis length is foreshortened by
cosine(pitch). Metre offsets use a local tangent plane and latitude-aware longitude
scale. This is preliminary panel geometry, not survey accuracy. Configurations
use exactly their original first N candidates, without sorting or manual shifts.

`src/lib/solar-map.ts` creates one north-up, zero-tilt satellite map and native
geographic polygons. Before detaches every proposed panel; With Solar reattaches
them without another map load. Existing attribution remains owned by Google.
Unsupported rotation is omitted. A late Google authentication failure clears
panels and invalidates the proof, even after the load callback has completed.

The harness under `scripts/` runs only on loopback and is not in `dist/`, sitemap
or production routing. It never fetches Solar data. Each HTML response generates
a fresh nonce for script/style CSP, following Google's strict-CSP guidance.
The existing site's policy remains unchanged. PR 3 must apply that per-response
approach only to the customer preview route, without a static reusable nonce.

To prepare a manual check after approving the Maps load, use the still-valid
retained response and its actual cache expiry (do not extend its lifetime):

```powershell
$env:SOLAR_ALIGNMENT_ROOF = '.wrangler/solar-feasibility/temporary-google-data/request-2.json'
$env:SOLAR_ALIGNMENT_EXPIRES = '2026-11-15T00:00:00Z'
node scripts/solar-alignment-server.mjs
```

Open `http://127.0.0.1:4332`, enter an appropriately restricted development browser
key and explicitly load the approved map. No map loads automatically. The server
refuses absent/unusable/expired roof content and serves it with no-store. Shut it
down after testing. Do not use its synthetic test mode as real property evidence.

Offline geometry and mocked-browser checks cover axis signs, cardinal/non-cardinal
bearings, portrait/landscape, pitch, latitude scaling, exact candidate count, layer
cleanup, one map load, Before/With Solar, late auth failure, fresh CSP nonces and
mobile/desktop overflow. The synthetic screenshots explicitly state they are not
satellite imagery. These tests do not prove real Google projection/imagery match.

**Still open:** authorized Maps load, actual-roof identity, model alignment on
satellite imagery, stable pan/zoom/resize at device pixel ratios, unobscured live
attribution and owner visual acceptance. Do not claim PR 2's live visual gate has
passed or publicly activate the eventual preview based on mocks.

## Official references verified during implementation

- [Building Insights contract and first-N panel configuration](https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest)
- [Solar policy and attribution](https://developers.google.com/maps/documentation/solar/policies)
- [Maps service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- [Cloudflare rate limiter semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Google Maps strict CSP](https://developers.google.com/maps/documentation/javascript/content-security-policy)
- [Google geographic polygon overlays](https://developers.google.com/maps/documentation/javascript/shapes)

Use Google Maps for mapped Google Solar results and keep attribution visible.
Before activation, update public privacy/terms and verify browser API restrictions,
CSP, retention and current account-specific licensing. Do not infer permission to
permanently archive rooftop content from permission to retain a Place ID.

## PR 3 property selector

Released as PR #37, merge `56a5936d82690365567f872bf4706a3cebcde851`.
Self-review and independent exact-head review passed. Lint/types/build, 81 Worker
tests and 147 browser cases passed (143 in the full run; four artifact-budget/count
and accessibility-timeout failures corrected and rerun successfully). The optional
local Worker-routing case was skipped. Production build
`d7afc014-68d5-4461-bf04-37d22d79016c` succeeded; homepage/contact/preview returned
200, preview stayed noindex, enquiry GET stayed 405, runtime config returned
`enabled:false`, and Solar POST returned 503 `disabled`. Feature branch retired.

`/solar-preview/` is an English, noindex route with no translated variants or
sitemap entry. It remains disabled in production and preview. A runtime config
endpoint exposes public browser/widget keys only with the enabled flag, approved
origin and valid server safeguards. Missing keys, limits or bindings fail closed.
Before each map initialization the client rechecks the runtime shutoff.

The enabled route alone receives a fresh per-response script/style nonce and
Google-compatible CSP through HTMLRewriter. Other routes retain their existing
policy. Maps loads only after the visitor sees the privacy notice and explicitly
opens address search. Search requests only location fields. Map selection is the
fallback when search fails; no browser geolocation is requested. Coordinate input
fields have been removed from the simplified private flow.

A selected blue marker requires one explicit **Confirm roof & preview** action.
The owner-requested private revision removes the second confirmation. Obvious
returned-building mismatches show no panels; diagnostic markers disappear when
the preliminary layout is shown. Editing the address, moving the
pin or choosing another search result immediately invalidates the old assessment,
including while Places details are pending. Late responses are discarded. Wrong,
changed or unclear roofs, quota failures and unavailable maps retain a manual
visit path. Provider content is held only in browser memory.

Before controlled enablement, supply restricted `SOLAR_MAPS_BROWSER_KEY` and
`SOLAR_TURNSTILE_SITE_KEY` alongside the server prerequisites above. Browser keys
are intentionally public; exact referrer/API restrictions and verified quotas are
mandatory acceptance checks. This PR installs neither keys nor migrations.
Automated browser checks exercise actual built HTML and Worker CSP with synthetic
Maps/Places/Turnstile/Solar substitutes; all outbound provider traffic is blocked.
These checks establish flow/state behavior, not real map or device acceptance.

## PR 4 calculator handoff and results

Released as PR #38, merge `a7f43cd1bdde64fd263116347d93c15e4efe29ea`.
Self-review and independent exact-head review passed. Lint/types/build and 17
focused tests passed; synthetic mobile results were inspected. Production build
`2b0a89c2-0ce3-4416-95fd-06656e10387a` succeeded. Homepage/contact/preview stayed
healthy, the preview remained noindex, enquiry GET stayed 405, runtime config
returned `enabled:false`, and Solar POST stayed 503 `disabled`. Branch retired.

The existing calculator gets a runtime-gated English preview CTA; it remains
hidden while the feature is disabled. No Google payload loads on ordinary pages.
The handoff stores only a strict versioned bill, connection type, originating
language and creation time in sessionStorage for 30 minutes. It never stores
coordinates, contact details, Google content or calculated output. Preview
recomputes `estimateSolar`; invalid, expired or unavailable storage gives a clear
calculator/manual-visit path. Reload and return preserve valid calculator inputs.
The preview remains English, with return and enquiry links in the originating
language. Bill and location values never enter navigation URLs.

The bill-based target stays visible when roof data is unavailable or insufficient.
Default rooftop selection is the closest actual returned configuration, with ties
toward the smaller count. Selection changes reuse the same in-memory assessment
and map. Displayed panel count, first-N polygons, capacity (count times model watts)
and annual DC energy all refer to that same configuration. An explicit comparison
shows the target difference and modeled maximum, with the prescribed insufficient
space message when the maximum is below the bill target.

The owner approved the disclosed 0.85 DC-to-AC factor on 18 October 2026. The
versioned illustration applies it once to Google's annual DC estimate; it is not
measured local inverter efficiency. Monthly AC is annual AC / 12. Illustrative
monthly generation value is annual AC times INR 8 / 12, conditional on all energy
being used or credited at that rate. Fixed charges, actual export credit,
consumption timing and seasonality are excluded; no guaranteed bill reduction,
new ROI model or committed hardware is claimed. Original calculator estimates
remain separate. Changed, unclear or misplaced roofs clear panels and results.

Tests cover strict session validation/expiry, storage denial, language/back/reload
flow, sparse configurations, tie breaking independent of returned order, tiny roofs,
maximum commercial input, consistent count/energy/value and no extra provider
requests during configuration changes. Synthetic results are not real-roof evidence.
See Google's [non-US calculation guidance](https://developers.google.com/maps/documentation/solar/calculate-costs-non-us)
for the distinction between returned DC energy and a locally chosen AC factor.

## PR 5 consented enquiry context

The preview reuses SiteVisitForm and the existing receipt endpoint. Contact details
are requested only at the final enquiry step. The editable location description
is customer-entered; Google addresses are never copied into it. Bill-target plan
prefill uses only exact3/5/7kW options,10plus for at least10kW, and advice otherwise.
Customers can change it. Enquiries preserve the originating site language.

A separate unchecked consent box attaches a strictly allowlisted/versioned object:
customer bill, residential/commercial type, validated bill-based target/version,
selected coordinates, optional preferred contact, consent and internal UUID.
Google geometry, addresses and energy estimates are rejected. The reference is
not a saved/replayable design. Unchecking consent excludes the entire object.
Selecting another property invalidates consent. Email preference requires an email.
Ordinary enquiries remain available without any context. Maps and the enquiry use
one Turnstile loader with separate widgets and actions; no token is shared.

Migration0004 adds one nullable preview_context column. It has NOT been applied
remotely. Context-free inserts do not mention this column, and email discovery
works with both schema versions; its formatter allowlists fields. Thus the
disabled deployment does not depend on migrating production. Existing receipt
hashes and privacy versions remain exact for requests without context. New hashes
cover canonical context/consent, so identical retries acknowledge the same receipt
and changed inputs conflict. New context requires the Solar flag; existing
receipts can still be acknowledged after shutoff. No email scheduling, cutoff,
recipient, idempotency, lease or delivery behavior changes.

Local workerd/D1 tests cover pre-migration ordinary traffic/email, exact legacy
hash compatibility, additive-column preservation, concurrent consented retries,
changed-context conflicts, one outbox/email, invalid context and shutoff isolation.
All external calls are mocked. Browser tests cover two isolated security actions,
one script load, exact target prefill, origin language, explicit consent, receipt
retry identity and omission after consent withdrawal. Privacy/terms explain Google
processing, temporary state and optional sharing; the detailed English-preview
notice is language-marked, and the calculator notice is updated in all languages.

Before any approved remote migration, verify a recovery export/point and rehearse
against a local copy. Apply only additive migrations0003/0004; never rewrite or
remove existing enquiries. Verify old counts/receipts after migration. Roll back
flags/code while retaining additive columns and new customer records. Live preview
D1, controlled production enquiry/inbox confirmation and public activation remain
separate acceptance gates; local mocks do not establish them.

## PR 6 release readiness

See [release evidence and activation gates](SOLAR-PREVIEW-RELEASE.md). The complete
calculator-to-enquiry browser journey now runs through the real Worker and local
D1 with synthetic Google, Turnstile and email providers. It verifies the exact bill
target, roof limitation, consented persistence, receipt retry, one reserved Solar
attempt and one accepted email outbox entry. Additional checks cover wrong-roof
reselection, late Maps failure, manual enquiry availability and mobile/desktop
automated accessibility. They do not establish real Google imagery or device
acceptance.

The offline `python scripts/solar-migration-rehearsal.py` command creates a unique
ignored folder containing synthetic SQLite databases and a hash report. It checks
backup/restore integrity, preserved enquiry fields/receipts/outbox, additive
migrations and legacy inserts. It cannot connect to production and does not
establish Cloudflare D1 recovery readiness. Retain its evidence until live recovery
and acceptance are separately approved.

Derived results include the current "Includes data from Google Maps" attribution
alongside the Solar-specific source statement. Native map attribution must remain
visible; final real-device review is still required. See Google's
[Solar attribution policy](https://developers.google.com/maps/documentation/solar/policies),
checked 18 October 2026.

## Reference-module layout and panel visibility (private revision)

The owner accepted the matched overhead SS Mall image as the visual target for
the website and authorized official manufacturer dimensions. Public activation
remains disabled. The general matched-imagery service is not implemented; the
current retained image is specific to SS Mall.

The reference is **Waaree AHNAY Bi-55-550: 550 W, 2.272 by 1.133 m**, verified on
18 October 2026 against the [official datasheet](https://waaree.com/upload/media/datasheet_bi_55_520_550_12_03012025_1756379026.pdf).
It is a specific documented model, not a universal panel size, inventory promise,
partnership or procurement decision. The nearest whole-panel count changes with
selected capacity; module dimensions never stretch:

| Selected capacity | Reference panels | Array DC nameplate |
| ----------------- | ---------------- | ------------------ |
| 3 kW              | 5                | 2.75 kWp           |
| 5 kW              | 9                | 4.95 kWp           |
| 7 kW              | 13               | 7.15 kWp           |
| 10 kW             | 18               | 9.90 kWp           |

`moduleLayout` builds **new centers and footprints** inside an intact rectangular
provider-candidate patch. It tries at most three bounded patch searches. The patch
helper retains a surrounding candidate ring and rejects unsupported counts,
incomplete grids and nearly flat segments with undefined azimuth. Its 100,000
operation budget includes cell lookup, bucket candidates, overlap pairs and corner
checks. Geometry remains within returned building bounds. The final rectangle is
inset 0.25 m from the candidate patch; that is a model filter, not a code setback.

A disclosed 20 mm roof-plane module gap is projected by roof pitch along the slope.
It is only a visualization assumption, not an approved mounting clearance. The
[Waaree installation manual](https://waaree.com/upload/media/wel_installation_manual_04_2024_c_compressed_1754071109.pdf)
recommends at least 10 to 10.5 mm between modules for thermal expansion; mounting
hardware and the full installation still require project-specific design. The
concept follows the modeled roof plane: raised racks, row shading, access routes,
obstacles, drainage, loads and structural suitability are not established. An
engineer must check those and the actual mounting manual on site.

The reference layout hides Google's original configuration's energy and savings.
Those numbers return only when explicitly comparing the unmodified Google first-N
configuration. New module geometry is never passed to yield or enquiry calculations.
If a candidate patch cannot support the module grid, the UI explicitly says so and
shows the original Google model instead. Failure to place a grid is not a finding
that the physical roof has no room. `Closer view` changes camera framing only.

For SS Mall, the 5 kW selection produced a 3 by 3 array: nine 550 W modules,
4.95 kWp. All 729 sampled footprint points fell on the retained mask. The current
conservative patch filter could not propose the 7/10 kW reference grids on that
roof; it returns the labeled original-model fallback. No feasibility or clearance
claim follows from these samples. The approved single Maps load displayed the new
geometry on matching Google imagery; no new Solar or Places request was needed.

References: [Google configuration and orientation contract](https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest),
[roof coverage limitations](https://developers.google.com/maps/documentation/solar/search-buildings),
and [NREL site-assessment guidance](https://docs.nrel.gov/docs/fy10osti/46078.pdf).
