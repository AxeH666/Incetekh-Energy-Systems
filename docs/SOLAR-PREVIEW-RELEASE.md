# Solar Preview v1.2 release evidence

18 October 2026. **Disabled implementation; NOT production-accepted or approved
for public activation.** The owner approved implementation, six sequential PRs
and normal automatic deployments. Public enablement, paid Google calls, remote
migrations and live customer-data changes remain outside this execution.

## Sequential delivery record

| Component                 | PR                                                               | Merge commit                               | Review and verification                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adapter and safeguards    | [35](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/35) | `ac26cfcb7414e1209e145064b4fc5518a1e71a90` | Self and independent exact-head review passed; lint/types/build, 79 Worker and 126 browser tests, separate Worker routing and dry-run bundle passed.                               |
| Alignment proof           | [36](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/36) | `ee0ef773b7cdb46b1ef790456558e5b321a9e250` | Both reviews passed; lint/types/build and 15 geometry/mock browser checks passed. Real-roof acceptance remains open.                                                               |
| Property selector         | [37](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/37) | `56a5936d82690365567f872bf4706a3cebcde851` | Both reviews passed; lint/types/build, 81 Worker and 147 browser cases passed, including corrected targeted reruns.                                                                |
| Calculator and results    | [38](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/38) | `a7f43cd1bdde64fd263116347d93c15e4efe29ea` | Both reviews passed; lint/types/build and 17 focused cases passed; synthetic mobile result inspected. Owner approved disclosed 0.85 AC factor.                                     |
| Consented enquiry context | [39](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/39) | `79335a17325b30e9be3cc63d1da199b3e0426455` | Both reviews passed after consent-race fix; lint/types/build, 83 Worker tests, extended local D1 context/retry test and 156 browser cases covered across full/targeted runs.       |
| Release readiness         | PR 6                                                             | Recorded in the PR merge event             | Full lint/types/build, 83 Worker tests, 158 browser tests and separate local Wrangler routing passed. Synthetic recovery passed. Review/deployment closeout is recorded in the PR. |

Production Workers Builds succeeded for PRs 35-39 respectively:
`857e6475-8367-42e4-81fa-ee295fd94677`,
`7f7c88c9-83e8-46c7-b3a3-1d3e9fbb568a`,
`d7afc014-68d5-4461-bf04-37d22d79016c`,
`2b0a89c2-0ce3-4416-95fd-06656e10387a`,
`e12a23ab-95db-4efd-af8c-187c63b6d284`.
Each merge was synchronized to local main, followed by live disabled endpoint
checks and retirement of its feature branch before starting the next component.

The one default-skipped browser test requires a local Wrangler server; run it
separately with `PLAYWRIGHT_WORKER=true` and `PLAYWRIGHT_CHANNEL=chrome`.
PR 6 full verification passed with `npm run verify`: lint, 108-file type check, production build, 83 Worker tests and 158 browser tests. The default-skipped local Wrangler test passed separately. Synthetic mobile and desktop screenshots were inspected; axe reported no violations in the tested preview states. The recovery report is retained locally at `.wrangler/solar-recovery-gg6_a0_9/report.json`. Tests use synthetic providers and
deny unexpected network calls. No new paid Google requests were made.

## Evidence boundaries

| Requirement             | Established                                                                                                                                                                         | Still required before public activation                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bill to roof to enquiry | Synthetic browser journey through real Worker/local D1; same bill/type/target, consistent configuration/count/DC/AC/value, consented inputs, retry receipt, one outbox notification | Controlled approved preview deployment and one approved live enquiry with receipt and actual inbox confirmation                                                |
| Panel geometry          | Axis/orientation/pitch tests; geographic polygons; first N candidates; single map, Before toggle and no repeat Solar request                                                        | Owner-approved actual Incetekh residential and commercial roofs; satellite identity, imagery age, obvious spills and correct orientation reviewed by a human   |
| Alignment               | Synthetic geographic-coordinate, panel-layer count and viewport overflow checks; no-op mock camera methods do not establish renderer anchoring                                      | Live Google Maps pan/zoom/resize and mobile pixel ratios; at most 1 CSS pixel renderer-anchor drift, not a claim of survey precision                           |
| Mobile/accessibility    | Automated 390px/1440px flows and axe checks; existing responsive/keyboard tests                                                                                                     | Real Android/iPhone/desktop review, keyboard and screen-reader journey, native Maps/Places interaction and unobscured attribution                              |
| Failures                | Wrong building, changed/unclear roof, stale response, provider/cap/config failures, Maps failure and manual visit fallback tests                                                    | Real browser key restriction failures and representative regional coverage checks under separately approved request budget                                     |
| Data/receipts/email     | Legacy hash and old-schema compatibility; strict consent allowlist; local D1 additive migration/retry/conflict/email isolation tests                                                | Actual preview D1 migration and recovery verification; approved production recovery point before any migration                                                 |
| Recovery                | Synthetic SQLite backup hash, restored integrity, old fields/receipts/outbox preserved, migrations 0003/0004 and legacy insert passed                                               | Cloudflare D1 recovery/export rehearsal against an approved copy; identify recovery owner and reconcile any later enquiries before a restore                   |
| Cost/security           | Disabled defaults; strict config, origin/Turnstile, isolated rate limit, atomic attempt budget, no raw provider logs                                                                | Verify actual account billing/India eligibility, API enablement, restricted keys, quotas, alerts, final daily/monthly limits and separate environment bindings |
| Privacy/SEO             | Noindex route excluded from sitemap; one-page nonce CSP; explicit map intent, temporary session/Google state, optional enquiry context                                              | Final policy review and real Google attribution visibility; no cached real response retained beyond licensed expiry                                            |

## Controlled activation checklist (requires separate approval)

1. Keep `SOLAR_PREVIEW_ENABLED=false` during preparation. Obtain the actual-property
   and Maps/live-test approvals and a bounded request budget. The previously
   approved temporary response expires **15 November 2026**; do not extend its
   retention or publish it as a fixture. New calls after expiry require approval.
2. In the actual Google project, verify billing, India pricing eligibility and
   enabled APIs: Maps JavaScript, Places API (New), Solar. Use separate development,
   preview and production browser/server credentials; exact approved referrers and
   API restrictions. Do not expose the Solar server secret. Cloudflare shared
   egress is not a dedicated IP restriction. Review browser API quota/cost exposure;
   application Solar counters do not cap direct Maps/Places spend.
3. Verify live preview D1 and a recoverable production export/point before approved
   additive migrations `0003_solar_usage.sql` and `0004_solar_preview_context.sql`.
   Check existing counts, receipts and outbox state before/after without changing
   existing enquiries. Never apply remote migrations automatically from CI.
4. Supply the explicit Solar daily/monthly limits (implementation maximum 50/300),
   unique 3/minute Solar rate namespace, allowed origin, browser key, Solar secret,
   Turnstile public/secret configuration and rate-key secret in the proper
   environment. See [implementation setup](SOLAR-PREVIEW.md). Quotas and alerts
   must supplement application limits; alerts alone do not stop spend.
5. Enable only the approved preview environment, check the complete real-roof
   journey, fallback paths and real devices, then record owner Gate E sign-off.
   Verify the disclosed 0.85 AC factor remains acceptable for the intended use;
   its implementation was approved, not its accuracy for every Indian roof.
6. Obtain explicit public activation approval. Enable production separately and
   perform the approved controlled enquiry/inbox check. Observe aggregate request
   counts/status/latency and enquiry completion without logging bills, coordinates,
   contact details, tokens, raw IPs or Google content. No analytics service added.

## Disabled deployment and rollback

Both production and preview Solar flags remain false. The runtime config must
return exactly `{"enabled":false}`; Solar POST must return 503 with `disabled`
without touching Google or D1. Check homepage/contact/privacy/preview HTTP 200,
preview noindex/no-store, and enquiry GET 405. A GET 405 proves routing, not live
submission or inbox delivery. No live enquiry POST is part of disabled smoke tests.

Preserve existing production lead capture and email enablement, the fixed
`2026-10-17T10:26:08.400Z` email cutoff and five-minute cron. WhatsApp notification
and webhook flags remain false. Do not enable preview emails or backfill old leads.

Normal rollback is to disable Solar, verify runtime config and endpoint closure,
and leave lead capture/email running. New map initialization and assessments are
blocked; already loaded maps or in-flight requests may finish. Use a reviewed code
rollback if needed while preserving additive schemas, new enquiries and outbox
records. Do not reset the usage counter to bypass limits, drop columns/tables or
restore an old database over newer enquiries. Recovery requires a separately
approved reconciliation procedure.

## Operational references

- [Google Solar policies and attribution](https://developers.google.com/maps/documentation/solar/policies)
  checked 18 October 2026. Keep native attribution visible, Solar source text near
  the map and "Includes data from Google Maps" with derived results.
- [Google non-US calculations](https://developers.google.com/maps/documentation/solar/calculate-costs-non-us)
  informs the DC/AC distinction. INR 8/unit is an illustrative value, not a tariff
  lookup or guaranteed bill saving.
- [Implementation details and configuration](SOLAR-PREVIEW.md)
  and `python scripts/solar-migration-rehearsal.py` for offline recovery evidence.

Public readiness: **No**, until the live-data, configuration, device and owner
acceptance gates above are actually passed. Merged disabled code is not evidence
that real rooftop alignment or production acceptance succeeded.
