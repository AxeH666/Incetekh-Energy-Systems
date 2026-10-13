# Search, analytics and production safeguards

Production SEO is verified on 13 October 2026: all 138 eligible pages are
indexable, the sitemap lists exactly those URLs, and robots announces it.
PR #26 merged as `5051254`; production rebuild
`c955fe18-92b5-43e8-a7f9-fa6fb84a3543` succeeded with the owner-confirmed
Production build flag true and Previews Base unchanged. The production
workers.dev alias remains noindex through its response header. See
[INFRASTRUCTURE.md](INFRASTRUCTURE.md#seo-release-acceptance) for current evidence,
preview limits and remaining manual checks. Search Console ownership/submission
and analytics remain separate; technical readiness does not prove Google indexing.

## Build configuration

Copy `.env.example` to `.env` for local configuration, or set the same values in
the chosen host's build environment. These are public identifiers, not secrets.
Rebuild after any change.

- `PUBLIC_SITE_INDEXABLE=false` is the safe default. All pages emit
  `noindex, follow`, sitemap has no URLs, and robots omits the sitemap announcement.
- Set `PUBLIC_SITE_INDEXABLE=true` only for an approved launch build. Six language versions of 23 content routes become indexable (138 sitemap URLs). The 404 remains noindex with no canonical.
- `astro dev` always stays noindex. Workers Builds must supply `WORKERS_CI=1`
  and `WORKERS_CI_BRANCH=main` for an indexable cloud build. Other branches and
  incomplete Workers context stay noindex even if the flag is accidentally true.
  Never override these provider-injected variables. An explicit local production
  build may use true for validation; do not deploy that artifact as a preview.
- `PUBLIC_GOOGLE_SITE_VERIFICATION` accepts the value from Google's HTML-tag
  verification method. Omit it until a real Search Console property exists.
- `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` accepts the public 32-character beacon
  token from Cloudflare Web Analytics, not a Cloudflare API token. Analytics
  renders only when indexing is enabled AND this token is supplied. Preview
  traffic stays out of the analytics property. The privacy page changes with it.

**Current discrepancy:** live Chrome receives a Cloudflare beacon although the
privacy page says analytics is disabled; curl/local artifacts omit it. See the
[analytics investigation](INFRASTRUCTURE.md#analytics-discrepancy-found-during-browser-acceptance).
Dashboard automatic injection is inferred, not directly verified. Resolve this
separately; the indexing release did not configure an analytics token.

Use either this manual beacon configuration or the host's automatic injection,
never both. Prefer manual configuration so preview/privacy behavior stays
consistent. Disable automatic host injection before launch. No custom visitor
IDs, call-event tracking, advertising pixels or cookies are implemented.

## Search behavior

Each page has a distinct title/description, an absolute canonical, shared social
metadata and one h1. Home includes Organization and WebSite JSON-LD with only
confirmed identity/telephone and the supplied company logo. No address, service area, legal registration,
founding date, rating or review is inferred. A small static sitemap endpoint
lists the general and city routes across all six languages without a new dependency. Add future
public routes there and update its regression test. The old `/reviews/` route
is a noindex static redirect to `/#reviews`, excluded from the sitemap.

Robots allows crawling even for previews: Google must read a page's noindex
instruction. Noindex is not access control; use host authentication for private
previews. Search indexing and rich results are not guaranteed.

## Production safeguards

Astro's built-in CSP emits a policy in each HTML document. Scripts/styles remain
local apart from the optional allowed Cloudflare beacon; objects and form posts
are disallowed. `_headers` configures no-sniff, frame denial, referrer/permissions
policies and immutable caching only for hashed Astro assets on compatible hosts
including Cloudflare Workers Static Assets. Live checks on 13 October confirmed
the configured headers, HTML revalidation and hashed-CSS immutable caching.
Astro preview does not apply `_headers`; recheck hosted HTTP behavior after releases. Keep HTML revalidatable; never cache it as immutable.

Contacts were corrected and verified live in PR #25. The owner enabled Always Use
HTTPS; subsequent GETs confirm permanent redirects to HTTPS apex with path/query
preservation, including the two-hop HTTP www route. Do not alter these redirects.

`public/_headers` adds `X-Robots-Tag: noindex` to
`https://:version.:subdomain.workers.dev/*`, covering the production alias and
branch/version preview hosts while leaving `incetekhenergy.com` unaffected. This
rule also matches HTTP requests: Cloudflare ignores the request scheme/port when
matching absolute `_headers` rules. The workers.dev HTTP alias currently serves
200 and is not covered by the custom zone's Always Use HTTPS setting.
This
protects the alias even when it serves the production HTML with an index meta tag.
Google applies the restrictive noindex instruction. Keep crawling allowed so the
header can be read. This is not access control or a guarantee of immediate removal
from an existing search index. Custom preview domains would need their own review.

**Owner-verified dashboard settings, 13 October 2026:** Production builds are
enabled for `main`, using `npm run build`, `npx wrangler deploy`, root `/`.
Previews Base builds are enabled with `npm run build`, `npx wrangler preview`,
root `/`. The owner initially confirmed empty variable lists and no overrides for
`WORKERS_CI` / `WORKERS_CI_BRANCH`, then added `PUBLIC_SITE_INDEXABLE=true` only
to Production and rebuilt `5051254`. Previews Base remains unchanged/unset. These
are owner-inspected settings, corroborated by production HTTP behavior rather
than direct agent dashboard access. Cloudflare documents per-trigger build variables;
preview runtime bindings are a different setting. The source guard also protects
against an accidentally shared true value. The agent changed no account settings;
the owner performed the production build-variable change.

Reviews are unchanged by explicit instruction. Technical SEO checks do not
establish review/photo permission or native-speaker approval. Existing content
limitations remain recorded in [TESTIMONIALS.md](TESTIMONIALS.md) and
[LANGUAGES.md](LANGUAGES.md). No Search Console property or analytics was created.

## Approved release procedure

**The initial activation below was approved and completed for PR #26.** Retain
this procedure for controlled reactivation/recovery; do not turn indexing off for
routine releases. Future changes require the applicable release approval. A
feature push may deploy a preview; merging main may deploy production. Preserve
the existing true production flag and unset preview flag during ordinary releases.

1. In **Workers & Pages > incetekh-energy-systems > Settings > Build**, record
   repository, production branch (`main`), root (repository root), build command
   (`npm run build`), deploy command (`npx wrangler deploy`) and preview command
   (`npx wrangler preview`). Confirm preview branches do not run production deploy.
   Record current active SHA/version and prior version for recovery.
2. Inspect **Build variables and secrets** under both **Production** and
   **Previews Base**. For a first activation on an unconfigured environment, preserve empty lists
   (`PUBLIC_SITE_INDEXABLE` defaults to false). Confirm no user-defined `WORKERS_CI` or `WORKERS_CI_BRANCH`
   overrides. Keep analytics and Google verification values blank for this release
   unless independently approved; otherwise turning indexing on could enable the
   existing optional beacon. Do not change credentials or runtime bindings.
3. After explicit approval of this procedure and the reviewed head, merge the PR.
   Wait for its exact main SHA to build successfully. Verify noindex on apex and
   `X-Robots-Tag: noindex` on the workers.dev alias and feature preview. If the
   header is missing, stop before activation and diagnose the deployment.
4. Select **Production > Build variables and secrets > Add variable**. Add a
   plain text variable named `PUBLIC_SITE_INDEXABLE` with value `true`, then save.
   Leave **Previews Base** unchanged (unset means false; explicit false is also
   safe). Confirm only Production shows the new value. This is a build value,
   not **Settings > Variables & Secrets** (runtime) or a Wrangler `vars` binding.
   If the UI exposes only a shared field, do not assume it is isolated: identify
   both trigger IDs with the operator's existing access and verify per-trigger
   values using the documented Builds API before changing anything. Do not add
   credentials or a new integration just for this task.
5. Go to **Deployments > View Build History**, select the successful **merged main
   SHA containing this PR**, then **Retry build** (or its ellipsis menu). Current
   saved build settings apply to retries. Never retry an older unguarded commit
   with the true flag. Record build ID, deployed version/SHA and public flag.
6. Run the acceptance checks below. If indexing is wrong, restore the production
   build flag to false and rebuild the same guarded main SHA under the approved
   recovery procedure. Verify noindex/empty sitemap and preserve the alias header.
   A runtime-variable edit cannot repair baked HTML. For unrelated site breakage,
   use the recorded Worker rollback target in [INFRASTRUCTURE.md](INFRASTRUCTURE.md).

For a local matrix, use pinned Node 22.23.3, then lint/type-check and build each
scenario before running tests. `SEO_EXPECT_INDEXABLE` is a test-only expected
result override, not an application/deployment setting:

| Build context                              | Flag                                     | Expected indexing      |
| ------------------------------------------ | ---------------------------------------- | ---------------------- |
| Default local build                        | false/unset                              | noindex, empty sitemap |
| Local production validation                | true                                     | 138 indexable URLs     |
| Workers main (`WORKERS_CI=1`, branch main) | true                                     | 138 indexable URLs     |
| Workers feature branch                     | true (intentional misconfiguration test) | noindex, empty sitemap |
| Workers context missing branch             | true                                     | noindex, empty sitemap |
| Local development server                   | true                                     | noindex, empty sitemap |

## Post-release acceptance and Search Console handoff

- Fetch all 138 sitemap URLs: require 200, one `index, follow` meta tag, no
  noindex response header, exact HTTPS apex self-canonical, localized title/
  description and reciprocal en/te/hi/ta/ml/kn plus x-default alternates.
- Confirm `robots.txt` allows crawling and announces
  `Sitemap: https://incetekhenergy.com/sitemap.xml`. Sitemap must contain exactly
  the 138 eligible content URLs with no duplicates, 404s or legacy `/reviews/`.
- Verify homepage Organization/WebSite schema, social image/metadata, a genuine
  missing-path 404 and noindex on error pages/legacy redirect. Confirm contact
  destinations and unavailable-form behavior are unchanged.
- Check both HTTP and HTTPS production workers.dev alias and preview pages have noindex headers;
  preview HTML must also remain noindex with an empty sitemap. Do not infer alias
  headers from local Astro preview; it does not implement `_headers`.
- Recheck all four host/scheme variants at root and a path with encoded query;
  require preserved path/query and a final HTTPS apex 200 without a loop.
- Record the PR, exact SHA, build/version IDs, verification time and results.
  A successful build alone is not live SEO acceptance.

After an approved, verified release, the owner can choose the existing Google
account and configure Search Console. A **Domain property** requires a separate
approved DNS verification in Cloudflare; this milestone does not change DNS.
Alternatively choose the exact **URL-prefix property** `https://incetekhenergy.com/`,
obtain its HTML verification value, set `PUBLIC_GOOGLE_SITE_VERIFICATION` in the
production build and rebuild under approval. Do not invent a token or create a
property automatically. Then verify ownership, submit `sitemap.xml`, inspect
representative English/regional URLs and monitor indexing reports. Search
discovery and rankings are not guaranteed by technical readiness.

## Verification

SEO-preparation validation on 13 October 2026 (local, not production activation):

- Node 22.23.3, lint, Astro/TypeScript (82 files, no diagnostics), 144-page builds.
- Four opt-in build scenarios passed six SEO/contact artifact/browser checks each:
  Workers main and local launch indexable; feature branch and missing-branch
  Workers context non-indexable. All page-body hashes matched the default build.
- Final default-build regression run: 28 passed, covering all 145 HTML artifacts,
  138 eligible canonical/hreflang/metadata sets, sitemap, contacts, localized
  layouts/navigation, city pages, calculator and unavailable-form behavior.
- The review-corrected city expectation passed separately with an intentionally
  true preview flag. Development mode passed four noindex/robots/sitemap checks
  despite true flag and simulated Workers main metadata.
- Cached Wrangler 4.144.0 local asset server parsed all three header rules;
  12 HTTPS fixture checks and three HTTP hostname checks confirmed workers.dev
  noindex headers with indexable HTML, no such header on the custom domain, and
  preserved 404 behavior. Self-signed TLS was bypassed only on the loopback fixture;
  all external checks used normal certificate validation.
- The first overlapping build/test invocation caused two transient local 404s;
  both isolated reruns and the final sequential 28-test run passed. This was a
  validation scheduling error, not a site change. Evidence is retained under
  ignored `.astro/seo-activation/`.

Cloudflare preview verification, independent final-head review and release
approval are recorded in [PR #26](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/26).
Subsequent live production acceptance is recorded in
[INFRASTRUCTURE.md](INFRASTRUCTURE.md#seo-release-acceptance). Local checks alone
cannot prove production activation.

`npm run verify` checks the default preview build. For a launch-mode check set
the public indexing flag and build, then run `npm test -- tests/seo.spec.ts` with
the same environment values. This test substitutes the optional beacon locally;
it never contacts the analytics service. An enabled local test does not verify
dashboard ingestion. Check that separately after an approved deployment.

## Official references checked during implementation

- [Google Organization markup](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google noindex and crawling](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Sitemap format and submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Cloudflare Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/)
- [Cloudflare analytics privacy](https://developers.cloudflare.com/web-analytics/about/)
- [Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp)
- [Cloudflare static headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Workers build configuration and injected branch values](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Per-trigger build environment variables](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)
- [Build history and retry](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/)
- [Astro build-time environment variables](https://docs.astro.build/en/guides/environment-variables/)
- [Google robots meta and X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google localized-page alternates](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Search Console verification methods](https://support.google.com/webmasters/answer/9008080?hl=en)
