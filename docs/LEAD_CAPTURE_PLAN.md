# PR #29 plan: durable Free Site Visit enquiries

**Status: local implementation approved on 15 October 2026.** This document records
the reviewed design and its original baseline. Implementation and operations are
tracked in [LEAD_CAPTURE.md](LEAD_CAPTURE.md). The owner subsequently approved the
first disabled branch preview to obtain its hostname, then separate preview setup,
migration and controlled acceptance. That acceptance is recorded in the linked
operations document; capture is disabled again. Production release and migration
remain unapproved. PR #29 is the intended next component;
GitHub assigns the actual number
when it is opened. Local branch: `feat/site-visit-lead-capture`.

## Evidence and scope

Baseline: clean `main` at `4bb9f7b5f0a3174be24e7a60d60935fa4d231fdc`, matching fetched
`origin/main`; no open PRs. GitHub reports the PR #28 production build succeeded.
Read [AGENTS.md](../AGENTS.md), [SCOPE.md](../SCOPE.md),
[INFRASTRUCTURE.md](INFRASTRUCTURE.md) and the supplied
`C:\Users\axehe\Downloads\INCETEKH_WEBSITE_PENDING_WORK_V0.1.md` (14 October 2026).
Its copy under `Downloads\automation stack incetekh` is identical, SHA-256
`380A9D8F72A33FEDE0009E7EEC43052F7897D39CB925FDA30DC43DF1B5C75605`.
The supplied file is preserved unchanged outside the repository.

The checklist asks for storage before notifications, server validation, spam/rate
controls, duplicate protection, authorized retrieval/export and privacy updates.
Although it ranks email first, the current owner request explicitly selects this
form component. Business email is not a technical prerequisite. Gmail and existing
phone/WhatsApp links stay unchanged. Meta, notifications, Hermes, CRM, email setup,
DNS and unrelated content changes are excluded.

**Confirmed from source at the planning baseline (superseded locally by the implementation):**

- [SiteVisitForm.astro](../src/components/SiteVisitForm.astro) collects full name
  (100 characters), Indian mobile number, optional email (254), location/pincode
  (200), and one of six plan values: `3kw`, `5kw`, `7kw`, `10plus`, `water-heater`,
  `advice`. Its JavaScript prevents submission and reports that nothing was sent.
  Without JavaScript the button stays disabled.
- [wrangler.jsonc](../wrangler.jsonc) serves `dist/` as Static Assets with a 404
  fallback and `previews: {}`. It has no Worker entrypoint or database binding.
  Astro is static; its language middleware runs at build time.
- CSP permits same-origin fetches but forbids native form navigation with
  `form-action 'none'`. Existing tests assert no transport/storage. Six language
  catalogues, privacy and [terms](../src/pages/terms.astro) explicitly describe
  the form as unconnected.
- Builds use `npm run build`, with owner-reported `npx wrangler deploy` for main
  and `npx wrangler preview` for branches. Wrangler is not pinned. Adding an Astro
  API file alone would not create a live endpoint in this static architecture.

**Unknown/manual:** actual Workers billing/remaining quotas, existing D1/Turnstile
inventory, deploy-token permissions, runtime secrets, data-access owners and
approved retention. Free zone/Web Analytics does not prove Workers Free.
The pending checklist reports Search Console and Business Profile completion;
older infrastructure gaps are stale on those points, not freshly re-audited here.

## Recommended design

Keep Astro static. Add one small TypeScript Worker handler to the existing Worker,
one production D1 database and one separate preview D1 database. Use Turnstile and
the native Worker rate-limit binding for basic abuse protection. No framework,
ORM, queue, external form service, VM or second application is needed.

```text
Existing form -> same-origin POST /api/site-visits
              -> validation + rate limit + Turnstile verification
              -> awaited D1 insert (unique submission ID)
              -> receipt shown only after confirmed storage

Authorized owner -> Cloudflare D1 console / restricted query/export access
Future notifications -> separate approved component reading stored leads
```

Add `main: "worker/index.ts"`, an `ASSETS` binding and selective Worker-first
routing for `/api/*`; forward other requests to `ASSETS.fetch`. Keep 404 handling,
static pages, redirects, SEO, headers and analytics injection intact.
[Cloudflare supports this static-assets/API pattern](https://developers.cloudflare.com/workers/static-assets/binding/).

### Submission contract and reliability

- JSON-only `POST /api/site-visits`; reject other methods, non-JSON, oversized bodies
  (proposed 8 KiB, enforced while reading), unexpected fields and invalid values.
  Validate on the server regardless of browser validation. Trim text, preserve
  native-script names/locations, normalize Indian mobiles to `+91` form, and allow
  only the six plan codes and six supported language codes.
- Permit production writes only on HTTPS `incetekhenergy.com`, with matching
  Origin. Reject the production `workers.dev` alias, cross-origin and null-origin
  submissions. Check the request hostname as well as Origin; neither alone is
  authentication. No permissive CORS. Preview uses its own exact approved host.
- Client generates one unpredictable submission UUID per attempt and reuses it
  while retrying unchanged data. A unique database constraint enforces one row
  under concurrent retries. Store a normalized-payload hash: same ID/same payload
  returns the previous receipt; same ID/different payload returns a conflict.
  Never overwrite the first lead or deduplicate solely by phone/email. This covers
  retries, not every possible new submission after a reload.
- Check an existing ID after request/rate validation; an identical saved request
  may return its receipt without re-consuming a single-use challenge. New records
  require a valid challenge. Concurrent insert conflicts must resolve through the
  same payload comparison. Do not expose stored fields or add a public lookup API.
- Await D1's successful write before `201 { code: "received", id }` (or `200` for
  the existing matching receipt). Do not use background `waitUntil` for persistence.
  Database/quota/verification failures return an error, never a success receipt.
  A lost response is ambiguous: tell the visitor confirmation failed and offer
  retry with the same ID; do not assert that nothing was stored.
- In-flight submit is disabled; errors preserve values in the current page and
  keep phone/WhatsApp fallback visible. No form values in URLs, browser storage,
  analytics, application logs or exception text. A success means "request received;
  our team will contact you to confirm availability", never a booked appointment
  or guaranteed response time. No-JS visitors retain honest contact alternatives.
- API responses explicitly set `Cache-Control: no-store`, JSON content type,
  `X-Content-Type-Options: nosniff` and `X-Robots-Tag: noindex`. Static `_headers`
  does not automatically protect Worker-generated responses.

### Storage and separation from notifications

One `site_visit_leads` table: submission UUID primary key, server UTC creation
time, full name, normalized phone, nullable email, location, plan, language,
payload hash, privacy-notice version and `notification_status='not_configured'`.
Index creation time/ID for bounded owner queries. Use parameterized SQL and database
constraints. No files, bill contents, raw IP, user-agent, referrer or full URLs.

`not_configured` is an honest delivery status, not a queued or failed WhatsApp
message. There are no send attempts in PR #29. A later approved component can add
notification attempts/retries without changing the durable receipt contract.
The design supports owner retrieval without notifications. Local retrieval is
tested; actual owner access and remote retrieval remain acceptance gates.

### Abuse protection and privacy

Propose managed Turnstile, with pre-clearance off. Validate the server response,
expected hostname and action (`site_visit`), with bounded timeouts. Tokens expire
after five minutes and are single-use; refresh after expiry/failure. Use official
test keys only in local tests; remote acceptance uses a separate real preview
widget. [Server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
is mandatory, and [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
are not production protection.

Proposed rate limit: five attempts/minute per client IP at the serving Cloudflare
location, before calling Turnstile or D1; return 429 with retry guidance. Use the
Cloudflare-provided client address, not arbitrary forwarded headers. Prefer a
day-scoped HMAC key derived with a runtime secret; never retain the raw IP in the
lead table or logs. Separate namespace IDs/secrets for production and preview.
The [native rate-limit API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
is approximate and local, not a strict global cap or a billing guarantee. Missing
protection bindings fail closed for new submissions. Avoid in-memory counters
that reset per isolate and avoid adding Redis/another datastore.

Turnstile is a new approved security integration, distinct from Web Analytics.
Add only its required script/frame origins to the
[CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/);
same-origin JSON fetch permits keeping `form-action 'none'`. Update the form note,
privacy page, terms and five translations to explain lead storage, purpose, access,
retention, abuse processing and Turnstile. Do not reuse analytics-specific claims
about IP disposal as claims about Turnstile or all hosting. Owner reviews applicable
terms/consent and language; no marketing opt-in or cookie banner is invented.

## Resources, credentials and likely cost

All names below are proposals, not created resources. Pricing is provider evidence,
not an account invoice or measured capacity estimate.

| Item                                   | Required setup / credentials                                                                                                                                                                  | Cost and limits                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Worker                        | Add handler/bindings; reuse current Git integration. Account ID and deployment authorization needed; no new domain/Worker required.                                                           | [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/): 100,000 dynamic requests/day and 10 ms CPU per invocation. Static asset requests remain free. Confirm actual subscription and shared usage. Paid starts at $5/month; no upgrade proposed.                            |
| D1 production + preview                | Propose `incetekh-site-visits-prod` and `incetekh-site-visits-preview`, binding `LEADS_DB`; different database IDs. IDs are config, not passwords.                                            | [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/): 5 million rows read/day, 100,000 written/day, 5 GB/account. [Limits](https://developers.cloudflare.com/d1/platform/limits/): 10 databases/account, 500 MB/database, seven-day Time Travel. Index updates also count as writes. |
| Turnstile production + preview widgets | Public sitekeys in the corresponding build; separate `TURNSTILE_SECRET_KEY` runtime secrets. Production host restricted to apex; preview to the exact test host.                              | [Turnstile Free](https://developers.cloudflare.com/turnstile/plans/): up to 20 widgets, 10 hostnames/widget, unlimited challenges. No paid plan required.                                                                                                                                         |
| Native rate-limit binding              | `LEAD_RATE_LIMIT`, unique positive-integer namespace IDs, runtime `RATE_LIMIT_KEY_SECRET` per environment. No separate database or SaaS credential.                                           | Current API docs show the binding, but do not state a separate price. Verify entitlement/billing during setup; do not approve a paid add-on or silently omit rate limiting.                                                                                                                       |
| Administration                         | Existing Cloudflare authenticated owner/MFA. Provisioning/migrations need account D1 edit rights; deploy needs Worker edit rights. Prefer separate read access for routine inspection/export. | No CRM or new admin website; actual access/granularity and existing build-token scope need checking.                                                                                                                                                                                              |

D1 bindings supply runtime database access without a database API secret in the
browser or Worker. An authenticated operator/token is still required to create,
migrate and administer it. Never put Cloudflare API tokens, Turnstile secrets or
lead exports in `PUBLIC_*`, Git or PR output. Keep runtime secrets separate from
build variables; extend `.gitignore` for `.dev.vars*`, `.wrangler/` and private
local test/export material before implementation uses them.

**Expected incremental service cost: $0 within Free allowances**, conditional on
the actual account plan, remaining quotas and rate-limit availability. This is not
an unlimited-availability promise. D1 Free query limits
[stop queries when exhausted](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/);
preserve fallback/error behavior. No blanket rows-to-leads capacity claim: retries,
indexes, owner queries and other account workloads also consume quotas.

## Manual setup and release order — after approval only

1. Owner approves this component, Turnstile and the storage/privacy approach.
   Confirm Workers billing, D1 capacity, rate-limit availability, account access,
   existing build credential rights and the current Worker rollback target. Do not
   ask the owner to paste secrets into chat. Inspect permissions before granting more.
2. Implement and test locally with pinned compatible Wrangler, generated Worker
   types, local D1 and mocked/test-key verification. No cloud resources are needed
   for this phase. Include the plan and implementation in one PR, not stacked PRs.
3. With separate resource authorization, create the two D1 databases in the existing
   account and record their returned IDs. Decide any required data jurisdiction
   before creation; do not claim India-only residency. Apply versioned, additive
   migrations to preview first, using an explicit preview-target config. Do not
   connect to or import the unrelated `Downloads\incetekh.db`.
4. Create the two Turnstile widgets and set public build keys and runtime secrets
   in their correct environments. Configure separate rate-limit namespaces and
   exact API host allowlists. Leave analytics, DNS and indexing settings alone.
5. Explicitly set `previews.d1_databases` to the preview ID and its own vars,
   rate-limit binding and secrets. [Previews do not inherit production settings](https://developers.cloudflare.com/workers/previews/configuration/).
   [D1 preview bindings share data when IDs match](https://developers.cloudflare.com/workers/previews/resources/);
   preview naming/noindex does not isolate data. Use a separate preview migration
   config targeting the same preview ID. Verify effective binding IDs, not merely
   the source names. Base-secret updates affect newly created previews; confirm the
   active preview has the intended values.
6. Only after preview publication/resource setup is approved, push the internally
   complete component and open the single PR. Push triggers a preview build; do not
   assume a documentation-only push is inert. Run controlled synthetic preview
   submissions and inspect the preview rows; prove production remains untouched.
7. Before final merge approval, owner confirms retrieval access, review cadence,
   retention, privacy translations and terms. Apply the approved production schema
   deliberately, not as an unconditional step in every branch build. Confirm keys,
   bindings and fail-closed behavior; no production test writes yet.
8. Merge only with production-release approval. Verify the exact build/version,
   then send one approved synthetic enquiry and retrieve it from production. Record
   non-PII evidence, retry the same ID and confirm one row. Owner approves removal
   of that test row. Preserve all genuine leads when cleaning test evidence.

## Owner operations, retention and recovery

Use the existing authenticated Cloudflare D1 console to inspect recent leads.
Document a bounded, parameterized recent-leads query and a paginated read/export
procedure to owner-controlled storage outside the repository. Prefer JSON over
CSV to avoid spreadsheet formula execution. No public admin/list/export endpoint.
Confirm a real authorized owner can retrieve a test row; a database existing is
not operational acceptance. Proposed initial cadence: owner checks twice each
business day, with no automated notification promise to visitors.

Owner must choose retention before launch. Proposed starting point: delete
unconverted enquiries after 90 days, with a monthly owner review and a verified
deletion procedure; any longer-lived customer records need a separate purpose.
Delete only owner-reviewed records; an age cutoff alone must not remove converted-customer records. This period is a business proposal, not a legal requirement. Record who can export,
where exports live, who can receive them and how they expire. Never use real leads
as test fixtures. No purge cron or new reminder service in this component.

[Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) gives
Free D1 seven days of point-in-time recovery; it is not indefinite archival storage.
Test recovery with synthetic preview data. Restoring older data may resurrect
deleted records; reconcile approved deletions. Full
[SQL export](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/)
can make a database temporarily unavailable, so routine inspection should use
bounded reads; schedule any full backup deliberately. Keep private backup/export
procedures and retention explicit, without adding another storage service now.

Log only outcome codes, latency and non-PII request correlation; inspect Worker
error/429 rates and D1 usage in existing dashboards. Verify provider logs do not
capture request bodies and nominate the incident owner. No new monitoring SaaS.
Rollback restores the previous static site/disabled form but leaves D1 and all
accepted rows intact. Do not run destructive down-migrations or delete a database.

## Focused PR changes, tests and acceptance

Expected changes: `worker/index.ts` and small validation/storage helpers only as
needed; SQL migration; Wrangler config and pinned dev tooling/types; form script,
privacy, terms and five catalogues; focused API/browser tests; lead operations runbook
and directly affected infrastructure/launch docs. No Astro SSR conversion.

| Test layer         | Required evidence                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API and local D1   | Valid/optional-email/native-text cases; missing/invalid/oversized/unknown fields; phone/plan/language normalization; parameterized SQL with injection strings; timestamps/status correct.                                                                                                  |
| Durable receipt    | Force insert failure/quota-like errors: no success. Repeated/concurrent same ID yields one row; changed payload conflicts; lost acknowledgement retry returns original receipt. Restart the local Worker and retrieve the row from persisted local D1.                                     |
| Protection         | Wrong host/Origin/method/type, spoofed forwarded headers, invalid/expired/replayed Turnstile token, wrong hostname/action, verifier timeout, rate limit and missing bindings all reject safely. No production use of test keys or verification bypass.                                     |
| Browser            | Six languages: pending/success/error/uncertain retry, values retained on failure, no stale unconnected-form claims in form/privacy/terms, no false booking claim, accessible status/focus, mobile layout, challenge expiry/failure, no-JS fallback, no PII in URLs/storage/logs/analytics. |
| Routing/regression | Run integration tests under local Wrangler, not only `astro preview` (which has no API). Preserve 138 sitemap URLs, robots/canonicals, alias noindex, real 404s, redirects, contacts and one automatic analytics path. Validate CSP with Turnstile and no duplicate beacon.                |
| Remote preview     | After authorization, real preview widget + preview D1 insert/retrieval; exact resource IDs differ from production; production alias API denied; production row count unchanged. Local mocks alone cannot pass this gate.                                                                   |
| Release acceptance | After explicit approval, exact main deployment plus one synthetic production enquiry, durable retrieval, duplicate retry, owner inspection/export and documented rollback/retention procedure. No WhatsApp dependency.                                                                     |

Run formatting lint, Astro checks, a separate Worker type check, focused API/D1 and
Playwright tests, and default/indexable builds. Independently review the exact PR
head before merge. No implementation tests have run during this planning task;
existing PR #28 tests do not establish form functionality.

## Planning verification

Source/configuration and the supplied checklist were inspected; official provider
documentation was checked. Independent review found the omitted Terms update, now
included in scope and regression criteria, and no other blocking design findings.
The plan passes formatting and relative-link checks. Only this local plan file was
added; application files, Cloudflare resources/settings and GitHub remain unchanged.

**Local implementation was subsequently approved.** Resource creation,
credentials/configuration, preview publication and production release remain
separately authorized steps. Nominate the lead reviewer and approve/change the
proposed retention period before activation. The preceding verification describes
the planning-only checkpoint, not the current local implementation.
