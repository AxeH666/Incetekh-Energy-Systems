# Local website delivery

The user's full-site request is one local delivery component. No stacked PRs,
deployment, account creation, paid calls, DNS changes, or email setup.

1. In progress: inspect evidence and establish a static Astro foundation.
2. Pending: implement all public pages and responsive enquiry experience.
3. Pending: add search, analytics readiness, production configuration, and handoff.
4. Pending: validate production output, browser UX, accessibility, and final diff.

## Decisions

- Static HTML, shared Astro layout, plain CSS, small progressive enhancements.
- Real supplied photos for installation evidence; no generated project proof.
- Approximate history and solar EPC are supported by the user's brief and SCOPE.md.
- Missing contact details and optional service claims have been requested.
- No customer database or form provider: a clearly labelled email composer plus
  direct phone/email gives a useful initial lead path without a backend.
- Do not publish credentials, reviews, precise project details, or partner logos
  without their underlying evidence.

## Verification

Formatting lint, Astro/TypeScript check, production build, Chromium and Firefox
browser tests, axe accessibility checks, keyboard/mobile navigation, contact
composer validation, internal link and asset checks, SEO and schema assertions.
Manual inspection of desktop and mobile screenshots plus a final source diff review.
