# Deployment and launch acceptance

The website is deployed on **Cloudflare Workers Static Assets** at
<https://incetekhenergy.com/>. HTTPS `www` redirects to the apex. Hosting selection
and domain connection are no longer pending. The owner enabled Always Use HTTPS;
all four host/scheme variants now reach HTTPS apex with paths/queries preserved.
Production SEO activation is verified: PR #26 (`5051254`), successful rebuild
`c955fe18-92b5-43e8-a7f9-fa6fb84a3543`, all 138 content URLs indexable and present
in the sitemap, robots declaration, apex canonicals, multilingual metadata and
workers.dev noindex response headers. See the
[release evidence](INFRASTRUCTURE.md#seo-release-acceptance). Phase 1 remains
incomplete: technical SEO does not close content, search-account, email or
operational acceptance.

The dated [INFRASTRUCTURE.md](INFRASTRUCTURE.md) is authoritative for observed
infrastructure, discrepancies, costs, dashboard gaps, rollback and execution order.
This file is the release checklist. Do not reuse the earlier Pages hosting proposal
as instructions for the existing Workers deployment.

## Release settings

| Setting                      | Repository contract / verification limit                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Source                       | Reviewed commit on `main`; owner verified production branch is main on 13 October           |
| Node                         | 22.23.3 in `.nvmrc`, minimum 22.19; verify the cloud build log                              |
| Install                      | `npm ci` for reproducible local validation; confirm cloud install behavior                  |
| Build                        | `npm run build`                                                                             |
| Deploy                       | Owner verified `npx wrangler deploy` in Production Builds                                   |
| Preview                      | Owner verified `npx wrangler preview` in Previews Base; `previews: {}` in Wrangler          |
| Assets                       | `dist/` only; no Worker script, database or server adapter                                  |
| Missing paths                | Wrangler `404-page`; live missing-path test returned 404                                    |
| Preview indexing             | `PUBLIC_SITE_INDEXABLE=false`                                                               |
| Approved production indexing | `PUBLIC_SITE_INDEXABLE=true` in Production build variables, owner enabled and live verified |
| Public options               | Search Console HTML token and optional Cloudflare beacon in `.env.example`                  |

Cloudflare Workers Builds has successful GitHub checks on main and a feature
branch. **A push can publish a preview; a merge can deploy production.** Check
current triggers, watch paths, variables and approvals before pushing. The
initial documentation audit did not push or merge because deployment was
prohibited. The owner subsequently authorized publication, merge and branch
cleanup for the audit/contact releases. **PR #26 received explicit release approval and production activation is verified.**
Future changes still require applicable release authorization. Retain the staged
[SEO release procedure](VISIBILITY.md#approved-release-procedure), including the
build-variable and alias-header checks. Branch protection is currently absent; propose a focused release
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
2. Preserve PR #25's verified live contacts: the owner-confirmed public email
   is `incetekhenergy@gmail.com` and the sole public phone/WhatsApp number is
   `+91 9441259786`. Check all six languages; the former invalid address and
   inactive future `info@incetekhenergy.com` must not appear in public output.
3. Keep customer reviews unchanged in this SEO component as explicitly requested.
   Record the existing review/photo evidence and permission limitations separately;
   technical SEO acceptance is not a claim of verified endorsements.
4. Complete native-speaker review of regional copy, especially subsidy, financing
   and legal terms. See [LANGUAGES.md](LANGUAGES.md).
5. Preserve the working HTTP and www redirects. Recheck them after release;
   the former HTTP 200/522 defect is resolved and needs no new redirect rule.
6. Use pinned Node, `npm ci`, then `npm run verify` for the default preview build.
   Build the approved production artifact with matching public values and run
   `npm test -- tests/seo.spec.ts tests/seo-artifacts.spec.ts` with the expected
   mode. Check main, preview with an accidental true flag, missing branch context,
   and development mode. No test tokens in production.
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
  Passed after production activation on 13 October 2026; repeat after future releases.
- Check `/reviews/` navigates to `/#reviews`. Current static output is HTTP 200
  with meta refresh, not an HTTP 301. Keep it out of the sitemap and noindex.
- Require a real 404 and noindex for a nonexistent path, no canonical, no SPA fallback.
- Recheck Workers `_headers`, CSP meta policy, HTML revalidation and hashed asset
  immutable caching; inspect browser resource failures. Local preview cannot prove
  edge headers. See [Workers headers](https://developers.cloudflare.com/workers/static-assets/headers/).
- Verify workers.dev alias/preview responses carry `X-Robots-Tag: noindex`, while
  production custom-domain content has no noindex header. Preview HTML and sitemap
  remain non-indexable even if its build flag is mistakenly true.
- After this milestone, separately configure Search Console ownership and submit sitemap; inspect representative URLs
  and structured data. Search visibility is not guaranteed by successful submission.
- Reconcile the live Chrome beacon with the privacy page's disabled-analytics claim;
  dashboard injection/ingestion remains unverified. See the infrastructure discrepancy.
  If analytics is approved, verify one beacon, correct privacy copy and actual
  dashboard ingestion. Run deployed performance checks; local builds are not
  real-user Core Web Vitals evidence.
- Follow the documented rollback procedure if acceptance fails; rollback is itself
  a deployment requiring authorization. Preserve evidence and avoid improvised DNS.

Business email remains a separate component: [EMAIL.md](EMAIL.md). Confirm business
listing details before Business Profile setup; do not invent hours, service areas,
legal identifiers or credentials. Do not start later-scope automation.
