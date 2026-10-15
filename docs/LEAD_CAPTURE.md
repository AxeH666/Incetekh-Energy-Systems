# Site-visit lead capture

**15 October 2026 — disabled branch preview authorized; production release is not.**
The owner approved local implementation of [the reviewed plan](LEAD_CAPTURE_PLAN.md)
and then the first preview for `feat/site-visit-lead-capture`, solely to obtain its
allocated stable hostname. Publication status must be verified against the exact
commit's Cloudflare build check; authorization alone is not deployment evidence.
The owner reports creating separate production/preview D1 databases and the
production Turnstile widget. None is bound by this branch's Wrangler config.
Both capture flags remain `false`; no secret, database binding, rate binding or
allowed origin is configured. Do not enable capture, run remote migrations, merge,
deploy production or create paid resources under this preview approval.
All enquiry test records so far are synthetic and local. `sensitive info/` is
excluded from Git and must never be force-added or uploaded.

## Implementation

Astro still builds static pages. The existing Worker serves assets and routes
`/api/*` to [worker/index.ts](../worker/index.ts). Only `POST /api/site-visits`
accepts enquiries; there is no public listing/export endpoint. Unknown API paths
return JSON 404, while ordinary pages retain Static Assets routing and headers.

Capture is closed by default in both production and preview config. An empty
`PUBLIC_TURNSTILE_SITE_KEY` leaves the form on its honest WhatsApp fallback and
loads no widget. A configured form loads one Turnstile script and posts JSON to
the same origin. Automatic analytics injection remains Cloudflare's responsibility.
No enquiry fields are sent to analytics, Turnstile, URLs or browser storage.

The API checks the exact HTTPS origin, request method/type, an 8 KiB body limit,
allowed fields, lengths, mobile number, plan and language. Production accepts
only `https://incetekhenergy.com`; its workers.dev alias cannot accept leads.
Preview requires one exact workers.dev origin and rejects the production alias.
Missing configuration, rate binding, secret, database or schema closes capture.
Official Turnstile test secrets are rejected by the application, including previews.

The native limiter is intended to allow five attempts per minute per client IP
per Cloudflare location. It receives a daily HMAC key, not the raw IP. No IP,
Turnstile token or request body is logged by application code or stored in D1.
The limiter is approximate and regional, not a global quota or billing cap.
The API verifies Turnstile server-side, including hostname and `site_visit` action,
with an eight-second timeout. It saves only after verification succeeds.

The browser creates an in-memory UUID for unchanged enquiry details. D1's primary
key makes retries safe, including concurrent requests. Reusing an ID with different
normalized details returns 409; it never overwrites a lead. An existing matching
receipt can be acknowledged without spending another Turnstile token. A new ID
always requires verification. Repeated phone numbers alone are not deduplicated.
Refreshing/closing the page loses the retry ID; this is intentional to avoid browser
storage, and may require the owner to recognize a repeat enquiry.

The API returns 201 only after a confirmed insert, or 200 for a matching stored
receipt. Errors and client timeouts never claim success: the browser retains
details and advises retrying unchanged. Fields are disabled during submission.
A receipt is an enquiry, never a confirmed appointment. No notifications are sent;
`notification_status` is fixed to `not_configured` for this component.

## Required setup after separate authorization

The dashboard walkthrough and exact per-environment values are in
[CLOUDFLARE_LEAD_SETUP.md](CLOUDFLARE_LEAD_SETUP.md). Owner-reported resource creation
does not establish runtime bindings. Remote migrations, secret configuration and
capture activation remain separate from this disabled preview publication.

Do not copy example identifiers into deployment config. No resources are declared
with placeholder IDs that Wrangler could automatically provision. Before any
push, check the Workers Builds trigger: a branch push can publish a preview.

1. Verify Workers/D1 quotas and billing, account ownership and deploy permissions.
   The zone's Free plan does not establish Workers account billing. See the
   [plan's cost assessment](LEAD_CAPTURE_PLAN.md#resources-credentials-and-likely-cost).
2. Create separate production and preview D1 databases, conventionally
   `incetekh-site-visits-prod` and `incetekh-site-visits-preview`. Record their
   actual IDs privately with the environment inventory. Configure `LEADS_DB` in
   top-level `d1_databases` and separately in `previews.d1_databases`. **Different
   names are insufficient; the IDs must differ.** Set `migrations_dir: "migrations"`.
3. Apply [0001_site_visit_leads.sql](../migrations/0001_site_visit_leads.sql) only to
   the explicitly approved target. For preview, use a separate migration config
   whose top-level D1 entry has the same ID as `previews.d1_databases`. Never run
   production migrations unconditionally in build commands. No down-migration.
4. Create separate managed Turnstile widgets for the apex and the exact approved
   preview hostname. Keep pre-clearance off; do not use Any Hostname or wildcard
   origin checks. Set each public key as its environment's
   **build** `PUBLIC_TURNSTILE_SITE_KEY`. Put `TURNSTILE_SECRET_KEY` only in the
   corresponding **runtime** secrets. Do not include localhost in production's widget.
5. Configure runtime variables per environment: enable `LEAD_CAPTURE_ENABLED=true`
   in an explicitly authorized controlled preview to perform its synthetic
   acceptance checks. Production stays disabled until preview acceptance, owner
   decisions and explicit production release approval. Set `LEAD_CAPTURE_ENV=production` or
   `preview`, and `LEAD_ALLOWED_ORIGIN` as the exact HTTPS origin without a trailing
   slash. The production value must be `https://incetekhenergy.com`.
6. Add `ratelimits: [{ name: "LEAD_RATE_LIMIT", namespace_id: "<allocated numeric ID>",
simple: { limit: 5, period: 60 } }]` separately for each environment, using
   different positive numeric namespace IDs. Set separate randomly generated
   `RATE_LIMIT_KEY_SECRET` values of at least 32 characters as runtime secrets.
   Do not share production secrets with Previews Base. Check the deployed preview:
   updates to Base secrets affect new previews, not necessarily existing ones.
7. Confirm database IDs, widget hosts, secrets, enabled flags and indexing mode in
   the actual deployed environment. Keep production indexing as already approved;
   preview remains non-indexable. Noindex does not disable tracking or isolate data.

The existing commands remain `npm run build`, `npx wrangler deploy` and
`npx wrangler preview`; none was used to publish this local component. Wrangler is
pinned to 4.151.0. Local D1 tests use the matching Miniflare 5.20261012.0-beta
version used by that Wrangler release, with its supplied v4 options converter.

## Owner operations and privacy gates

Before enabling capture, nominate the person who checks enquiries and a backup.
Proposed cadence: twice each business day. There is **no automatic notification**.
Verify that person can sign in with least-privilege Cloudflare access and retrieve
a synthetic row. Provisioning/migrations need D1 write authority; day-to-day
inspection should use restricted read access where supported.

In the authenticated D1 console, select the correct database by ID. A bounded
recent-enquiry query is:

```sql
SELECT id, created_at, full_name, phone, email, location, plan, language,
       privacy_notice_version, notification_status
FROM site_visit_leads
ORDER BY created_at DESC, id DESC
LIMIT 100;
```

For a subsequent page, use the last returned `(created_at, id)` pair as bound
parameters in an authorized query client:

```sql
SELECT id, created_at, full_name, phone, email, location, plan, language,
       privacy_notice_version, notification_status
FROM site_visit_leads
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 100;
```

Use the returned timestamp and UUID as cursor values; do not interpolate visitor
text into SQL. For a single receipt use `WHERE id = ?`. Export bounded results as
JSON into owner-controlled encrypted storage **outside this repository and shared
Downloads folders**. Confirm export recipients, expiry and access. JSON avoids CSV
formula execution; do not open untrusted visitor fields as spreadsheet formulas.
No export credential or visitor record belongs in Git, screenshots, issues or PRs.

Owner decisions still required:

- Retention and deletion: the plan proposes 90 days for unconverted enquiries,
  not an approved policy or legal requirement. Approve a duration/purpose, add it
  to all six privacy notices before activation, and record export expiry too.
  No automatic purge exists. Review records before deletion; age alone cannot
  distinguish converted customers. Preview selected IDs, delete only approved
  IDs with bound parameters, verify row counts, and handle private exports.
- Approve six-language form/privacy/terms wording with native speakers.
- Review applicable privacy/consent requirements, Cloudflare DPA and Turnstile
  Addendum, access roles, international processing/location and deletion handling.
  The Turnstile addendum describes Cloudflare as processor for site protection and
  controller for improving bot detection. EU analytics exclusion does not exclude
  visitors from Turnstile security processing. No legal exemption is assumed.
- Verify provider logging settings do not record bodies or tokens. Nominate the
  incident owner and inspect existing Worker error/429 and D1 usage dashboards.

Use D1 Time Travel for its plan-limited recovery window (Free: seven days), not as
indefinite archival storage. Rehearse recovery with synthetic preview data first.
A restore can resurrect deleted rows; reconcile approved deletions. Full SQL export
can temporarily make D1 unavailable, so schedule it deliberately. To roll back the
feature, disable capture and restore the prior accepted static application version;
preserve the database and every accepted lead. Do not delete resources to roll back.

## Validation and release gates

With Node from `.nvmrc`, run `npm ci`, then `npm run verify`. `npm run test:worker`
compiles the actual handler and runs Node tests against local workerd and persisted
D1 under ignored `.wrangler/`. Network verification is replaced **only by the test
harness**. No deployed verification bypass exists. Tests use no real credentials.

For Static Assets/API routing and browser regression checks on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
$env:PLAYWRIGHT_WORKER = 'true'
npm test -- tests/site-visit.spec.ts tests/worker-routing.spec.ts tests/privacy.spec.ts tests/languages.spec.ts tests/seo.spec.ts tests/seo-artifacts.spec.ts tests/public-contacts.spec.ts
```

This starts `wrangler dev --local`, not a published branch preview. Browser tests
substitute the widget and API response to exercise failure/pending/success/retry
states; API tests separately exercise the real handler, native rate binding, D1,
validation and verifier transport failures. Local evidence does not prove real
Turnstile solve behavior, cloud quotas, dashboard access or remote isolation.

Before release: independently review the local diff, approve cloud setup and then
preview publication separately; test real preview challenge/insert/retrieval with
synthetic details and prove production row count unchanged. Confirm production
alias API denial, correct response headers, all six layouts, privacy, and no duplicate
tracking scripts. The production merge/deployment needs explicit approval.
After that release, verify exact SHA/version, one approved synthetic enquiry,
retrieval/export by the owner and same-ID replay with one stored row. Remove only
the specifically approved test row. No customer message is part of these checks.

## Local verification — 15 October 2026

- Formatting lint passed; Astro checked 86 files with zero diagnostics, and the
  separate Worker TypeScript check passed.
- All 34 API/D1 tests passed: validation, native text, injection-shaped input,
  concurrent/replayed IDs, database write failure, verifier failure/timeout,
  rate limits, exact hosts/origins, missing configuration, persisted restart and
  separate local preview storage without production-store writes.
- All 127 browser/model/artifact tests passed against `wrangler dev --local` with
  the default non-indexable build. The corrected suite preserves the existing
  `/reviews/` HTML refresh (HTTP 200), not an assumed edge 301.
- Both default and indexable builds passed. The final 28 focused indexable
  SEO/artifact/privacy/form tests passed after the last copy updates, including
  138 sitemap content URLs and mobile receipt layout in all six languages.
- English, Telugu and Malayalam mobile receipt screenshots were visually
  inspected. The widget was a local test substitute; real challenge UX still
  requires authorized preview acceptance.
- Independent source/documentation review completed; its test-contract and
  status-documentation findings were fixed. No blocking code finding remained.

Logs and synthetic persistence are ignored under `.wrangler/`; screenshots are
under ignored `test-results/`. No genuine lead, cloud write, published preview,
production deployment or notification was involved. Changes remain local and
uncommitted on `feat/site-visit-lead-capture`.

## Dependency audit

The owner authorized investigation and minimal fixes within this local component.
On 15 October, only two transitive lockfile entries were updated:
`http-cache-semantics` 4.2.0 → 4.3.0 and `source-map-js` 1.2.1 → 1.2.2.
`package.json`, Astro, Wrangler and all other resolved versions are unchanged by
this follow-up. No overrides or additional direct dependencies were needed.

| Package/advisory                                                                                 | Reachability in this application                                                                                                                                          | Resolution and limits                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http-cache-semantics`, [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) | Astro's remote-image build cache helper. The site uses local image inputs; no customer-facing Node/SSR cache runs in production. The Worker does not import this library. | 4.3.0 is the smallest published compatible version above the audit's affected range. **This is not a demonstrated patch for the reported max-stale behavior.** The maintainer [disputes the report](https://github.com/kornelski/http-cache-semantics/issues/56); the published diff changes Vary matching/status handling, not that stale-response branch. |
| `source-map-js`, [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)        | Build/development source-map tooling through PostCSS/Vite, magicast and css-tree/SVGO/unifont. No visitor source-map upload/processing endpoint exists.                   | [1.2.2](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2) validates section offsets and bounds cumulative nested offsets, addressing the excessive-work issue. It satisfies all existing parent dependency ranges.                                                                                                                              |

These packages appear in npm's production dependency graph because Astro is a
direct `dependencies` entry. That classification is not deployment reachability:
the site publishes static output, and a local bundle dependency inspection of the
new enquiry Worker contains only `worker/index.ts`. There is no Astro server,
general-purpose proxy cache or source-map processor in that handler.

`npm ci` reproduced the new lockfile, and `npm audit` reports **zero known
vulnerabilities**. This does not certify all dependencies or settle the disputed
cache advisory. Reassess exposure if SSR, private remote images, shared authenticated
caching or untrusted build inputs are introduced. Existing lead-capture activation
gates still apply; a clean audit does not verify cloud bindings or owner access.

Focused local dependency smoke checks cover excessive/nested source-map offsets,
normal map conversion, non-storable private/no-store cache responses, and Astro's
image TTL/304 revalidation using synthetic responses with no remote requests.
Their four checks passed. The reproduction script and evidence are retained under
ignored `.wrangler/dependency-regression.mjs` and `.wrangler/dependency-regression.log`.

The exact two-entry lockfile comparison and audit JSON are retained under ignored
`.wrangler/`. Fresh `npm run verify` after these updates passed: formatting lint,
Astro checks (86 files, zero diagnostics), Worker TypeScript, production build,
all 34 API/D1 checks and all 127 browser/model/artifact checks under local Wrangler.
The full log is `.wrangler/dependency-verify.log`. Independent read-only review
confirmed the two-entry scope and found no blocking issue in the dependency
assessment or Cloudflare setup worksheet. No cloud setup or publication occurred.

## Official references

- [Static Assets bindings](https://developers.cloudflare.com/workers/static-assets/binding/)
  and [preview isolation](https://developers.cloudflare.com/workers/previews/resources/).
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
  [CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/),
  [testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
  and [privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/).
- [Rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
  [D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/),
  [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) and
  [D1 export limits](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/).
