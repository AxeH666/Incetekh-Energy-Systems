# Solar Preview v1.2 release evidence

18 October 2026. **Publicly enabled with owner approval; full production acceptance
remains open.** Later owner instructions authorized real Google tests, production
setup and activation, then explicitly removed daily/monthly caps and deferred
quotas/alerts. The six-component disabled release below is historical; the
subsequent release and acceptance audit record the current state.

## Sequential delivery record

| Component                 | PR                                                               | Merge commit                               | Review and verification                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adapter and safeguards    | [35](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/35) | `ac26cfcb7414e1209e145064b4fc5518a1e71a90` | Self and independent exact-head review passed; lint/types/build, 79 Worker and 126 browser tests, separate Worker routing and dry-run bundle passed.                               |
| Alignment proof           | [36](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/36) | `ee0ef773b7cdb46b1ef790456558e5b321a9e250` | Both reviews passed; lint/types/build and 15 geometry/mock browser checks passed. Real-roof acceptance remains open.                                                               |
| Property selector         | [37](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/37) | `56a5936d82690365567f872bf4706a3cebcde851` | Both reviews passed; lint/types/build, 81 Worker and 147 browser cases passed, including corrected targeted reruns.                                                                |
| Calculator and results    | [38](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/38) | `a7f43cd1bdde64fd263116347d93c15e4efe29ea` | Both reviews passed; lint/types/build and 17 focused cases passed; synthetic mobile result inspected. Owner approved disclosed 0.85 AC factor.                                     |
| Consented enquiry context | [39](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/39) | `79335a17325b30e9be3cc63d1da199b3e0426455` | Both reviews passed after consent-race fix; lint/types/build, 83 Worker tests, extended local D1 context/retry test and 156 browser cases covered across full/targeted runs.       |
| Release readiness         | [40](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/40) | `a6e4a0283de0d0c4e744b0583879743d059403e9` | Full lint/types/build, 83 Worker tests, 158 browser tests and separate local Wrangler routing passed. Synthetic recovery passed. Review/deployment closeout is recorded in the PR. |

Production Workers Builds succeeded for PRs 35-40 respectively:
`857e6475-8367-42e4-81fa-ee295fd94677`,
`7f7c88c9-83e8-46c7-b3a3-1d3e9fbb568a`,
`d7afc014-68d5-4461-bf04-37d22d79016c`,
`2b0a89c2-0ce3-4416-95fd-06656e10387a`,
`e12a23ab-95db-4efd-af8c-187c63b6d284`,
`615b6455-b8bb-4f93-a06f-27dd6f69f2ca`.
Each merge was synchronized to local main, followed by live disabled endpoint
checks and retirement of its feature branch before starting the next component.

The one default-skipped browser test requires a local Wrangler server; run it
separately with `PLAYWRIGHT_WORKER=true` and `PLAYWRIGHT_CHANNEL=chrome`.
PR40 full verification passed with `npm run verify`: lint, 108-file type check, production build, 83 Worker tests and 158 browser tests. The default-skipped local Wrangler test passed separately. Synthetic mobile and desktop screenshots were inspected; axe reported no violations in the tested preview states. The recovery report is retained locally at `.wrangler/solar-recovery-gg6_a0_9/report.json`. Tests use synthetic providers and
deny unexpected network calls. No new paid Google requests were made for PR40.

## Subsequent website release

The owner approved the simplified address flow, reference-module dimensions,
matched Google roof imagery and public deployment. The later instruction to use
no daily/monthly limits and defer Google quotas/alerts supersedes the proposed
pilot caps. These decisions do not establish visual or engineering acceptance.

| Change                                                              | PR                                                               | Merge commit                               | Production build                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| Simplified flow and reference modules                               | [41](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/41) | `f8ef1e9b3942707a32b943f1b5208b3752bcda13` | `a766e4f2-47df-4767-bb8d-ddd3d4fa7dd8` |
| Matching imagery and complete roof-mask checks                      | [42](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/42) | `4e35e207e24d232d7d29ede7ddf4ef69a35bd5b6` | `a5cd26a6-a00b-4a57-92ed-8596e8c1e765` |
| Disabled production setup                                           | [43](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/43) | `cb7c12bc008fe771617db52f1ce75cec00ff70c1` | `56911db1-78b8-48ee-a3f6-90bf8fe6e194` |
| Owner-authorized uncapped activation                                | [44](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/44) | `0fc4a11b0d027b16b19e7308a2ad3d3bdcfdb411` | `584e4c30-3197-442d-a5c1-7199d6d5d185` |
| Preserve preview during map zoom; stop repeated verification resets | [45](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/45) | `3fcdc9c1e436cff768daaefeea50b7a1d0ff26cb` | `023146db-1df7-487c-8815-cf082ceb6f57` |
| Distinguish roof mismatch from imagery failure                      | [46](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/46) | `6b93710d407785762529c5cc9c2f083d53a6d8a3` | `fa5b3615-8d01-4ce9-ad4f-46f8b556c6e4` |
| Explicit confirmation of a nearby detected building                 | [47](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/47) | `625bc72a33c6fa9cd882e379602233d8df3f4a98` | `5bcca13b-fc6b-4b10-9dcb-52aeb15e9e84` |
| Smaller roof imagery and bounded streaming download                 | [48](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/48) | `341694abd2d9dfda861dbc187ca923dc51d8a55b` | `2249b815-4526-4b61-95e2-da31e4e89ed4` |

Each component passed self-review, separate exact-head review and required build
checks before merge. Deployments were verified and feature branches retired
before the next component. PR42's broad browser run passed 185 cases, skipped
the opt-in routing case and exposed one synthetic-provider harness omission;
the corrected journey and five raster cases then passed in the focused rerun.
PR44 passed 90 Worker tests and seven targeted browser cases. PR45 passed 30
preview cases; PR46 passed 92 Worker and eight focused browser cases. PR47 passed
lint, 127-file type checks, the 145-page build, 93 Worker tests and 49
preview/foundation browser tests, including the candidate-rendering failure and
retry regression found in independent review.

Before PR48, a full `npm run verify` completed with lint/types/build, 93 Worker
tests and 196 browser tests (one local Wrangler opt-in case skipped). PR48 then
passed lint/types/build, 94 Worker and 55 focused browser/download/foundation
tests, including a real-page simulated 60-second progressing response with one
assessment and no premature cancellation. This is targeted regression evidence,
not a new claim that physical-device acceptance passed.

### Verified production state

At 12:32 UTC on 18 October 2026, the public page and exact deployed script bytes
matched the reviewed PR47 build. Both Solar flags were true, both daily/monthly
limits were `unlimited`, and the allowed origin was `https://incetekhenergy.com`.
All pre-existing non-Solar bindings matched the protected before-release snapshot.
Homepage, contact and preview returned HTTP 200; the private SS Mall route
returned 404. Preview retained noindex/no-store. The read-only usage query showed
18 recorded attempts; no counter was reset. Verification made no new Google calls.

PR48's production build subsequently succeeded. Its live page referenced the new
script and the complete downloaded script matched the reviewed 29,512-byte build
exactly (SHA-256 `26a355822707c379d7d1451a7035d4f9fc94492a5b747af1d5c96a4e12a74f6f`).
At 13:00 UTC the same runtime flags and all non-Solar bindings were rechecked;
homepage/contact HEAD requests returned 200. Intermittent local connection resets
prevented a single combined verifier run; the independently completed page,
artifact, settings and HEAD checks are retained in the PR48 report. HEAD routing
checks are not complete-page downloads or evidence of enquiry/email delivery.

Production keys were installed separately. The owner confirmed browser restrictions
to the production website and Maps JavaScript/Places API (New), and the server
key's Solar-only restriction. These Google Console settings are owner-confirmed,
not independently inspected. Preview environments remain disabled without
production Solar credentials. Turnstile, origin validation, a separate 3/minute
burst limit and atomic usage recording remain enabled. There is no daily/monthly
spend ceiling; Maps/Places usage is separately billed and is not capped by Worker
assessment counters. No paid plan or service was created.

Before migrations 0003/0004, the protected production export was hash-verified,
restored with integrity `ok`, and rehearsed against the additive migrations.
After application at 11:04 UTC, hashes confirmed all three existing enquiry rows
and the one outbox row unchanged. No live test enquiry or email was submitted.
Private exports, keys, real roof responses and imagery are not committed.

### Real-roof evidence and the reported failure

Live browser checks established the 5 kW calculator handoff, map loading and
SS Mall address search. The automated browser's human check failed when the owner
tried it; production security was preserved. The owner subsequently reported one
successful preview in their usual browser, then panels disappearing when clicking
the map to zoom. PR45 corrected that selection-state bug.

Subsequent live traces established `roof_mismatch` even after the owner placed the
pin in the middle. Google's findClosest selects the nearest building centroid,
which can differ from the building containing the pin. PR47 highlights a nearby
candidate and requires explicit property acceptance before panels or roof context
appear. Acceptance reuses the same response without another assessment or human
check. It never moves a building's geometry onto the original pin. A distant
building, invalid mask or unsupported imagery still produces a fallback.

A separate approved provider check made one Building Insights, one Data Layers
and two GeoTIFF requests, returning the SS Mall model and matching imagery dated
14 January 2023. Saved data replayed through the built page and real Worker CSP
rendered nine 550 W reference panels, with all intersected mask cells on roof and
no browser errors. The PR47 replay showed no panels before candidate acceptance
and nine after, without external calls. This is offline software evidence, not
human confirmation that the latest live candidate is SS Mall. The owner's
post-PR47 result failed after roughly a minute. The old page shared a 55-second
deadline across request, download and preparation. PR48 separates these phases,
bounds response size and inactivity, and reduces unnecessary surrounding imagery.
The precise failed phase in the owner's attempt was not captured.

One subsequent imagery diagnostic used one Data Layers and two TIFF calls, with
no new Insights or Maps request. A 50 m radius retained the same date and 0.25 m
pixel-size request, reducing the two-image payload by about 75%. Its replay still
rendered nine panels with all footprint mask checks and no browser errors. The
owner confirmed the live post-PR48 result: "Yes—panels appear correctly" after
refreshing and testing SS Mall. This closes the reported SS Mall rendering failure;
it does not establish residential coverage or engineering approval. Fresh diagnostic artifacts expire
25 October 2026 and remain private.

The reference module is Waaree AHNAY Bi-55-550, 2.272 × 1.133 m. A 5 kW request
can show a nine-panel 4.95 kWp concept. This rearranged layout has no assigned
generation/savings estimate; Google's original model remains distinct. Neither
mask acceptance nor a neat grid proves obstacle clearance, access, structural
safety, setbacks, mounting suitability or an engineer-approved design.

## Completion and acceptance audit

| Requirement                      | Established evidence                                                                                                                              | Remaining acceptance or limitation                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Six sequential components        | PR35–40, exact-head self/independent review, validation and verified disabled deployments above                                                   | No implementation PR outstanding from the six-part sequence                                                                                          |
| Bill → property → roof → enquiry | Real calculator/map/address handoff; owner-confirmed post-PR48 SS Mall panels; synthetic complete Worker/D1 journey; session, language, capacity, consent and retry tests | Separately approved genuine enquiry, receipt and inbox confirmation |
| Geographic panels and comparison | Geometry tests; complete raster-mask intersection; real saved roof replay; Before toggles panels without a new assessment                         | Human review of actual residential/commercial roofs and real Maps anchoring during pan/zoom/resize; no survey-accuracy claim                         |
| Calculations                     | Bill need distinct from roof configuration; consistent count/watts/DC; owner-approved disclosed 0.85 AC factor; INR 8/unit illustration           | Hardware, consumption/export credit and local losses require site-specific confirmation; no energy estimate assigned to rearranged reference modules |
| Failures                         | No coverage, wrong/distant building, changed selection, stale session, imagery/projection/mask failure, provider failure, rate/cap and Maps tests | Representative residential coverage and actual restricted-key failure checks remain unverified                                                       |
| Mobile/accessibility             | Responsive, keyboard, status and axe checks; automated small-screen journeys                                                                      | Real Android/iPhone, native Maps/Places gestures, screen-reader journey and attribution visibility                                                   |
| Existing enquiries/email         | Legacy receipt/schema tests, real export/rehearsal, unchanged row hashes and runtime bindings                                                     | No new live enquiry or inbox acceptance claimed                                                                                                      |
| Credentials/cost                 | Protected separated keys, owner-confirmed restrictions, exact origin, Turnstile, burst protection, usage counters                                 | Google restrictions/billing eligibility not independently inspected; quotas/alerts explicitly deferred; daily/monthly limits explicitly unlimited    |
| Privacy/SEO                      | Noindex/no-store, sitemap exclusion, preview-only CSP, intent before Maps, session-only state and optional enquiry context                        | Real-device attribution and final policy acceptance; private fresh provider artifacts expire 25 October 2026 and must not become fixtures            |
| Production release               | Owner authorized activation; PR44 enabled; latest PR48 successful build, exact live artifact verified and SS Mall result confirmed by owner | Broader real-roof/device gates remain open; SS Mall acceptance does not establish universal coverage |

The preview entry budget is explicitly 30 KB (29,512 bytes at PR48); its complete
dependency graph remains below 500 KB. Other scripts retain 15 KB and shared
assets 2.1 MB. Tests verify preview raster dependencies stay off ordinary pages.

## Operations and rollback

Normal rollback disables Solar only, verifies disabled runtime configuration and
assessment responses, and leaves lead capture/email running. Already loaded maps
or in-flight requests may finish. Preserve additive schema, usage counters,
enquiries, receipts and outbox records. Never restore an old database over newer
enquiries or reset counters to bypass controls. Recovery requires reconciliation.

Preserve the existing email cutoff `2026-10-17T10:26:08.400Z` and five-minute cron.
WhatsApp notification/webhook flags remain false; customer-facing WhatsApp links
remain available. Preview email stays disabled. Do not backfill old leads.

If live enquiry acceptance is separately approved, send one controlled request,
verify the same receipt on an identical retry and one outbox notification, and
obtain inbox confirmation. Do not infer delivery from HTTP routing or local mocks.

Operational references: [setup and diagnostics](SOLAR-PUBLIC-SETUP.md),
[implementation and assumptions](SOLAR-PREVIEW.md),
[Google Solar policies](https://developers.google.com/maps/documentation/solar/policies),
[nearest-building behavior](https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest),
[key restrictions](https://developers.google.com/maps/api-security-best-practices).

**Release status: publicly enabled with owner approval; full production acceptance
is not established.** The remaining gates above must not be reported as passed.
