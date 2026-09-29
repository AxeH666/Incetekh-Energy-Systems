# Incetekh Energy

PR1 establishes the public website foundation. Read [AGENTS.md](AGENTS.md) and
[SCOPE.md](SCOPE.md) before making changes. This is a reviewable local shell,
not the completed website or a production deployment.

## Run locally

Use Node **22.23.3** (see `.nvmrc`; minimum 22.19) and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Astro. No environment variables, credentials,
external APIs, or server-side services are needed.

```sh
npm run lint       # Formatting lint for source, styles, tests and docs
npm run check      # Astro and strict TypeScript diagnostics
npm run build     # Static output in dist/
npx playwright install chromium
npm test          # Starts its own production preview server
npm run verify    # All four validation stages
npm run preview   # Manually inspect the production output
```

If the Playwright browser download is unavailable, use an installed Chrome with
`PLAYWRIGHT_CHANNEL=chrome`. In PowerShell set
`$env:PLAYWRIGHT_CHANNEL = 'chrome'` before `npm test`.
Browser reports and screenshots are written to ignored `test-results/`.
The tests use port 4321; stop your manual preview before running them.

## Structure

- `src/styles/global.css`: color, typography, spacing and layout tokens; shared
  button and accessibility styles.
- `src/layouts/SiteLayout.astro`: document metadata and shared semantic shell.
- `src/components/`: wordmark, header and footer only.
- `src/data/site.ts`: confirmed identity/contact data and the selected photograph.
- `src/pages/`: homepage design proof and a shared-layout 404 page.
- `public/`: directly served favicon and font redistribution license.
- `tests/`: focused checks against the production build.
- `docs/`: design decisions, asset evidence and PR1 boundaries.

## Design foundation

Static Astro pages, plain CSS and a self-hosted Manrope variable font. No React,
CSS framework, animation library, client-side JavaScript, or remote fonts.
The neutral palette, restrained rust accent, large typography and real rooftop
photograph set the direction. [Design notes](docs/DESIGN.md) explain extension.

Only existing destinations appear in navigation. On small screens the wordmark
serves as the home link and the contact link remains visible; no menu is needed
for this two-destination shell. The phone was confirmed by the founder. There is
no invented mailbox, contact form, project data or customer testimonial.

## PR1 boundaries

The build contains one short homepage introduction and photograph, not full
homepage sections. Services, company pages, project/testimonial experiences,
lead forms, analytics, Search Console, sitemap/robots configuration, structured
data, hosting/DNS and email setup belong to their later components.

All pages currently have `noindex, follow` metadata because this is an incomplete
foundation. Remove that restriction only during the approved launch-readiness
work (keep error pages non-indexable). Canonical and social URLs already use the
scope's intended domain, `https://incetekhenergy.com`; that does not connect or
deploy the domain. There is no deployment workflow or hosting dependency.

Raw supplied assets remain intact and are not served wholesale. See the
[asset register](docs/ASSETS.md) before selecting further imagery or claims.
Do not start PR2 until this PR is independently reviewed and merged.
