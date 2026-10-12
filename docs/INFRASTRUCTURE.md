# Infrastructure and operations

Last audited: **13 October 2026 (Asia/Kolkata)**. Maintainer: founder, with the
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

## Evidence and access

- **Verified — repository:** inspected at `a59cd724f7bd090465b5f1ce959a5c4b782fc947`
  (`main` and fetched `origin/main` agreed). This proves source configuration only.
- **Verified — live:** unauthenticated HTTP GETs, validated TLS, public DNS via
  Google DNS, selected mail checks repeated via Cloudflare DNS, and Verisign RDAP.
  These are point-in-time observations, not an uptime or device-acceptance claim.
- **Verified — GitHub:** authenticated read-only API inspection of repository,
  checks, workflows, environments, deployments, rulesets and branch protection.
- **Owner reported:** the supplied handoff and current administrative email.
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
HTTP redirects, public content/contact correctness, indexing, search/measurement,
operational ownership and professional email still need closure.

| Finding                               | Evidence                                                                                    | Required follow-up                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Production excludes search indexing   | Live content has `noindex, follow`; sitemap has zero URLs                                   | Fix public-readiness gaps first, then approve an indexable production build                           |
| HTTP is not canonicalized             | Apex HTTP returns 200; HTTP `www` returns 522 on root and a path/query test                 | Inspect redirect rules and HTTPS enforcement; approve a focused correction                            |
| Public email cannot presently resolve | Live `support@incetekh.com`; `incetekh.com` returns NXDOMAIN through two resolvers          | Confirm the intended public mailbox; remove/replace the broken contact path through a reviewed change |
| Temporary endorsements are live       | Ten source comments, live `data-review-status="illustrative"`, no visible sample disclaimer | Replace with verified, permissioned feedback or remove; review photo permission separately            |
| Form is deliberately unavailable      | Live notice says inputs are not sent/saved; source prevents submission                      | Keep truthful call/WhatsApp fallback; delivery is not configured                                      |
| Release safeguards are procedural     | No `main` branch protection or repository rulesets; successful Cloudflare check exists      | Confirm deployment policy and propose minimal review/check protection before subsequent releases      |
| Active Worker version is unknown      | GitHub proves a successful build, not the currently active version                          | Record dashboard version ID, deployed SHA, variables and rollback target                              |

## Architecture and inventory

```text
Hostinger: domain registration and renewal
    -> Cloudflare authoritative DNS
    -> HTTPS incetekhenergy.com
    -> Cloudflare Workers Static Assets: incetekh-energy-systems
    -> dist/ (Astro-generated HTML, CSS, JS, fonts and image derivatives)

GitHub main -> Cloudflare Workers Builds -> build -> Wrangler deployment
GitHub feature branches -> Cloudflare branch previews (historically verified)
HTTPS www -> Cloudflare 301 -> HTTPS apex, preserving path and query
```

| Item           | Configuration / status                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Repository     | [AxeH666/Incetekh-Energy-Systems](https://github.com/AxeH666/Incetekh-Energy-Systems), public; default branch `main` — GitHub verified |
| Local checkout | `C:\Users\axehe\Desktop\incetekh energy` — verified                                                                                    |
| Production     | <https://incetekhenergy.com/> — live 200                                                                                               |
| Host alias     | <https://incetekh-energy-systems.incetekhenergy.workers.dev/> — live 200, public, noindex, canonical points at apex                    |
| Worker         | `incetekh-energy-systems` — Wrangler config and GitHub build check agree; owner reports apex custom-domain binding                     |
| Rendering      | Astro `7.3.5`, static output, TypeScript, plain CSS, self-hosted Manrope; no SSR adapter                                               |
| Runtime        | Static Assets service; no Worker entrypoint, database, VM, queues, cron, storage bindings or application secrets declared in repo      |
| Middleware     | `src/middleware.ts` localizes HTML at build time; it is not a production request API                                                   |
| Asset boundary | Upload `dist/` only; original project/review photographs and repository documents stay outside the website artifact                    |

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

### HTTP acceptance snapshot

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

The handoff describes an HTTPS-only `www` rule. Its scope could explain the HTTP
failure, but exact rule order and cause require dashboard inspection. After
approval, inspect [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
and the [hostname redirect pattern](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).
Accept only a loop-free permanent redirect to HTTPS apex with paths and queries
preserved for both schemes/hostnames. Do not change DNS speculatively.

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
| Build root                | Repository root inferred from layout; verify dashboard root-directory field                                        |
| Build command             | `npm run build` in package scripts and owner handoff; dashboard current value unverified                           |
| Production deploy command | Owner reports `npx wrangler deploy`; not a package script; verify dashboard                                        |
| Preview command           | Historical integration uses `npx wrangler preview`; current branch filters/command require dashboard check         |
| Output                    | `dist/`; Wrangler `assets.directory: "./dist"`                                                                     |
| Routing                   | `not_found_handling: "404-page"`; no SPA fallback; Astro `trailingSlash: "always"`                                 |
| Compatibility date        | `2026-09-30`; a Workers compatibility setting, not a Node version                                                  |
| Previews                  | Empty `previews: {}` config; this alone proves neither access restrictions nor variable separation                 |
| Wrangler version          | Not pinned in package.json/lockfile; the old 4.144.0 dry-run is historical, not proof of today's cloud CLI version |
| Environments              | No named Wrangler `env` blocks, staging Worker or infrastructure-as-code domain/routes declarations                |

### GitHub evidence and release policy

- `main` SHA `a59cd724f7bd090465b5f1ce959a5c4b782fc947` has a successful
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
**Unknown:** whether current triggers/watch paths changed, exact active production
SHA/version, dashboard approval gates, token scope, or whether lint/tests run in
the cloud. `npm run build` alone does not execute `npm run verify`. A green build
check is not independent code review or full test evidence.

For dashboard verification, inspect **Workers & Pages / this Worker / Settings /
Builds**: repository, production branch, commands, build root, watch paths, preview
branches, build variables and deployment credential permissions. Check Deployments
for the **active version ID and SHA**, not just the most recent successful build.
These remain manual verification tasks; the owner has authorized publication of
this documentation component despite those recorded gaps. Keep credentials and
account recovery material outside Git.

Use fresh main, one component/branch/PR, focused validation, self-review, independent
review, then approved merge. Consider required PR review and relevant successful
checks using [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
No protections were changed here. **Pushes, including documentation branches, may
publish previews; merges may publish production.** The initial audit stayed local;
the owner subsequently authorized push and merge with this behavior already disclosed. Do not start the next implementation component until
this documentation component is reviewed and merged under an approved release policy.

Cloudflare's [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
distinguishes production deployment, preview commands, and build variables from
runtime variables. These are provider capabilities, not verification of this account.

### Public build variables

| Variable                            | Repository behavior                                                | Live evidence / remaining check                                                                       |
| ----------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_INDEXABLE`             | Defaults to `false`; accepts only `true`/`false`                   | Output behaves as false. Dashboard may have it false or unset; cannot distinguish                     |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`   | Optional HTML meta token                                           | No tag observed. Search Console ownership can use other methods; account state unknown                |
| `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` | Optional 32-hex public beacon ID; emitted only in indexable builds | No beacon in sampled HTML; privacy says disabled. Token could be configured but suppressed by noindex |

These values are baked into static HTML; changing runtime variables cannot repair
the deployed output. An approved rebuild/deployment is required. Never put API
keys in `PUBLIC_*`. Keep preview builds non-indexable and analytics-free. The
public `workers.dev` production alias shares the deployment and can inherit an
indexable build; plan its restriction, redirect or host-specific noindex before
enabling production indexing. Do not assume a canonical tag is access control.

## SEO, content and lead paths

Verified source includes per-page metadata, absolute apex canonicals, Open Graph,
Twitter metadata, language alternates and Organization/WebSite JSON-LD on the
English homepage. No review/rating schema is generated. Source sitemap covers
23 content routes (10 general pages and 13 city guides) across six languages:
English, Telugu, Hindi, Tamil, Malayalam and Kannada — **138 eligible URLs** when
indexing is enabled. 404s and `/reviews/` are excluded. This is not the current
live sitemap count, which is zero.

Google Search Console property, ownership, submission and indexing are unknown.
No apex TXT verification or HTML tag was observed; that does not rule out another
ownership method. Recommend the domain property under the owner-approved Google
account, DNS verification in Cloudflare, then sitemap submission after public
readiness and indexing correction. [Google's verification methods](https://support.google.com/webmasters/answer/9008080?hl=en)
distinguish domain-wide DNS verification from URL-prefix methods. Google Business
Profile ownership/details and real-user performance metrics remain unverified.

The live homepage contains the ten temporary comments from
`src/data/review-samples.ts`. Internal `illustrative` markup is not a visible
disclaimer or permission to publish endorsements. Follow [TESTIMONIALS.md](TESTIMONIALS.md).
Review translations and claims before promoting the site; deployment did not
establish native-speaker approval, customer consent or official vendor status.

Public contact routing, verified in source and sampled live HTML:

- Primary call: `+91 94401 68111`; secondary call: `+91 94412 59786`.
- WhatsApp drafts: `https://wa.me/919441259786`; user must choose to send.
  These are ordinary outbound links, not a Meta API integration.
- Email: `support@incetekh.com`, including the service-complaint link — broken
  domain resolution observed. Do not silently substitute the administrative Gmail.
- Site-visit form validates locally and reports that nothing was sent. No
  server handler, persistence or delivery integration exists. No real enquiry,
  call, WhatsApp message or email was sent during this audit.

## Email and external services

| Service                            | State / ownership boundary                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Administrative Gmail               | `incetekhenergy@gmail.com`, confirmed by owner; actual logins, recovery and MFA not inspected                                            |
| Current public address             | `support@incetekh.com`; distinct domain from `incetekhenergy.com`; DNS NXDOMAIN confirmed via Google and Cloudflare resolvers            |
| Future branded mail                | `info@incetekhenergy.com` / possible support mailbox are proposals, not active mailboxes; provider, owners, aliases and budget undecided |
| Mail DNS                           | No MX/SPF/DMARC observed for `incetekhenergy.com`; DKIM selectors/provider not known, so DKIM cannot be exhaustively checked             |
| Cloudflare Web Analytics           | Optional repository support; beacon absent and live privacy copy says disabled; account configuration/ingestion unknown                  |
| Google Analytics / Tag Manager     | No implementation found in source or sampled live HTML                                                                                   |
| Search Console / Business Profile  | Readiness work pending; dashboard ownership and status unknown                                                                           |
| Maps, payments, CRM, form provider | No integration found in repo; no such bindings declared                                                                                  |
| Manufacturer/government references | Outbound resource links and local logos, not API dependencies or proof of service accounts                                               |
| WhatsApp Cloud API, AI, VM/backend | Not implemented in this repository and excluded by current scope                                                                         |

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
on sampled HTTPS responses. Inspect hostname coverage and repair HTTP redirects
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

**No verified last-known-good Worker version or artifact is recorded yet.** The
successful main build is a source candidate, not an accepted release: the live
site still has the gaps above. Capture a real rollback target before the next release.

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

Actual account plans, invoices and renewal totals are **unknown**. Do not describe
the whole setup as free or treat public pricing as an invoice. Reference pricing
was checked on 13 October 2026; recheck before any purchase or upgrade.

| Item                            | Basis / open item                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Workers static hosting          | Static asset requests are free/unlimited under the documented standard model; account may still carry a paid plan/add-ons |
| Workers subscription            | Free tier exists; standard paid subscription starts at US$5/month. Existing subscription unknown                          |
| Workers Builds                  | Free: 3,000 build minutes/month; paid: 6,000 included, then US$0.005/minute. Usage and account plan unknown               |
| Domain                          | Hostinger annual renewal due before recorded expiry; price, tax, discounts, auto-renew and payment unknown                |
| Email                           | Provider/plan/mailbox count not selected in this audit; recurring cost requires owner-approved quote                      |
| GitHub / analytics / monitoring | No project invoice inspected; no added purchase/integration; confirm existing plans and any optional costs                |

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
and [Builds pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).
Static requests routed through separately enabled paid Workers caching can have
different billing; verify dashboard features before forecasting. No such cache
configuration exists in the repository. Keep all spend changes separately approved.

## Manual dashboard checklist

Record date, verifier and non-secret evidence for each completed item.

| Where                     | What to verify / record                                                                                           | Current status                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Cloudflare account        | Owner/recovery/MFA, members, plan, billing alerts                                                                 | Unknown                                                     |
| Zone overview + DNS       | Active zone, exact apex/`www` records/proxy state, complete record export, DNSSEC                                 | Public NS verified; internal configuration unknown          |
| Rules + SSL/TLS           | Actual redirect expressions/order, HTTP coverage, Always Use HTTPS, minimum TLS, certificate renewal, HSTS policy | HTTPS redirect/cert verified; HTTP defect confirmed         |
| Worker domains/routes     | Apex association, active status, alias enablement, other routes                                                   | Owner reported; live alias reachable                        |
| Worker Builds             | Repo/main, commands/root/runtime, preview filters, watch paths, public variables, token permissions               | Historical GitHub checks verified; current settings unknown |
| Worker Deployments        | Active SHA/version, previous accepted version, rollback availability                                              | Unknown                                                     |
| Worker previews + Access  | Current preview URLs, noindex and authentication, variable isolation                                              | Historical preview check only; protection unknown           |
| Worker runtime + security | Bindings/secret names only, metrics/log retention, security events, build alerts                                  | No source bindings; account state unknown                   |
| Hostinger                 | Ownership/MFA/recovery, contacts, renewal date/price/payment, purchased mail plans                                | Registrar/registry expiry verified; account state unknown   |
| Google                    | Gmail recovery/MFA, Search Console property/access/submission, Business Profile                                   | Administrative address owner-confirmed; settings unknown    |

## Remaining launch work in execution order

Each implementation below is a separate authorized component; no stacked PRs.

1. **Close this documentation audit.** Publication, independent review, merge and
   stale-branch cleanup are now authorized. Record PR/check results at closeout.
   Dashboard facts and a verified rollback target remain follow-up tasks before
   the next application or infrastructure release.
2. **Repair public correctness urgently.** Owner confirms public contact address
   and testimonial evidence/permissions; focused PR removes/replaces unsupported
   comments and broken email links. Keep the truthful unavailable-form notice
   and call/WhatsApp route; a new backend is not needed to fix these issues.
3. **Repair HTTP routing.** Owner-approved Cloudflare rule/HTTPS change after a
   configuration snapshot. Validate both hostnames/schemes and path/query
   preservation. Review security events without weakening protection blindly.
4. **Complete acceptance and release safeguards.** Record active SHA/version,
   build/preview separation and recovery target; agree PR protection. Check
   desktop/mobile, translated copy, assets, call/WhatsApp destinations, contact,
   404 and accessibility. Use a real-device owner check for actual contact receipt.
5. **Enable search and measurement deliberately.** After content approval,
   configure only production indexing, address the public host alias/previews,
   rebuild/deploy under approval; verify 138 sitemap entries and live metadata.
   Verify Search Console and submit sitemap. Select one analytics path, validate
   ingestion/privacy, and check Business Profile details and page performance.
6. **Complete business email as its own component.** Approve provider, budget,
   mailbox owners and public address; configure Cloudflare mail DNS and verify
   send/receive/authentication. Update all contact links only after acceptance.
   An approved temporary contact correction in step 2 need not wait for purchase.
7. **Close Phase 1 operationally.** Record renewal/billing ownership, monitoring,
   recovery evidence and remaining acceptance items against `SCOPE.md`.

WhatsApp automation, Meta Cloud API, AI agents, CRM and backend/VM work are not
launch prerequisites under current scope. The supplied handoff does not override
that boundary.

## Audit validation and workflow disposition

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

The focused branch is `docs/infrastructure-audit`, based on current main. The
owner's follow-up authorizes push, merge, pull main and stale-branch deletion.
The associated GitHub PR/check history records the publication outcome; this
paragraph records authorization, not a claim that a pending operation succeeded.

Local recovery material is under
`C:\Users\axehe\Desktop\incetekh-energy-recovery\hygiene-20261013`: the unchanged
handoff, pre-cleanup ref inventory, merged-PR mapping, full Git bundle and a
verified mirror restore. Fifty saved refs matched the restored bundle. The 23
old feature-branch tips match their merged PR heads and their merge commits are
ancestors of main. Delete only rechecked tips after the documentation PR merges;
retain any branch that advances or has unmerged work. Recovery material stays
local; ignored build/test evidence is retained. Future cleanup must likewise
preserve unique material before deleting refs or moving files.

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
