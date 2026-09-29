# Local validation

Pre-deployment polish validated on 2026-09-29 with Node 22.23.3 and installed
Google Chrome through Playwright (`PLAYWRIGHT_CHANNEL=chrome`). Port 4323 was
used through `PLAYWRIGHT_PORT` because the existing user development server
occupied 4321; it was left running. Safari, Firefox and physical handsets have
not been tested.

## Results

- Formatting lint passed.
- Astro / strict TypeScript: zero errors, warnings or hints.
- Production build passed: seven content pages, custom 404, sitemap and robots.
- All **40 default-mode browser/output tests passed**.
- All **four launch-mode SEO tests passed**, including the new Reviews route and
  Organization logo. Analytics used a local substitute; no service was contacted.
- The default non-indexable, analytics-disabled build was restored afterward.
- No new dependencies, client runtime, backend or CSP exceptions were added.

## Covered behavior

Home was checked at 320, 390, 768, 1440 and 1920px. About, services, projects,
reviews, contact and privacy were checked at 320, 768 and 1440px. Axe scans found
no violations of the selected WCAG A/AA rules. Keyboard skip/main focus, contact
navigation, call targets, native FAQ controls, reduced motion, forced colors,
no-JavaScript use and mobile 200% text sizing passed. No tested horizontal overflow.

Every page, including the error shell, was audited for real links and branded
resources. Service fragment destinations exist and the System care jump was
exercised in the browser. All four supplied logos load, and manufacturer wording
is checked for the conservative sales-channel description. Public claims use the
latest confirmed experience/project count; no project capacity or location was
added. Sample reviews remain labelled, unattributed and excluded from schema.

Full-page desktop and mobile screenshots were visually inspected. The shared
shell, installation photos, manufacturer proportions, service layout, review
photos, contact controls and privacy page were checked. Screenshot tests wait
for lazy photos to load. Original photo/artwork files are unchanged; review
crops still remove GPS/address overlays from the downloadable derivatives.

Each content page has unique title/description, a canonical, one h1 and social
metadata. Tests verify sitemap/robots/indexing agreement, supported Organization
schema with a working logo, no sample-review schema and a true noindex 404.
Analytics is absent by default and locally intercepted when tested enabled.
No browser console/CSP errors occurred in the configuration checks.

## Performance and limits

Default static output is approximately **941 KB** before transfer compression,
including all responsive variants, branding derivatives, font, HTML and CSS.
The existing 1.5 MB total-output budget passes. No bundled client JavaScript is
emitted. This is an artifact-size result, not measured Core Web Vitals.

Static `_headers` contents are tested, but Astro preview does not apply those
response rules. HTTPS, redirects, caching, hosted 404 behavior, search verification,
analytics ingestion and actual call completion still require launch checks. No
phone call was placed. Automated checks do not prove full WCAG conformance.

## Review findings and fixes

- Replaced obsolete experience wording and provisional branding throughout the
  public shell and metadata; preserved source artwork and scope documents.
- Removed duplicate review grids and made Reviews a real navigation destination;
  added it to sitemap and SEO/accessibility coverage.
- Balanced differing manufacturer artwork proportions without distortion or
  color changes, and placed relationship wording alongside the marks.
- Replaced vague CTA labels, retained warranty terms and removed repetitive copy.
- Corrected text encoding during implementation before final build/visual QA.
- Made browser tests accept a separate port and removed hardcoded test origins,
  preserving the user's running development server.
- Updated stale handoff facts, page counts, logo provenance and review locations.

The implementing agent self-reviewed before push and separately reviewed the
pushed PR; this is not an external human review or hosted CI approval. See the PR
review record for the final pushed-head findings. Deployment was not performed.
