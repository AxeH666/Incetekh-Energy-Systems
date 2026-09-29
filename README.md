# Incetekh Energy

Phase 1 public website, delivered in sequential components. Read [AGENTS.md](AGENTS.md) and
[SCOPE.md](SCOPE.md) before making changes. The current component adds the phone-first contact page and enquiry guidance. External deployment is not authorized.

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
- `src/components/`: shared navigation, footer, page introduction, call to action and labelled review preview.
- `src/data/site.ts`: confirmed identity/contact data and the selected photograph.
- `src/pages/`: home, company, services, projects, contact and a shared-layout 404 page.
- `public/`: directly served favicon and font redistribution license.
- `tests/`: focused checks against the production build.
- `docs/`: design decisions, asset evidence and PR1 boundaries.

## Design foundation

Static Astro pages, plain CSS and a self-hosted Manrope variable font. No React,
CSS framework, animation library, client-side JavaScript, or remote fonts.
The neutral palette, restrained rust accent, large typography and real rooftop
photograph set the direction. [Design notes](docs/DESIGN.md) explain extension.

Only existing destinations appear in navigation. On small screens the navigation wraps below the brand and contact link; every destination stays visible without a menu script. The phone was confirmed by the founder. There is
no invented mailbox, contact form, project data or attributed customer endorsement.
The testimonial preview uses explicitly labelled sample copy pending verified
reviews; see [replacement instructions](docs/TESTIMONIALS.md).

## Delivery boundaries

The complete content and phone-first contact experience are implemented. Contact FAQs use native HTML disclosure controls and work without JavaScript. No form, email address, response-time promise or service area is invented. Technical SEO, optional analytics configuration and deployment/email preparation are the remaining components.

All pages currently have `noindex, follow` metadata because this is an incomplete
foundation. Remove that restriction only during the approved launch-readiness
work (keep error pages non-indexable). Canonical and social URLs already use the
scope's intended domain, `https://incetekhenergy.com`; that does not connect or
deploy the domain. There is no deployment workflow or hosting dependency.

Raw supplied assets remain intact and are not served wholesale. See the
[asset register](docs/ASSETS.md) before selecting further imagery or claims.
See docs/PLAN.md for the current sequence. Each PR must be reviewed and merged before the next component.
