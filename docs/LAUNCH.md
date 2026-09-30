# Deployment handoff

## Cloudflare branch-preview correction — 30 September 2026

The repository now has an existing Cloudflare Workers build integration for
`incetekh-energy-systems`. The supplied log showed `npm run build` successfully
generating 144 static pages, followed by `npx wrangler preview` failing because
the required `previews` block was missing. The founder authorized completing
the preview fix and Git workflow after reviewing the proposed configuration.

`wrangler.jsonc` serves only `dist/`, uses `404-page` for missing paths, and
includes an empty `previews` block. No Worker script, runtime bindings, DNS
records or custom-domain changes are added. Wrangler 4.144.0 accepted this
configuration in a local `deploy --dry-run`; remote status is recorded in the
PR. The existing Cloudflare integration performs the branch-preview publication
after push. This does not complete the production-domain, indexing, verified
content, form-delivery or business-email launch gates below.

Configuration references: [Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/)
and [static-site routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Original launch handoff

Status: local website ready; no hosting account, domain connection, deployment,
Search Console verification or analytics account was changed in this task.
The wider SCOPE.md milestone remains incomplete until launch and business email
are separately approved, configured and verified.

## Hosting choice and build

This is a static site. A static host is sufficient; no adapter, application
server, database, VM or runtime secrets are needed. Cloudflare Pages is a
compatible option for the included `_headers` file, not a purchased/selected
service. Another static host can serve the same `dist/` directory with equivalent
headers. Keep the existing repository; do not re-scaffold from a hosting guide.

| Setting                  | Value                                    |
| ------------------------ | ---------------------------------------- |
| Source                   | Reviewed commit on `main`                |
| Node                     | 22.23.3 (`.nvmrc`; minimum 22.19)        |
| Install                  | `npm ci`                                 |
| Build                    | `npm run build`                          |
| Publish directory        | `dist`                                   |
| Production domain        | `https://incetekhenergy.com`             |
| Preview indexing         | `PUBLIC_SITE_INDEXABLE=false`            |
| Launch indexing          | `PUBLIC_SITE_INDEXABLE=true`             |
| Analytics / verification | Optional public values in `.env.example` |

Only publish `dist/`, never the repository root or original asset folders.
Disable automatic deployments until the founder approves the release policy.
Preview and production environments must have separate indexing settings.
Do not enable automatic analytics injection alongside the manual token option.

## Before the approved launch

Complete native-speaker editorial review of the machine-translated regional copy,
especially subsidy, finance and legal terms. See [LANGUAGES.md](LANGUAGES.md).

The homepage site-visit form is deliberately unconnected at the founder's request. Before offering online booking publicly, connect and verify the chosen email or WhatsApp delivery path, update its availability/privacy copy, and confirm a real request arrives. The current form validates locally and explicitly says nothing was sent. See [SOLAR-PLANNING.md](SOLAR-PLANNING.md).

1. Confirm hosting account ownership, registrar/DNS access and deployment approval.
2. Confirm use of the public phone number and permission to publish the selected
   project/customer photographs. Replace all 10 temporary comments using the verified review sheet, or remove
   the feedback text. The final polish has no visible sample labels and is not
   approved to publish invented endorsements. See TESTIMONIALS.md.
3. Inspect existing DNS records and save their values before proposing changes.
   Use the host's actual domain instructions and assigned targets. Do not guess
   an IP/CNAME or replace existing mail records. An apex-domain setup on Pages
   can require Cloudflare nameservers; decide that only after inspecting DNS.
4. Configure HTTPS and choose the apex domain as canonical. Redirect HTTP and
   `www` to it while preserving paths. Restrict or redirect the host's production
   alias; leave private previews authenticated and non-indexable.
5. Run `npm ci`, then `npm run verify` with default preview settings. Inspect the
   screenshots. Build the approved production artifact with indexing enabled.
6. Set real optional analytics/verification values only if those accounts are
   ready. Use the same environment for `npm test -- tests/seo.spec.ts` against
   that build. No test identifiers should be used in a deployed artifact.
7. Record the Git commit, build settings and last known good artifact for rollback.

## Post-deployment acceptance

- Load every route from the domain on desktop and a phone; check photos, font,
  header, footer, focus indicators and all call links. Arrange a real test call
  with the owner; automated tests did not place a call.
- Verify HTTPS, canonical redirects, title/social tags, 138 sitemap URLs (23 pages in six languages, including all 13 city guides) and the legacy `/reviews/` redirect to `/#reviews`,
  robots sitemap declaration and `index, follow` on content pages.
- Request a nonexistent path: it must return HTTP 404 with the custom error
  page and noindex, not HTTP 200 or the homepage. Disable any SPA fallback.
- Check `_headers` response behavior on the selected host, including frame
  denial/no-sniff and hashed asset caching. Check that HTML revalidates and
  the browser console has no blocked resources. Astro preview cannot prove this.
- Verify Search Console ownership, submit `/sitemap.xml`, inspect representative
  URLs and run Google's Rich Results Test. Rankings/indexing are not guaranteed.
- If analytics is enabled, confirm real visits appear once in the correct
  account and the privacy page reflects that setting. Check deployed performance
  with PageSpeed Insights; local byte-budget checks are not Core Web Vitals.
- If launch fails, use the host's rollback to the recorded good artifact and
  configuration. Recheck routes and indexing; avoid improvising DNS changes.

## Local visibility follow-up

The Proddatur office address and support@incetekh.com were supplied by the founder on 30 September 2026 and are displayed. Verify mailbox delivery before launch. Service area, pincode, opening hours, legal identifiers, social profiles
and verified credentials remain unknown. Obtain them before creating/updating a
Google Business Profile, adding a map or publishing LocalBusiness details. Keep
name/phone consistent across the website and verified listings. No profiles were
created in this task.

## Official references

- [Astro build settings on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Custom domain requirements](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Static routes and 404 handling](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Search Console ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en)
- [Search/analytics implementation notes](VISIBILITY.md)
- [Separate business-email preparation](EMAIL.md)
