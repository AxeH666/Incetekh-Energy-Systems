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

| Order | Component                                               | Status      |
| ----- | ------------------------------------------------------- | ----------- |
| 1     | Server adapter, safeguards and atomic usage allowance   | Merged #35  |
| 2     | Geographic panel geometry and alignment proof           | In progress |
| 3     | Property selector and confirmed assessment              | Pending     |
| 4     | Existing calculator handoff and consistent results      | Pending     |
| 5     | Consented enquiry context and compatible receipts/email | Pending     |
| 6     | Release readiness and acceptance evidence               | Pending     |

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
The selected pin and returned building are distinct. Later UI must confirm the
returned building; a bounding box is not a surveyed roof outline.

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
