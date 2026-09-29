# Incetekh Energy

Complete local Phase 1 public website: home, company, services, project photographs,
labelled review previews, contact, privacy and a custom 404. Built with static
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
Screenshots/traces go to ignored `test-results/`. The default full suite expects
preview settings; launch-mode checks use `tests/seo.spec.ts` with matching build
and test environment values. [Configuration details](docs/VISIBILITY.md).

## Structure and maintenance

- `src/pages/`: six content pages, 404, sitemap and robots endpoints rendered at build time.
- `src/layouts/SiteLayout.astro`: semantic shell, metadata, schema and optional analytics.
- `src/components/`: navigation, footer, page introduction, call to action and review preview.
- `src/styles/global.css`: typography, color, spacing, layout and accessibility tokens.
- `src/data/site.ts`: confirmed identity/contact and selected project images.
- `src/data/review-samples.ts`: three clearly labelled temporary comments to replace.
- `src/data/visibility.ts`: validated public build settings.
- `public/`: favicon, font license and compatible static-host response headers.
- `tests/`: production-output, responsive, accessibility, contact, evidence and SEO checks.
- `docs/`: design, evidence, validation and owner handoff.

Use source images through Astro's pipeline. Never copy the original asset folders
into `public/`. Add future page paths to `sitemap.xml.ts` and its tests. Keep
business facts, warranty qualifiers and sample labels aligned across pages.

## Design and content

Warm paper, charcoal, restrained rust accents, large type and real installation
photographs. Self-hosted Manrope, no remote fonts, no client app runtime. The
navigation remains visible on narrow screens and FAQs use native HTML controls.
The optional Cloudflare analytics beacon is the only external script when enabled.

The founder confirmed the phone, approximately 15 years of history, solar EPC,
free site visits, system performance checks, annual yield audits and a five-year
warranty subject to written proposal terms. No unverified mailbox, office, project
statistics or customer identities are published. Sample testimonials remain
visibly unverified and are not attributed to people in the photos.

## Handoff

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
