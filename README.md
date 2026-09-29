# Incetekh Energy

Complete local Phase 1 public website: home, about, services, project photographs,
homepage feedback, contact, privacy and a custom 404. Built with static
Astro, TypeScript and plain CSS. Read [AGENTS.md](AGENTS.md) and [SCOPE.md](SCOPE.md)
before changes. No public deployment, DNS changes or business-email setup has
been performed. [Delivery report](docs/DELIVERY.md).

## Run locally

Use Node **22.23.3** (`.nvmrc`; minimum 22.19) and npm.

```sh
npm ci
npm run dev
```

Open the address printed by Astro. No credentials or external APIs are required.
Optional public build settings are documented in [.env.example](.env.example).
Defaults are non-indexable previews with analytics disabled.

```sh
npm run lint       # Prettier formatting lint
npm run check      # Astro and strict TypeScript checks
npm run build      # Static output in dist/
npx playwright install chromium
npm test           # Starts its own production preview on port 4321
npm run verify     # Lint, types, build and browser tests
npm run preview    # Manual inspection of the current build
```

If the browser download is unavailable, use installed Chrome. In PowerShell:
`$env:PLAYWRIGHT_CHANNEL = 'chrome'`. Stop any manual preview before tests.
If port 4321 is occupied, set `$env:PLAYWRIGHT_PORT = '4323'`; the tests use an
isolated preview without stopping the existing development server.
Screenshots/traces go to ignored `test-results/`. The default full suite expects
preview settings; launch-mode checks use `tests/seo.spec.ts` with matching build
and test environment values. [Configuration details](docs/VISIBILITY.md).

## Structure and maintenance

- `src/pages/`: six content pages plus a legacy Reviews redirect, 404, sitemap and robots endpoints rendered at build time.
- `src/layouts/SiteLayout.astro`: semantic shell, metadata, schema and optional analytics.
- `src/components/`: navigation, footer, page introduction, call to action and review preview.
- `src/styles/global.css`: typography, color, spacing, layout and accessibility tokens.
- `src/data/site.ts`: confirmed identity/contact and selected project images.
- `src/data/review-samples.ts`: 10 temporary photo comments to replace before public deployment.
- `src/data/visibility.ts`: validated public build settings.
- `public/`: font license and compatible static-host response headers. Branding derivatives are generated from the supplied logo at build time.
- `tests/`: production-output, responsive, accessibility, contact, evidence and SEO checks.
- `docs/`: design, evidence, validation and owner handoff.

Use source images through Astro's pipeline. Never copy the original asset folders
into `public/`. Add future page paths to `sitemap.xml.ts` and its tests. Keep
business facts, warranty qualifiers and feedback status aligned across pages.

## Design and content

Warm paper, charcoal, restrained rust accents, large type and real installation
photographs. Self-hosted Manrope, no remote fonts, no client app runtime. The
navigation remains visible on narrow screens and FAQs use native HTML controls.
A small inline script controls the homepage gallery and review scrolling. The optional Cloudflare
analytics beacon is the only external script when enabled.

The founder confirmed the phone, more than 13 years of experience and 500+ completed projects, solar EPC,
free site visits, free system performance checks, free annual yield audits and a five-year
warranty subject to written proposal terms. No unverified mailbox, office, additional project
statistics or customer identities are published. Waaree, Adani Solar and Tata Power Solar are presented as manufacturer sales
channels through confirmed dealership relationships. Temporary feedback is founder-authorized design copy, not verified testimonials.
It must be replaced with verified feedback or removed before public deployment.
Photos accompany the temporary comments for prelaunch design; authorship is unverified.

## Handoff

Current gallery, hover and footer polish: [GALLERY-POLISH.md](docs/GALLERY-POLISH.md).
Earlier homepage/WhatsApp design: [HOMEPAGE-REFRESH.md](docs/HOMEPAGE-REFRESH.md).

- [Pre-deployment polish and research](docs/POLISH.md)
- [Design rules](docs/DESIGN.md)
- [Asset and claims register](docs/ASSETS.md)
- [Review replacement instructions](docs/TESTIMONIALS.md)
- [Validation and limits](docs/VALIDATION.md)
- [Search and analytics configuration](docs/VISIBILITY.md)
- [Deployment/domain checklist](docs/LAUNCH.md)
- [Separate business-email preparation](docs/EMAIL.md)

Publish only `dist/` after approval. Set launch indexing explicitly and verify the
host's headers/404 behavior. Public hosting, domain/HTTPS verification, analytics
activation and professional email remain external actions. No Phase 2 work is included.
