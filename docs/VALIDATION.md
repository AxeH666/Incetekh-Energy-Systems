# PR1 validation

Validated locally on 2026-09-29 with Node 22.23.3 and installed Google Chrome
through Playwright. The managed Chromium download timed out; the documented
`PLAYWRIGHT_CHANNEL=chrome` fallback was used. Other browser engines and physical
devices were not tested.

- Formatting lint passed.
- Astro/strict TypeScript check: zero errors, warnings or hints.
- Static production build passed: homepage and shared 404 only.
- All 12 focused browser/output tests passed.
- Axe checks found no violations in the selected WCAG A/AA rules on the homepage
  at 320, 390, 768, 1440 and 1920px, and on the error page.
- Keyboard skip link, main focus, contact anchor, footer focus order and the
  confirmed `tel:` destination passed. No call was placed.
- No horizontal overflow at the tested widths or with 200% text sizing on mobile.
- No-JavaScript operation, reduced-motion styling and forced-colors controls passed.
- Local links, image loading, responsive variants, favicon, social image and
  canonical/preview metadata passed. No external browser requests or page errors.
- Browser-generated screenshots at all five widths were visually inspected:
  readable hierarchy, aligned header/footer, intact image crop, no clipped text.
- Dependency audit reported zero known vulnerabilities at installation time.

The image/font/CSS pipeline produces a small static bundle; the regression test
caps total output at 750kB and rejects client JavaScript and excluded source
photos. This is a size check, not a measured Core Web Vitals claim.

The final diff was reviewed for supported claims, dependency scope, source-asset
preservation, working destinations and accidental later-phase work. Original
assets, AGENTS.md and SCOPE.md are unchanged. No full homepage, service/project
experience, analytics, DNS, email, deployment or Phase 2 systems were added.

Automated checks and local inspection do not establish full accessibility
conformance or production/device acceptance. Independent PR review remains next.
