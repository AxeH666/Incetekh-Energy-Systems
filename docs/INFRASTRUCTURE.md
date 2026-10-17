# Infrastructure and operations

**Email notification component, 17 October 2026 (not deployed):** disabled
Resend notification handling is proposed in a separate PR. No production
schedule, migration, credential, DNS or email change has been made. See
[EMAIL.md](EMAIL.md) for current Hostinger DNS evidence, provider selection,
setup requirements and limits. Older no-MX observations below are historical.

**Lead-capture-only cleanup, 17 October 2026 (released):** PR #32 merged as
`97cbb53`, removing the unused notification implementation from PR #31.
The website's customer-facing WhatsApp links, D1 lead capture, Turnstile,
rate limiting and receipt handling remain. Enquiry checks remain manual.
Production build `de215cbe` succeeded. The owner submitted one Turnstile-protected
test enquiry; its D1 row and receipt retry were verified without duplication or
changes to the earlier enquiry. The public WhatsApp link resolved correctly.
Both disabled notification flags were preserved.

Read-only Cloudflare inspection on 17 October confirmed that production and
preview D1 have only `0001_site_visit_leads.sql` applied, with no notification
tables or marker column. The unapplied `0002_whatsapp_notifications.sql` file
was removed; no remote migration or schema/data change was performed.
The original migration and its inert `notification_status = 'not_configured'`
column remain unchanged to preserve applied migration history and stored rows.
No notification-only package dependency existed; the package manifests are unchanged.

### Deferred resource cleanup (owner approval required)

- Production still has the two false runtime variables `WHATSAPP_NOTIFY_ENABLED`
  and `WHATSAPP_WEBHOOK_ENABLED`. Their production declarations are retained so
  deploying this cleanup preserves them unchanged. Removal requires separate
  owner approval, including any dashboard or preview overrides. They do not
  control anything in the cleaned Worker.
- The inspected production Worker has no Meta/WhatsApp credential bindings and
  no Cron Triggers. Preserve `LEADS_DB`, `LEAD_RATE_LIMIT`, `ASSETS`, all lead
  configuration, `TURNSTILE_SECRET_KEY` and `RATE_LIMIT_KEY_SECRET`.
- Meta account tokens, webhook subscriptions, app/template/phone resources and
  any disconnected Cloudflare preview overrides were not audited. If any were
  configured outside the repository, inventory them with the owner and obtain
  approval before revocation or deletion. No production resource was changed.
- The inspected production build trigger includes only `main` and deploys with
  `npx wrangler deploy`. The new email PR must remain unmerged until release approval.

Cloudflare documents [migration tracking](https://developers.cloudflare.com/d1/reference/migrations/)
and [build branch controls](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/).
Recheck live state before any later release; the observations above are dated.

**Production lead activation:** PR #29 merged after independent review as
`78acb87`. Production build `c56fb610` passed, all 138 sitemap pages were healthy,
and capture was verified disabled before the separately authorized activation
component. See [PRODUCTION_LEAD_ACTIVATION.md](PRODUCTION_LEAD_ACTIVATION.md) for
the production resource inventory, retention/operations policy and rollback.
The following preview-only statements are historical checkpoints.

**Preview acceptance update, 15 October 2026:** the next focused component adds
a disabled-by-default Worker enquiry API, D1 migration, Turnstile support and
six-language disclosures. Separate preview D1, runtime secrets, Turnstile and rate
bindings were configured and tested under owner approval. A real owner-submitted
test lead was retrieved from preview D1; retries, rejection paths and rate limiting
were verified. Preview capture is disabled again after testing. Production remains
unchanged, with no production feature release or migration approved.
See [LEAD_CAPTURE.md](LEAD_CAPTURE.md) for the
implementation, owner operations and separate setup/release gates. Historical
static-only/form observations below describe the deployed baseline, not this
feature branch. Wrangler is now pinned to 4.151.0. Existing analytics
Automatic Setup and the EU exclusion remain unchanged.

**PR #29 closeout, 15 October 2026:** the existing branch preview's build trigger
had no environment variables despite the displayed Previews Base values. Direct
API access with the existing active token identified and corrected only that
preview trigger. A Git-driven rebuild now serves the correct public Turnstile key
and noindex in all six languages. Wrangler works with Node 22.23.3 and the existing
User-scoped token loaded into the process; the earlier `fetch failed` did not
reproduce. Preview migration/schema, runtime secret binding names, widget settings,
retry safety, rejection paths, native rate limiting and cooldown were rechecked.
The original real acceptance row is retained, with no duplicates or rejected rows.
The automated browser still required a real challenge interaction; the earlier
owner-completed submission remains the genuine challenge/insert evidence.
See [the exact trigger IDs and safe diagnostic procedure](CLOUDFLARE_LEAD_SETUP.md#current-preview-build-status--15-october-2026)
and [final validation and limits](LEAD_CAPTURE.md#final-preview-recheck--15-october-2026).
Preview capture is disabled at handoff. Production configuration, deployment,
build settings, D1 schema and checked public-page hashes remain unchanged.

Infrastructure audited: **13 October 2026 (Asia/Kolkata)**. Analytics configuration
clarified by the owner on **14 October 2026**; unrelated dashboard facts were not re-audited. Maintainer: founder, with the
engineer responsible for each approved infrastructure change.

This is the current infrastructure reference. [SCOPE.md](../SCOPE.md) still controls
Phase 1. Earlier delivery reports describe historical tasks, not today's hosting.
The supplied `INCETEKH_INFRASTRUCTURE_HANDOFF.md` is preserved unchanged in the
local recovery archive described below;
its proposed WhatsApp Cloud API/backend work is **outside the locked scope**.
The initial audit changed documentation only. The owner subsequently authorized
commit, push, PR merge, synchronization and stale-branch cleanup. Existing
Cloudflare Git integration may publish this documentation release; no manual
deployment, DNS change, purchase, account-setting change or integration is included.

The contact correction is deployed: [PR #25](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/25)
merged as `0d9a6805cf79fbeb55fbebb4ead4b01470069bf7`; its production build succeeded
and all 145 live route/contact checks passed. The owner then enabled Always Use
HTTPS. Fresh GETs confirm all host/scheme variants reach HTTPS apex with paths
and queries intact. Customer reviews and form functionality remain unchanged.

Production SEO activation is verified on **13 October 2026, 12:21 IST**.
[PR #26](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/26) merged after
owner approval as `50512542cd37d1f6e5c5bd690ce2818192aad1e1`. The owner set
`PUBLIC_SITE_INDEXABLE=true` in Production build variables only and retried that
commit; Previews Base stayed unchanged. GitHub independently confirms successful
build `c955fe18-92b5-43e8-a7f9-fa6fb84a3543`. Public HTTP acceptance confirms the
indexable output; dashboard Worker version ID remains a manual check.

### SEO release acceptance

| Check                    | Verified result                                                                                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production content       | All 138 eligible URLs return 200 and exactly one `index, follow` meta tag, without a noindex response header                                                                                                                                                                                               |
| Sitemap and robots       | Exactly 138 distinct eligible URLs; robots allows crawling and references `https://incetekhenergy.com/sitemap.xml`                                                                                                                                                                                         |
| Canonicals and languages | All 138 self-canonicals use HTTPS apex; correct HTML language and seven reciprocal alternates (six languages plus x-default)                                                                                                                                                                               |
| Metadata                 | All 138 titles/descriptions unique; Open Graph title/description/URL agree; homepage Organization/WebSite JSON-LD preserves confirmed identity                                                                                                                                                             |
| Production Workers alias | Root, Telugu contact and sitemap over HTTP and HTTPS return `X-Robots-Tag: noindex`, even though the shared production HTML is indexable                                                                                                                                                                   |
| Redirects                | Eight root/path/query checks cover HTTP/HTTPS apex/www; permanent redirects preserve encoded queries and reach HTTPS apex                                                                                                                                                                                  |
| Exclusions               | Genuine missing URL returns 404/noindex; five localized error routes and legacy reviews redirect remain noindex and outside sitemap                                                                                                                                                                        |
| Contacts                 | Approved Gmail and sole telephone link present across all 138 content pages; historical invalid/inactive emails absent                                                                                                                                                                                     |
| Preview isolation        | PR #26 preview passed all 138 pages and ten HTTP/HTTPS probes before cleanup. After branch deletion, five probes returned preview-not-found 404 while HTTPS Telugu contact still served protected noindex content. Fresh post-activation documentation-preview verification is pending in the follow-up PR |

Local evidence: `.astro/seo-activation/live-production-true.json` and the PR's
release record. Normal TLS validation was used. These checks establish technical
indexability, not actual Google indexing, rankings, native-speaker approval,
review/photo permission or real-device acceptance. No Search Console property,
analytics integration, DNS rule or contact/review content changed in this closeout.
See [VISIBILITY.md](VISIBILITY.md#approved-release-procedure) for the reusable
release procedure and [LAUNCH.md](LAUNCH.md) for future acceptance.

## Evidence and access

- **Verified — initial audit repository:** inspected at `a59cd724f7bd090465b5f1ce959a5c4b782fc947`
  (`main` and fetched `origin/main` agreed). This proves source configuration only.
- **Verified — live:** unauthenticated HTTP GETs, validated TLS, public DNS via
  Google DNS, selected mail checks repeated via Cloudflare DNS, and Verisign RDAP.
  These are point-in-time observations, not an uptime or device-acceptance claim.
- **Verified — GitHub:** authenticated read-only API inspection of repository,
  checks, workflows, environments, deployments, rulesets and branch protection.
- **Owner reported:** the supplied handoff and the subsequently confirmed public
  phone, WhatsApp and public/administrative email.
- **Inferred:** a conclusion supported by evidence but not directly inspected.
- **Pending / manual:** a required task or dashboard fact not yet established.

No connected browser was available. No Cloudflare credentials were present in
the inspected environment or conventional Wrangler configuration location.
Cloudflare, Hostinger and Google dashboards were **not inspected**. GitHub access
does not grant access to those accounts. No secret values were collected.

Public response evidence is summarized in this file. Raw local observations are
in ignored `test-results/infrastructure-audit/`; they are supporting captures,
not a durable backup. HTTP Date headers used UTC on 12 October; this audit uses
the supplied client date, 13 October in India.

## Current state and priorities

The HTTPS website and HTTPS `www` redirect work. Phase 1 is **not complete**:
Public content approval, Search Console/measurement,
operational ownership and professional email still need closure.

| Finding                           | Evidence                                                                                    | Required follow-up                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Production SEO activated          | All 138 content URLs indexable, populated sitemap, matching robots declaration              | Preserve production-only flag and alias safeguards; Search Console ownership/submission remains separate |
| HTTP canonicalization verified    | HTTP apex to HTTPS apex; HTTP www via HTTPS www to HTTPS apex, all 301                      | Preserve working rules; no redirect changes in SEO component                                             |
| Public contacts verified live     | PR #25: +91 9441259786 and incetekhenergy@gmail.com; all 145 route checks passed            | Actual call/message/mail receipt remains owner acceptance                                                |
| Temporary endorsements are live   | Ten source comments, live `data-review-status="illustrative"`, no visible sample disclaimer | Replace with verified, permissioned feedback or remove; review photo permission separately               |
| Form is deliberately unavailable  | Live notice says inputs are not sent/saved; source prevents submission                      | Keep truthful call/WhatsApp fallback; delivery is not configured                                         |
| Release safeguards are procedural | No `main` branch protection or repository rulesets; successful Cloudflare check exists      | Confirm deployment policy and propose minimal review/check protection before subsequent releases         |
| Active Worker version is unknown  | GitHub proves a successful build, not the currently active version                          | Record dashboard version ID, deployed SHA, variables and rollback target                                 |

## Architecture and inventory

Runtime inventory updated for the lead-capture-only branch on 17 October 2026;
the original audit findings above remain dated evidence.

```text
Hostinger: domain registration and renewal
    -> Cloudflare authoritative DNS
    -> HTTPS incetekhenergy.com
    -> Cloudflare Worker: incetekh-energy-systems
       -> /api/site-visits: Turnstile + rate limiting -> Cloudflare D1
       -> Static Assets: dist/ (Astro HTML, CSS, JS, fonts and images)

GitHub main -> Cloudflare Workers Builds -> build -> Wrangler deployment
GitHub feature branches -> Cloudflare branch previews (historically verified)
HTTPS www -> Cloudflare 301 -> HTTPS apex, preserving path and query
```

| Item           | Configuration / status                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository     | [AxeH666/Incetekh-Energy-Systems](https://github.com/AxeH666/Incetekh-Energy-Systems), public; default branch `main` — GitHub verified             |
| Local checkout | `C:\Users\axehe\Desktop\incetekh energy` — verified                                                                                                |
| Production     | <https://incetekhenergy.com/> — live 200                                                                                                           |
| Host alias     | <https://incetekh-energy-systems.incetekhenergy.workers.dev/> — live 200, public, noindex, canonical points at apex                                |
| Worker         | `incetekh-energy-systems` — Wrangler config and GitHub build check agree; owner reports apex custom-domain binding                                 |
| Rendering      | Astro `7.3.5`, static output, TypeScript, plain CSS, self-hosted Manrope; no SSR adapter                                                           |
| Runtime        | `worker/index.ts` serves the enquiry API with D1, Turnstile and rate limiting; Static Assets serves the website. No queues or cron.                |
| Middleware     | `src/middleware.ts` localizes HTML at build time; it is not a production request API                                                               |
| Asset boundary | Static Assets uploads `dist/`; Worker code is bundled separately. Original photographs and repository documents stay outside the website artifact. |

The GitHub repository itself is public, including tracked original assets. The
`dist/` boundary does **not** make those originals private. Confirm their publication
permission; do not delete evidence or rewrite history during this audit.

## Domain, DNS and TLS

| Item                    | Verified observation or explicit limit                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar               | `HOSTINGER operations, UAB` from [Verisign RDAP](https://rdap.verisign.com/com/v1/domain/incetekhenergy.com)                                   |
| Registration / expiry   | 30 September 2026 / 30 September 2027, both 07:11:34 UTC, per RDAP; expiry is not proof of auto-renew or payment                               |
| Transfer status         | `client transfer prohibited` in RDAP                                                                                                           |
| Nameservers             | `guss.ns.cloudflare.com`, `vida.ns.cloudflare.com`; public NS and RDAP agree                                                                   |
| Apex and `www` A        | `104.21.3.249`, `172.67.131.98` (TTL 300 at query time)                                                                                        |
| Apex and `www` AAAA     | `2606:4700:3037::6815:3f9`, `2606:4700:3030::ac43:8362` (TTL 300)                                                                              |
| Apex internal record    | Worker-managed record reported by owner; exact record/custom-domain status needs dashboard verification                                        |
| `www` internal record   | Owner reports proxied A to `192.0.2.0`; proxy hides the configured target, so public DNS cannot independently confirm it                       |
| Mail / verification TXT | No apex MX or TXT answers; no SPF record observed. `_dmarc.incetekhenergy.com` returns NXDOMAIN                                                |
| DNSSEC / CAA            | No parent DS or apex CAA answers observed; signed delegation not established. Dashboard DNSSEC state is unknown                                |
| TLS                     | Apex and `www` validated with normal certificate checking; TLS 1.3 negotiated                                                                  |
| Certificate             | Google Trust Services / WE1; SANs `incetekhenergy.com`, `*.incetekhenergy.com`; valid 12 October 2026 17:17:10 to 10 January 2027 18:17:07 UTC |

The observed edge IPs are **not origin addresses or configuration instructions**.
Do not copy them into DNS. The reported placeholder `192.0.2.0` is for proxied
redirect handling, not a server. Do not create a separate `www` zone. Future
mail DNS belongs in Cloudflare, even if the mailbox provider is Hostinger.

Auto-renew, renewal price, payment method, registrar contacts, recovery access,
Cloudflare zone status, minimum TLS version and certificate renewal settings
remain manual checks. A valid edge certificate does not prove any of these.

### Historical HTTP acceptance snapshot (before HTTPS enforcement)

Requests used `curl.exe` without following redirects or disabling TLS validation.

| Request                                               | Result                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `https://incetekhenergy.com/`                         | 200; expected website                                                             |
| `https://www.incetekhenergy.com/`                     | 301 to `https://incetekhenergy.com/`                                              |
| `https://www.incetekhenergy.com/about/?test=1`        | 301 to `https://incetekhenergy.com/about/?test=1`                                 |
| `http://incetekhenergy.com/` and `/about/?test=1`     | 200, not HTTPS redirect                                                           |
| `http://www.incetekhenergy.com/` and `/about/?test=1` | 522, not canonical redirect                                                       |
| HTTPS `/contact/`, `/te/`, `/privacy/`                | 200; noindex; correct apex canonicals                                             |
| HTTPS `/robots.txt`                                   | 200, `User-agent: *` and `Allow: /`; no sitemap declaration                       |
| HTTPS `/sitemap.xml`                                  | 200, empty `urlset`                                                               |
| HTTPS `/reviews/`                                     | 200 HTML with immediate meta refresh to `/#reviews`, noindex; **not an HTTP 301** |
| HTTPS `/audit-not-found-20261013/`                    | Genuine 404, custom page, noindex, no canonical                                   |

Additional live GETs returned 200 for `/about/`, `/services/`, `/products/`,
`/projects/`, `/solar-guide/`, `/financing/`, `/terms/`, `/solar-in/kadapa/` and
the Hindi, Tamil, Malayalam and Kannada homepages. This is route availability
evidence, not a complete visual, translation or real-device review.

### Current HTTP acceptance (SEO activation, 13 October 2026)

The owner reports **Always Use HTTPS enabled**. Fresh GETs independently verified
root and `/about/?seo=test&value=a%20b` without disabling TLS validation:

| Request    | Observed result                          |
| ---------- | ---------------------------------------- |
| HTTP apex  | 301 to HTTPS apex, preserving path/query |
| HTTP www   | 301 to HTTPS www, then 301 to HTTPS apex |
| HTTPS www  | 301 to HTTPS apex, preserving path/query |
| HTTPS apex | 200, eligible content indexable          |

The previous HTTP 200/522 defect is resolved. The old proposed Single Redirect
was not implemented by this agent and is no longer a pending correction. Leave
the working DNS, redirect rules and HTTPS setting unchanged. Dashboard expressions
and rule order remain uninspected; the table proves behavior, not their values.
Local evidence: `.astro/seo-activation/live-production-true.json`; the earlier
`live-before.json` preserves the pre-activation state.

Python urllib received Cloudflare 403/error 1010 while normal curl succeeded.
This is a client-dependent result, not proof of a general outage or blocked
Googlebot. Inspect security events if legitimate clients/crawlers fail; do not
disable protection solely to satisfy a probe. [Cloudflare error 1010](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/)
describes browser-signature blocking.

## Build, deployment and environments

Repository configuration: [wrangler.jsonc](../wrangler.jsonc),
[astro.config.mjs](../astro.config.mjs), [package.json](../package.json),
[.nvmrc](../.nvmrc) and [.env.example](../.env.example).

| Setting                   | Value / verification                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Build Node                | `.nvmrc` pins `22.23.3`; package minimum `22.19.0`. Actual latest cloud runtime requires build-log confirmation    |
| Dependencies              | npm lockfile committed; reproducible local install command `npm ci`. Dashboard install behavior not inspected      |
| Build root                | `/` (repository root), owner-verified in both build configurations on 13 October                                   |
| Build command             | `npm run build`, owner-verified for Production and Previews Base                                                   |
| Production deploy command | `npx wrangler deploy`, owner-verified                                                                              |
| Preview command           | `npx wrangler preview`, owner-verified; previews enabled                                                           |
| Output                    | `dist/`; Wrangler `assets.directory: "./dist"`                                                                     |
| Routing                   | `not_found_handling: "404-page"`; no SPA fallback; Astro `trailingSlash: "always"`                                 |
| Compatibility date        | `2026-09-30`; a Workers compatibility setting, not a Node version                                                  |
| Previews                  | Empty `previews: {}` config; this alone proves neither access restrictions nor variable separation                 |
| Wrangler version          | Not pinned in package.json/lockfile; the old 4.144.0 dry-run is historical, not proof of today's cloud CLI version |
| Environments              | No named Wrangler `env` blocks, staging Worker or infrastructure-as-code domain/routes declarations                |

### GitHub evidence and release policy

- Historical `main` SHA `a59cd724f7bd090465b5f1ce959a5c4b782fc947` has a successful
  `Workers Builds: incetekh-energy-systems` check completed **30 September 2026
  17:09:30 UTC**, build ID `6c1443cc-b4a5-4442-aca7-bc0628e58a65`.
- [PR #23](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/23) head
  `d321f1254d83f0cb73a930e0faf1f8a4290c7510` has a successful preview check,
  completed 30 September 2026 17:06:41 UTC; preview branch
  `feat-vendor-credentials-contacts`.
- No GitHub Actions workflows, environments, deployment records, repository
  Actions secrets or Actions variables were returned. Cloudflare Builds is a
  separate Git integration; empty GitHub deployment records do not mean no site.
- Classic protection for `main` returned `Branch not protected`; repository
  rulesets were empty. No open PR existed at audit start.

**Inferred:** this integration has automatically built main and preview commits.
**Owner confirmed:** main and preview builds are enabled with the commands below.
**Owner reports deployed SHA:** `5051254`; GitHub confirms its successful rebuild
and public checks confirm expected output. **Unknown:** Worker version ID, watch paths, dashboard approval
gates, token scope, or whether lint/tests run in
the cloud. `npm run build` alone does not execute `npm run verify`. A green build
check is not independent code review or full test evidence.

For dashboard verification, inspect **Workers & Pages / this Worker / Settings /
Builds**: repository, production branch, commands, build root, watch paths, preview
branches, build variables and deployment credential permissions. Check Deployments
for the **active version ID and SHA**, not just the most recent successful build.
Version/rollback identifiers remain manual verification tasks. SEO activation
settings and release approval were established for PR #26. Keep credentials and
account recovery material outside Git.

Use fresh main, one component/branch/PR, focused validation, self-review, independent
review, then approved merge. Consider required PR review and relevant successful
checks using [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
No protections were changed here. **Pushes, including documentation branches, may
publish previews; merges may publish production.** The initial audit stayed local;
the owner subsequently authorized the audit/contact releases and explicitly
approved PR #26 after its release implications/settings were established. Future
production changes still follow the agreed review and approval process.

Cloudflare's [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
distinguishes production deployment, preview commands, and build variables from
runtime variables. These are provider capabilities, not verification of this account.

**Owner dashboard verification during SEO preparation, 13 October:** Production
branch `main`, build `npm run build`, deploy `npx wrangler deploy`, root `/`, builds
enabled. Previews Base: enabled, build `npm run build`, preview `npx wrangler preview`,
root `/`. Both lists were initially empty. The owner subsequently added only
`PUBLIC_SITE_INDEXABLE=true` to Production and rebuilt `5051254`; Previews Base
remains unset. No manual `WORKERS_CI` / `WORKERS_CI_BRANCH` overrides were reported. These
values are owner-verified rather than directly inspected by the agent. They
supersede the corresponding command/branch/root/variable unknowns in the initial
audit inventory. Runtime, credentials, active version and watch-path details remain
unverified. Public acceptance confirms production indexing; the branch guard and
alias response header remain in place. Previews Base stays unset.

### Public build variables

| Variable                          | Repository behavior                                                   | Live evidence / remaining check                                                        |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_INDEXABLE`           | Defaults false; dev/non-main Workers builds stay noindex even if true | Owner confirms true in Production only; all 138 live content URLs indexable            |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional HTML meta token                                              | No tag observed. Search Console ownership can use other methods; account state unknown |

These values are baked into static HTML; changing runtime variables cannot repair
the deployed output. An approved rebuild/deployment is required. Never put API
keys in `PUBLIC_*`. Keep preview builds non-indexable. Analytics is edge-injected
with EU exclusion; preview/alias collection requires live verification. Free has
no advanced Web Analytics rules; see [ANALYTICS.md](ANALYTICS.md). The
public `workers.dev` production alias shares the deployment and can inherit an
indexable build. PR #26 deployed host-specific `X-Robots-Tag: noindex` through
`public/_headers` for `https://:version.:subdomain.workers.dev/*`. This header is
verified on HTTP and HTTPS production alias responses after activation. Canonicals
alone are not the duplicate-indexing safeguard.

## SEO, content and lead paths

Verified source includes per-page metadata, absolute apex canonicals, Open Graph,
Twitter metadata, language alternates and Organization/WebSite JSON-LD on the
English homepage. No review/rating schema is generated. Source sitemap covers
23 content routes (10 general pages and 13 city guides) across six languages:
English, Telugu, Hindi, Tamil, Malayalam and Kannada — **138 eligible URLs** when
indexing is enabled. The live sitemap now contains exactly those 138 URLs; 404s
and `/reviews/` are excluded.

Google Search Console property, ownership, submission and indexing are unknown.
No apex TXT verification or HTML tag was observed; that does not rule out another
ownership method. Recommend the domain property under the owner-approved Google
account, DNS verification in Cloudflare, then sitemap submission after public
readiness approval. Technical indexing configuration is now verified. [Google's verification methods](https://support.google.com/webmasters/answer/9008080?hl=en)
distinguish domain-wide DNS verification from URL-prefix methods. Google Business
Profile ownership/details and real-user performance metrics remain unverified.

The live homepage contains the ten temporary comments from
`src/data/review-samples.ts`. Internal `illustrative` markup is not a visible
disclaimer or permission to publish endorsements. Follow [TESTIMONIALS.md](TESTIMONIALS.md).
Review translations and claims before promoting the site; deployment did not
establish native-speaker approval, customer consent or official vendor status.

Public contact contract, owner-confirmed on 13 October and corrected in source:

- Sole public call number: `+91 94412 59786` (`tel:+919441259786`), including
  Contact metadata/heading and Organization structured data. The older primary
  number and duplicate secondary-phone fields were removed.
- WhatsApp drafts: `https://wa.me/919441259786`; user must choose to send.
  These are ordinary outbound links, not a Meta API integration.
- Public email: `incetekhenergy@gmail.com`, including the service-complaint link,
  all five translation catalogues and shared page/footer contact paths. The
  invalid historical `support@incetekh.com` and inactive future
  `info@incetekhenergy.com` must be absent from generated public HTML.
- At the original contact audit, the form only validated locally. The subsequent
  production activation added the Worker API and D1 persistence; see
  [PRODUCTION_LEAD_ACTIVATION.md](PRODUCTION_LEAD_ACTIVATION.md). No real enquiry,
  call, WhatsApp message or email was sent during this cleanup.

`tests/public-contacts.spec.ts` checks every generated HTML artifact (all six
languages, error pages and legacy redirect), contact destinations, invalid
addresses/numbers, and internal page/fragment links. Browser checks cover contact
and footer layout at mobile/desktop sizes. PR #25 post-merge checks confirmed the same contract across all 145 live routes.
Actual recipient delivery was not tested.

### Analytics discrepancy found during browser acceptance

**Owner-confirmed, 14 October 2026:** Cloudflare Web Analytics is enabled,
Automatic Setup is active on Free, with **Enable, excluding visitor data in the EU**
selected. Cloudflare injects the script for eligible visitors and data is collected.
The owner verified that EU visitors do not receive the snippet under this setting;
this is dashboard/provider evidence, not an agent test from an EU network.
Advanced Web Analytics rules require Pro or higher; no upgrade or setting change
was made.
This resolves the earlier uncertainty about the browser beacon's source and
account ingestion. No agent inspected or changed dashboard settings.

**Historical observation, 13 October:** all twelve Chrome homepage checks
observed a beacon, while curl/local artifacts omitted it and privacy copy said
analytics was disabled. The privacy condition depended on an absent build token,
which did not represent Cloudflare's independent Automatic Setup.

The focused privacy PR removes the stale disabled disclosure, adds the provider's
collection/privacy details in all six languages, and removes unused manual beacon
injection to prevent duplicates. **It is not deployed to production:** production retains its
old disclosure until an approved release. Automatic injection, CSP, indexing,
contacts, forms and reviews are preserved. No Cloudflare changes are needed for
this implementation. See [ANALYTICS.md](ANALYTICS.md) for official sources,
validation, the confirmed EU exclusion and Free-plan limits, and remaining checks
for hostname isolation, access, terms, exports, translations and applicable consent
requirements. Automatic branch previews are authorized for PR #28.

Historical captures remain in `.astro/seo-activation/live-analytics-discrepancy.json`
and `live-browser-final.json`. These are dated observations, not current account
configuration authority. The unused `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` setting is
retired in the privacy PR; do not add it to either build configuration.

## Email and external services

| Service                            | State / ownership boundary                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Administrative Gmail               | `incetekhenergy@gmail.com`, confirmed by owner; actual logins, recovery and MFA not inspected                                              |
| Current public address             | `incetekhenergy@gmail.com`, explicitly owner-confirmed for enquiries; live links verified, actual receipt not tested                       |
| Future branded mail                | `info@incetekhenergy.com` / possible support mailbox are proposals, not active mailboxes; provider, owners, aliases and budget undecided   |
| Mail DNS                           | No MX/SPF/DMARC observed for `incetekhenergy.com`; DKIM selectors/provider not known, so DKIM cannot be exhaustively checked               |
| Cloudflare Web Analytics           | Owner confirms Free, Automatic Setup and collection excluding EU visitors; privacy correction not deployed to production; see ANALYTICS.md |
| Google Analytics / Tag Manager     | No implementation found in source or sampled live HTML                                                                                     |
| Search Console / Business Profile  | Technical readiness verified; dashboard ownership/submission and actual indexing unknown                                                   |
| Maps, payments, CRM, form provider | No integration found in repo; no such bindings declared                                                                                    |
| Manufacturer/government references | Outbound resource links and local logos, not API dependencies or proof of service accounts                                                 |
| WhatsApp Cloud API, AI, VM/backend | Not implemented in this repository and excluded by current scope                                                                           |

Missing MX is evidence that normal domain-mail setup is incomplete, not proof
that no provider subscription was bought. No mailbox operation was tested.
Choose provider and mailbox list first, preserve DNS, then configure only the
provider-issued records after approval. Verify inbound/outbound/replies and
SPF/DKIM/DMARC results before publishing the new address. See [EMAIL.md](EMAIL.md).

## Security and monitoring

Verified live content responses carry `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and
`Permissions-Policy: camera=(), microphone=(), geolocation=()`.
HTML cache policy is `public, max-age=0, must-revalidate`. A sampled hashed CSS
asset returned `public, max-age=31536000, immutable` and an ETag.

The homepage includes a **CSP meta tag** with local script/style hashes,
`object-src 'none'`, `base-uri 'none'`, `form-action 'none'` and allowed Cloudflare
analytics origins. It is not a CSP response header. No HSTS header was observed
on sampled HTTPS responses. Redirects now pass; inspect all hostname coverage
before deciding an HSTS policy; do not enable preload speculatively.

Workers Static Assets supports `_headers`; it is not Pages-only. The live headers
agree with [public/_headers](../public/_headers). Provider behavior and limits are
documented in [Workers headers](https://developers.cloudflare.com/workers/static-assets/headers/).
They do not automatically cover future Worker-generated API responses.

No application credentials are required by the static source. `.env*` is ignored
except `.env.example`; this is not a full Git-history secret scan. Dashboard-only
bindings/secrets, MFA, collaborators, deploy tokens, WAF/Bot settings, Access,
audit logs and recovery arrangements remain manual checks. Do not record secrets
or private billing/customer information here.

No uptime monitor, alert integration, Sentry or scheduled operational checks were
found in the repository. Cloudflare response reporting headers are not proof of
owner-facing alerts. Verify metrics, log retention, security events and build
failure notifications in the dashboard. Nominate the founder as incident owner
and confirm who receives alerts; do not assume Gmail is already configured there.

Recommended routine: after every release check redirects, root/contact, 404,
robots/sitemap, assets and contact destinations; weekly inspect failures/traffic;
monthly inspect charges and recovery access; set domain-renewal reminders well
before September 2027. An uptime service is optional future approved work, not
installed by this audit. PageSpeed/mobile/real-user checks remain launch tasks.

## Rollback and recovery

**Accepted SEO source/build:** `5051254`, build
`c955fe18-92b5-43e8-a7f9-fa6fb84a3543`, with production build flag true. The same
source was verified with indexing off in build
`310432eb-a0d7-4527-a4b9-14d2162355cd`. A source SHA alone therefore does not
identify indexing behavior: preserve the build flag too. Dashboard Worker version
IDs and a retained rollback target are still unverified. Record those before the
next release; neither build ID is a substitute for a Worker version ID.

For an approved release, record SHA, active Worker version/deployment ID, build
log, Node/Wrangler versions, public build settings, previous version and acceptance
results. Preserve source assets, lockfile and configuration. Export DNS/rules and
account recovery instructions to owner-controlled secure storage; Git does not
back up dashboard settings, mailboxes or private credentials.

If a future authorized release fails:

1. Inspect build/deployment state and identify the previously accepted version.
   Coordinate any automatic trigger pause with the owner; do not let a new build
   immediately overwrite recovery.
2. After explicit deployment authorization, use Workers & Pages >
   `incetekh-energy-systems` > Deployments > the selected version > Rollback.
   This creates a deployment affecting its routes/domains. No rollback was run here.
3. Recheck the HTTP matrix, contact paths, 404, metadata, robots/sitemap, headers
   and critical assets. Record new active version and time.
4. Follow with a reviewed Git revert/fix so the next main build preserves recovery.
   Do not reset shared history or improvise DNS changes.

[Cloudflare rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
are limited to recent published versions and do not restore connected resources.
Likewise, do not assume they restore zone DNS, redirect rules, billing or email.
If no retained version is suitable, rebuild a preserved reviewed SHA with its
recorded build settings and deploy only after approval. Recovery time has not
been measured; no restoration drill was performed.

## Costs

The owner confirms the zone/Web Analytics **Free** plan on 14 October. Workers
subscription, add-ons, invoices and renewal totals remain **unknown**. Do not describe
the whole setup as free or treat public pricing as an invoice. Reference pricing
was checked on 13 October 2026; recheck before any purchase or upgrade.

| Item                   | Basis / open item                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Workers static hosting | Static asset requests are free/unlimited under the documented standard model; account may still carry a paid plan/add-ons          |
| Workers subscription   | Free tier exists; standard paid subscription starts at US$5/month. Existing subscription unknown                                   |
| Workers Builds         | Free: 3,000 build minutes/month; paid: 6,000 included, then US$0.005/minute. Usage and account plan unknown                        |
| Domain                 | Hostinger annual renewal due before recorded expiry; price, tax, discounts, auto-renew and payment unknown                         |
| Email                  | Provider/plan/mailbox count not selected in this audit; recurring cost requires owner-approved quote                               |
| Web Analytics          | Owner confirms Cloudflare Free and zero advanced analytics rules; no upgrade or purchase; Workers billing remains a separate check |
| GitHub / monitoring    | No project invoice inspected; no added purchase/integration; confirm existing plans and any optional costs                         |

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
and [Builds pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).
Static requests routed through separately enabled paid Workers caching can have
different billing; verify dashboard features before forecasting. No such cache
configuration exists in the repository. Keep all spend changes separately approved.

## Manual dashboard checklist

Record date, verifier and non-secret evidence for each completed item.

| Where                     | What to verify / record                                                                             | Current status                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Cloudflare account        | Owner/recovery/MFA, members, plan, billing alerts                                                   | Free zone/Web Analytics plan owner-confirmed; Workers billing and other account controls unknown                                     |
| Zone overview + DNS       | Active zone, exact apex/`www` records/proxy state, complete record export, DNSSEC                   | Public NS verified; internal configuration unknown                                                                                   |
| Rules + SSL/TLS           | Actual expressions/order, minimum TLS, certificate renewal and HSTS policy                          | All four redirect variants verified; Always Use HTTPS owner-reported enabled; dashboard not inspected                                |
| Worker domains/routes     | Apex association, active status, alias enablement, other routes                                     | Owner reported; live alias reachable                                                                                                 |
| Worker Builds             | Repo/main, commands/root/runtime, preview filters, watch paths, public variables, token permissions | Owner verified commands/root and production-only true flag; runtime/watch paths/token scope remain unknown                           |
| Worker Deployments        | Active SHA/version, previous accepted version, rollback availability                                | Owner reports `5051254`; matching build success and live output verified; version ID/retention unknown                               |
| Worker previews + Access  | Current preview URLs, noindex and authentication, variable isolation                                | PR #26 preview noindex verified before retirement; fresh documentation-preview result in follow-up PR; Access/authentication unknown |
| Worker runtime + security | Bindings/secret names only, metrics/log retention, security events, build alerts                    | Lead bindings and secret names verified 17 October as recorded above; metrics/log retention and account controls remain unverified   |
| Hostinger                 | Ownership/MFA/recovery, contacts, renewal date/price/payment, purchased mail plans                  | Registrar/registry expiry verified; account state unknown                                                                            |
| Google                    | Gmail recovery/MFA, Search Console property/access/submission, Business Profile                     | Administrative address owner-confirmed; settings unknown                                                                             |

## Remaining launch work in execution order

Each implementation below is a separate authorized component; no stacked PRs.

1. **Audit and contact release closed.** PR #24 and PR #25 are merged; contacts
   were verified live. Capture the current Worker version ID and recovery target.
2. **Keep content decisions explicit.** Reviews remain unchanged as requested.
   Their existing evidence/permission limitations are recorded in TESTIMONIALS.md;
   do not present technical SEO validation as approval of endorsements or translations.
3. **HTTP routing closed.** Owner enabled Always Use HTTPS; both hostnames and
   schemes now resolve through permanent redirects to HTTPS apex. Preserve it.
4. **Complete acceptance and release safeguards.** Record active SHA/version,
   build/preview separation and recovery target; agree PR protection. Check
   desktop/mobile, translated copy, assets, call/WhatsApp destinations, contact,
   404 and accessibility. Use a real-device owner check for actual contact receipt.
5. **SEO activation closed; finish search and measurement separately.** First
   review and release the prepared analytics/privacy correction without changing
   Automatic Setup. Production
   indexing, 138 sitemap entries, live metadata and alias safeguards are verified.
   After content approval, verify Search Console ownership and submit sitemap.
   Preserve the confirmed automatic analytics path; validate released privacy copy
   and remaining account questions. Check Business Profile details and performance.
6. **Complete business email as its own component.** Approve provider, budget,
   mailbox owners and public address; configure Cloudflare mail DNS and verify
   send/receive/authentication. Update all contact links only after acceptance.
   The approved Gmail contact correction in step 1 does not require a purchase.
7. **Close Phase 1 operationally.** Record renewal/billing ownership, monitoring,
   recovery evidence and remaining acceptance items against `SCOPE.md`.

WhatsApp automation, Meta Cloud API, AI agents, CRM and backend/VM work are not
launch prerequisites under current scope. The supplied handoff does not override
that boundary.

## Initial audit validation and workflow disposition (PR #24)

Validated on Node 22.23.3 using the existing installed dependencies:

- Astro/TypeScript check: 80 files, zero errors, warnings or hints.
- Production build: 144 pages; default non-indexable configuration; not deployed.
- Nine existing Playwright checks passed in Chrome: SEO/output, unavailable
  site-visit form and bilingual/multilingual contact/vendor checks at mobile and
  desktop widths. No new tests were necessary for documentation-only edits.
- Formatting passed for tracked supported files and the new infrastructure doc;
  relative documentation links and `git diff --check` passed.
- The initial `npm run lint` flagged the untracked owner handoff. During the
  authorized hygiene follow-up it was archived outside the checkout, unchanged,
  with SHA-256 `5E2DA7C7B611204EE3454BF8815CDFECF54C5BA01928600B260F8F5FA263C7D1`.
  This removes the unrelated document from the repository formatting boundary;
  the normal `npm run lint` now passes after the consistency sweep.
- Independent local agent review found no blocking findings. It checked source,
  diff and saved evidence; it did not independently inspect provider dashboards.

No fresh dependency install, full browser suite, visual/device acceptance,
penetration test, full Git-history secret scan, paid-service verification or
rollback drill was performed. Browser tests used local production output and do
not establish live form delivery or account configuration.

The audit branch `docs/infrastructure-audit` merged as
[PR #24](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/24), producing
`b288d393c8936ece63081d1b4098026ce015f496`. Main was synchronized and the
documentation branch and 23 older merged branches were deleted after preservation.

Local recovery material is under
`C:\Users\axehe\Desktop\incetekh-energy-recovery\hygiene-20261013`: the unchanged
handoff, pre-cleanup ref inventory, merged-PR mapping, full Git bundle and a
verified mirror restore. Fifty saved refs matched the restored bundle. The 23
old feature-branch tips match their merged PR heads and their merge commits are
ancestors of main. Recovery material stays
local; ignored build/test evidence is retained. Future cleanup must likewise
preserve unique material before deleting refs or moving files.

### Contact-correctness follow-up validation

On Node 22.23.3, the follow-up passed Astro/TypeScript checking (81 files, zero
errors/warnings/hints), the 144-page production build and 47 focused Chrome tests.
The artifact audit covers all 145 HTML files including the legacy redirect, all
public contact links and every internal page/fragment link. The browser suite
also covers translated contacts, metadata/schema, accessibility/layout, resources,
SEO configuration and the unchanged unavailable-form behavior. It does not test
actual call, message or mailbox receipt. Customer-review source is unchanged.

The focused branch is `fix/public-contact-correctness`. Its release PR records
independent review, the exact head and Cloudflare checks, and post-merge live
verification. The source validation above must not be read as a deployment claim.
PR #25 is merged and live contact acceptance passed. The owner subsequently
resolved HTTP redirects. Production SEO activation is now verified; see the release acceptance above.

## Maintaining and rechecking this document

Update this file in the same component that changes hosting, DNS, release process,
public build values, email, monitoring or costs. Replace stale observations with
dated evidence; retain historical deployment IDs in release records. Never upgrade
an inferred/manual item to verified without direct evidence.

Read-only checks (PowerShell; no deployment or DNS mutation):

```powershell
git rev-parse HEAD
gh api repos/AxeH666/Incetekh-Energy-Systems/commits/main/check-runs
gh api repos/AxeH666/Incetekh-Energy-Systems/branches/main/protection
gh api repos/AxeH666/Incetekh-Energy-Systems/rulesets
curl.exe -sS -D - -o NUL 'https://www.incetekhenergy.com/about/?test=1'
curl.exe -sS -D - -o NUL 'http://www.incetekhenergy.com/about/?test=1'
curl.exe -sS -D - -o NUL 'http://incetekhenergy.com/about/?test=1'
curl.exe -sS 'https://incetekhenergy.com/robots.txt'
curl.exe -sS 'https://incetekhenergy.com/sitemap.xml'
Resolve-DnsName incetekhenergy.com -Type NS
Resolve-DnsName incetekhenergy.com -Type MX
Resolve-DnsName incetekhenergy.com -Type TXT
Resolve-DnsName _dmarc.incetekhenergy.com -Type TXT
```

Use GET, inspect the first response before following redirects, and never disable
TLS verification to obtain a passing result. Compare errors with a normal client
and security events. The source pointers above plus [VISIBILITY.md](VISIBILITY.md),
[LAUNCH.md](LAUNCH.md) and [EMAIL.md](EMAIL.md) provide the operating procedures.
