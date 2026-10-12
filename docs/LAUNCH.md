# Deployment and launch acceptance

The website is deployed on **Cloudflare Workers Static Assets** at
<https://incetekhenergy.com/>. HTTPS `www` redirects to the apex. Hosting selection
and domain connection are no longer pending. Phase 1 remains incomplete.

The dated [INFRASTRUCTURE.md](INFRASTRUCTURE.md) is authoritative for observed
infrastructure, discrepancies, costs, dashboard gaps, rollback and execution order.
This file is the release checklist. Do not reuse the earlier Pages hosting proposal
as instructions for the existing Workers deployment.

## Release settings

| Setting                      | Repository contract / verification limit                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Source                       | Reviewed commit on `main`; current cloud production branch needs dashboard confirmation |
| Node                         | 22.23.3 in `.nvmrc`, minimum 22.19; verify the cloud build log                          |
| Install                      | `npm ci` for reproducible local validation; confirm cloud install behavior              |
| Build                        | `npm run build`                                                                         |
| Deploy                       | Owner reports `npx wrangler deploy`; verify Cloudflare Builds settings                  |
| Preview                      | Historical integration uses `npx wrangler preview`; `previews: {}` exists in Wrangler   |
| Assets                       | `dist/` only; no Worker script, database or server adapter                              |
| Missing paths                | Wrangler `404-page`; live missing-path test returned 404                                |
| Preview indexing             | `PUBLIC_SITE_INDEXABLE=false`                                                           |
| Approved production indexing | `PUBLIC_SITE_INDEXABLE=true`, only after readiness gaps close                           |
| Public options               | Search Console HTML token and optional Cloudflare beacon in `.env.example`              |

Cloudflare Workers Builds has successful GitHub checks on main and a feature
branch. **A push can publish a preview; a merge can deploy production.** Check
current triggers, watch paths, variables and approvals before pushing. The
initial documentation audit did not push or merge because deployment was
prohibited. The owner subsequently authorized publication, merge and branch
cleanup; the existing Git integration can therefore run for this release. Branch protection is currently absent; propose a focused release
safeguard separately rather than claiming review is enforced.

The 30 September preview fix added the empty `previews` block after a build succeeded
but `wrangler preview` failed. Wrangler 4.144.0 dry-run acceptance was historical;
Wrangler is not pinned in current package dependencies. See GitHub PR #22/#23 and
the audit for build IDs; a past successful build does not identify today's active
Worker version.

## Before the next approved release

1. Confirm dashboard ownership/recovery, active SHA/version, previous accepted
   version, commands, public variables, preview isolation and deployment triggers.
   Export current DNS/rules securely before proposing any infrastructure changes.
2. Fix the public `support@incetekh.com` contact path after confirming the intended
   address. The audit found NXDOMAIN for that domain. Administrative Gmail is
   `incetekhenergy@gmail.com`; do not substitute it publicly without owner approval.
3. Replace the ten temporary comments with verified, permissioned feedback or
   remove them. Verify selected photograph publication rights independently. These
   comments are already live without visible sample labels; noindex is not privacy.
4. Complete native-speaker review of regional copy, especially subsidy, financing
   and legal terms. See [LANGUAGES.md](LANGUAGES.md).
5. Correct HTTP routing through a separately approved Cloudflare change. HTTPS
   `www` preserves path/query, but HTTP apex serves 200 and HTTP `www` returned 522.
6. Use pinned Node, `npm ci`, then `npm run verify` for the default preview build.
   Build the approved production artifact with matching public values and run
   `npm test -- tests/seo.spec.ts` with those values. No test tokens in production.
7. Set only approved analytics/verification options, avoid duplicate beacon
   injection, and handle the public `workers.dev` alias before indexing. Confirm
   previews stay non-indexable; they are not automatically private.
8. Record SHA, Node/Wrangler versions, build configuration, artifact/version and
   recovery target. Deploy only under release authorization.

The site-visit form is deliberately unconnected. It explicitly says no request
is sent; call/WhatsApp links are the available route. Do not imply booking receipt.
Any delivery integration needs separate scope and approval; WhatsApp Cloud API
automation remains excluded by `SCOPE.md`.

## Post-deployment acceptance

- Check every top-level route and representative language/city pages on desktop
  and a real phone; inspect navigation, photographs, focus, privacy and contact links.
  Coordinate actual call/message/email receipt with the owner when authorized.
- Test all four HTTP/HTTPS and apex/`www` combinations, including paths and queries.
  Require a permanent, loop-free redirect to HTTPS apex for noncanonical URLs.
- Verify content `index, follow`, apex canonical/social tags, language alternates,
  homepage structured data, **138 sitemap URLs** and the robots sitemap declaration.
  Current live output is noindex with an empty sitemap; this is a pending gate.
- Check `/reviews/` navigates to `/#reviews`. Current static output is HTTP 200
  with meta refresh, not an HTTP 301. Keep it out of the sitemap and noindex.
- Require a real 404 and noindex for a nonexistent path, no canonical, no SPA fallback.
- Recheck Workers `_headers`, CSP meta policy, HTML revalidation and hashed asset
  immutable caching; inspect browser resource failures. Local preview cannot prove
  edge headers. See [Workers headers](https://developers.cloudflare.com/workers/static-assets/headers/).
- Verify Search Console ownership and submit sitemap; inspect representative URLs
  and structured data. Search visibility is not guaranteed by successful submission.
- If analytics is enabled, verify one beacon, correct privacy copy and actual
  dashboard ingestion. Run deployed performance checks; local builds are not
  real-user Core Web Vitals evidence.
- Follow the documented rollback procedure if acceptance fails; rollback is itself
  a deployment requiring authorization. Preserve evidence and avoid improvised DNS.

Business email remains a separate component: [EMAIL.md](EMAIL.md). Confirm business
listing details before Business Profile setup; do not invent hours, service areas,
legal identifiers or credentials. Do not start later-scope automation.
