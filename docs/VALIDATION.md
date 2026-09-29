# Local validation

Validated on 2026-09-29 using Node 22.23.3 and installed Google Chrome through
Playwright. Managed Chromium downloads timed out; the documented
`PLAYWRIGHT_CHANNEL=chrome` fallback was used. Safari/Firefox and physical
handsets have not been tested.

## Results

- Formatting lint passed.
- Astro/strict TypeScript: zero errors, warnings or hints.
- Production build passed: six public content pages, custom 404, sitemap and robots.
- All **36 default-mode browser/output tests passed**.
- All **four launch-mode SEO tests passed**, with a local substitute for the
  analytics script and no requests to the real analytics service.
- Invalid indexing, analytics-token and verification values each failed the
  build as intended. The default preview build was restored and checked again.
- Dependency audit at installation reported zero known vulnerabilities; this is
  a point-in-time result, not a guarantee about future advisories.

## Covered behavior

Home was checked at 320, 390, 768, 1440 and 1920px. Company, services, projects,
contact and privacy were checked at 320, 768 and 1440px. Axe scans found no
violations of the selected WCAG A/AA rules. Keyboard skip/main focus, contact
navigation, call targets, native FAQ controls, reduced motion, forced colors,
no-JavaScript use and mobile 200% text sizing passed. No tested horizontal overflow.

Local page links, stylesheets, image variants, favicon and social image resolve.
Images are scrolled into view and confirmed loaded before screenshots. Mobile
and desktop screenshots were visually inspected. Real photo derivatives were
checked for intact installation content and excluded GPS/address overlays.

Every content page has unique title/description, a canonical, one h1 and social
metadata. Tests verify sitemap/robots/indexing agreement, supported Organization
schema, no sample-review schema and a true noindex 404. Analytics is absent by
default, locally intercepted when tested enabled, and consistent with the privacy
page. No browser console/CSP errors occurred in the configuration tests.

## Performance and limits

The current default output is approximately **965 KB total** before transfer
compression, including all responsive image variants, social JPEG, font, HTML and
CSS. A 1.5 MB total-output regression budget passes. No bundled client JavaScript
is emitted; the optional external analytics script is disabled by default.
This is an artifact-size result, not a measured Core Web Vitals or speed claim.

Static `_headers` contents are tested, but Astro preview does not apply those
response rules. Actual HTTPS, redirects, caching, 404 hosting behavior, search
verification, analytics ingestion and real call completion require launch checks.
No phone call was placed. Automated checks do not prove full WCAG conformance.

## Review findings resolved

- Made selectors specific as additional headings and phone links were introduced.
- Ensured screenshots load lazy photos first rather than recording blank regions.
- Cropped GPS/address overlays in the actual image derivatives, not only CSS.
- Normalized Windows line endings in the static-header test.
- Added repository LF checkout rules after fresh-main lint exposed Windows
  automatic CRLF conversion; global Git settings and source assets are unchanged.
- Disabled unused Markdown syntax highlighting to resolve its CSP warning.
- Updated early-component documentation to describe the completed local website.

Each component was self-reviewed before push and separately reviewed after push
by the implementing agent, with review notes on its PR. No external reviewer or
hosted CI approval is implied. Originals, AGENTS.md and SCOPE.md were preserved.
