# Deployment handoff

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

1. Confirm hosting account ownership, registrar/DNS access and deployment approval.
2. Confirm use of the public phone number and permission to publish the selected
   project/customer photographs. Replace the three sample comments using the
   verified review sheet when available; otherwise retain every sample label.
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
- Verify HTTPS, canonical redirects, title/social tags, seven sitemap URLs,
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

Business address, service area, opening hours, legal identifiers, social profiles
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
