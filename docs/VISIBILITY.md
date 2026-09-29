# Search, analytics and production safeguards

No account has been connected or verified and nothing has been deployed.

## Build configuration

Copy `.env.example` to `.env` for local configuration, or set the same values in
the chosen host's build environment. These are public identifiers, not secrets.
Rebuild after any change.

- `PUBLIC_SITE_INDEXABLE=false` is the safe default. All pages emit `noindex,
follow`, sitemap has no URLs, and robots omits the sitemap announcement.
- Set `PUBLIC_SITE_INDEXABLE=true` only for an approved launch build. The six
  content pages become indexable. The 404 remains noindex with no canonical.
- `PUBLIC_GOOGLE_SITE_VERIFICATION` accepts the value from Google's HTML-tag
  verification method. Omit it until a real Search Console property exists.
- `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` accepts the public 32-character beacon
  token from Cloudflare Web Analytics, not a Cloudflare API token. Analytics
  renders only when indexing is enabled AND this token is supplied. Preview
  traffic stays out of the analytics property. The privacy page changes with it.

Use either this manual beacon configuration or the host's automatic injection,
never both. Prefer manual configuration so preview/privacy behavior stays
consistent. Disable automatic host injection before launch. No custom visitor
IDs, call-event tracking, advertising pixels or cookies are implemented.

## Search behavior

Each page has a distinct title/description, an absolute canonical, shared social
metadata and one h1. Home includes Organization and WebSite JSON-LD with only
confirmed identity/telephone. No address, service area, legal registration,
founding date, rating or review is inferred. A small static sitemap endpoint
keeps the six explicit routes readable without a new dependency. Add future
public routes there and update its regression test.

Robots allows crawling even for previews: Google must read a page's noindex
instruction. Noindex is not access control; use host authentication for private
previews. Search indexing and rich results are not guaranteed.

## Production safeguards

Astro's built-in CSP emits a policy in each HTML document. Scripts/styles remain
local apart from the optional allowed Cloudflare beacon; objects and form posts
are disallowed. `_headers` configures no-sniff, frame denial, referrer/permissions
policies and immutable caching only for hashed Astro assets on compatible hosts
such as Cloudflare Pages. On other hosts configure equivalent response headers.
Astro preview does not apply `_headers`; hosted HTTP behavior still needs a
post-deployment check. Keep HTML revalidatable; never cache it as immutable.

## Verification

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
- [Cloudflare static headers](https://developers.cloudflare.com/pages/configuration/headers/)
