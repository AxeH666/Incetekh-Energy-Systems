# PR1: website foundation

Boundary: component 1 in SCOPE.md, on the existing `feat/pr1-foundation` branch.
The later user request supersedes the earlier complete-website task. Do not modify
main, deploy, configure external services, or start PR2.

1. Complete: trim the starter setup and implement shared design foundations.
2. Complete: add metadata and focused browser/accessibility coverage.
3. Complete: local validation and self-review. See VALIDATION.md for results.

Delivery handoff: commit the verified work, push this branch, open a PR against
main, then stop. Independent review and merge are required before PR2.

## Approach

- Astro static output; plain CSS; self-hosted Manrope; no browser framework.
- Warm off-white, charcoal, rust accent, strong type, generous spacing.
- Shared header, footer, wordmark, and document layout. Navigation only points
  to existing destinations. A single real photo and short introduction prove
  the homepage direction without implementing the complete homepage.
- Preserve supplied originals. Import only selected evidence into Astro's image
  pipeline; don't copy the entire source asset collection into public output.
- Use only confirmed name, solar EPC, approximate operating history, and phone.
- No service pages, project gallery, testimonials, forms, analytics, sitemap,
  business email, deployment integration, or Phase 2 features.

## Validation

Formatting lint, Astro/TypeScript checks, production build, browser checks at
320–1920px, keyboard navigation, automated axe checks, no-JavaScript operation,
metadata and link/asset checks. Inspect screenshots and the full diff against
main before committing and pushing. Production deployment remains unapproved.
