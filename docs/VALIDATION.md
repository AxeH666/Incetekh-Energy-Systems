# Final polish validation

## Restrained wide-screen spacing refinement — 30 September 2026

Two style changes: the shared content-width cap moves from 78rem to 92rem, and
the homepage project-story image adopts the existing corner radius. At 1920px,
the hero's side margins measure 224px instead of 336px; at 1440px, 64px instead
of 96px. Fluid mobile gutters, reading-column limits, typography, content,
section order and interaction logic are unchanged.

Before/after screenshots were inspected for the desktop hero and story, company,
services, products, projects and contact pages, plus detailed product/calculator
sections and English/Telugu/Malayalam mobile views. Evidence is retained locally
in `.astro/spacing-inspect/`. An early story capture preceded lazy-image decoding;
the final capture waits for the photograph to decode and confirms correct rendering.

Lint, Astro/TypeScript (78 files; zero diagnostics), the production build (144
pages), `git diff --check` and all **101 browser/output tests passed**. Tests ran
on Node 22.23.3 and Chrome in 2.3 minutes, reusing the persistent port-4322 preview
through the ignored Playwright config. The persistent preview remains running.
Pre-push self-review confirmed that the complete implementation is limited to
these two style declarations, with no content, assets, dependencies, runtime
logic or test expectations changed. No blocking self-review findings remain.
The PR records independent review and final merge disposition. No deployment
is included.

## Independent language review correction — PR #20

An independent agent reviewed pushed commit `e1c9087` against `00d0095` and
found one P2 responsive issue: localized navigation stopped wrapping at 1024px,
so Malayalam overflowed at 1025, 1100 and 1200px; Tamil also overflowed at 1025px.
The reviewer reproduced it on development and production previews. No other
blocking findings were reported in routing, value integrity, runtime messages,
privacy or scope. Additional independent checks covered 80 mobile route/width
combinations and the Hindi no-JavaScript calculator fallback.

The focused fix extends localized navigation wrapping through 80rem, while
retaining the existing WhatsApp compacting threshold. Regression coverage now
includes 1024/1025, 1100 and 1280/1281px in all six languages. The production
build, Astro/TypeScript check (78 files; zero diagnostics), formatting and all
**25 affected foundation/language checks passed** after the fix. The prior full
96-test run remains the broader regression evidence; the five new breakpoint
cases bring the suite to 101 cases. The pushed correction receives a final
independent re-review before merge, recorded on the PR.

## Language selector pre-push self-review — 30 September 2026

Reviewed the complete component diff for routing, translation boundaries,
placeholder preservation, WhatsApp recipients/drafts, accessible controls,
responsive behavior, privacy, dependencies and scope. No blocking findings
remain from self-review. Regional editorial approval remains a public-launch
requirement, as documented in LANGUAGES.md.

`npm run lint`, `npm run check` (78 files; zero diagnostics), `npm run build`
(144 static pages) and the complete **96-test browser/output suite passed**
on Node 22.23.3 with installed Chrome. The full suite took 2.1 minutes and used
the standard Playwright configuration with `PLAYWRIGHT_CHANNEL=chrome` and
`PLAYWRIGHT_PORT=4322`. An earlier attempt using the old preview override could
not connect because that server had stopped; verification was restarted with
a Playwright-managed preview. The existing development server was preserved.

The independent review follows the push and is recorded on the PR. No deployment
is included in this release workflow.

## Built-in languages — 30 September 2026

See [LANGUAGES.md](LANGUAGES.md) for implementation and copy-review limits.

- Final production build: **144 static pages**. Astro/TypeScript: **78 files,
  zero errors, warnings or hints**. Final validation used pinned Node 22.23.3
  and installed Chrome; the earlier prototype used the machine's Node 22.14.
- The 96-test full run passed 94 checks. The remaining checks concerned the
  newly split asset budget and an axe scan of navigation obscured by the open
  dropdown. The asset budget now separates shared assets (under 2.1 MB), local
  JS (under 10 KB) and individual HTML pages (under 400 KB). The open menu and
  unobscured page are audited separately, with no accessibility rules disabled.
  After those corrections and the error-route fix, **all 24 affected foundation,
  language and SEO tests passed**. All 96 suite cases have passing coverage
  across the full run and final focused rerun.
- All 115 translated public routes return content with localized language,
  metadata and navigation. City names, numerical placeholders and subsidy
  values are checked. Contextual WhatsApp drafts use the selected language
  and original recipient; no message was sent.
- Language switching preserves page and fragment; native links work without
  JavaScript. Keyboard opening, Escape/focus return, outside closing and
  reselecting the current language passed. Calculator results and form behavior
  passed in all five added languages, with no external requests or browser
  storage. The form remains unconnected.
- Six-language home/product/city layouts fit at 320, 390, 768 and 1440px.
  Axe checks pass for the open language menu and normal page at 390px.
  Desktop/mobile screenshots were inspected, including regional typography,
  calculator, form, city page and catalogue. Evidence: `.astro/visual-languages/`.
- An isolated indexing-enabled build verified **138 unique public sitemap
  URLs**, canonical URLs and reciprocal alternates, with six noindex error
  pages excluded from canonicals/alternates. The normal preview remains noindex
  with an empty sitemap. Local emitted JavaScript totals **7,307 bytes**.

Self-review corrected same-language menu closing, mobile heading wrapping,
navigation translations, numeric-placeholder mistakes and Astro's `/404/`
versus emitted `/404.html` mapping. Missing phrases or broken placeholders fail
the build. Full catalogues are not sent to visitors. `parse5` is a build-only
development dependency; there is no translation API or visitor-side service.

Regional copy is machine-translated with detected errors corrected, **not
native-speaker editorially approved**. That review remains a launch requirement.
No physical-device, Safari/Firefox or complete WCAG-conformance claim is made.
The existing preview on port 4322 was reused via the ignored Playwright override.
This is local implementation evidence, not deployment approval. The language
selector PR records the independent review and final merge disposition.

## Final pre-PR review — 30 September 2026

The complete spacing, separate brands/products sections, city guides and
contextual WhatsApp draft change passed `npm run lint`, `npm run check`
(70 files; zero diagnostics), `npm run build` and all **88 browser/output tests**
in 1.7 minutes. Tests used the existing production preview and the documented
ignored config override. Desktop/mobile visual checks include the final logo
sizes and Serving Andhra Pradesh footer.

Self-review covered the complete diff, static routing, explicit enquiry behavior,
encoded drafts, accessibility/responsive coverage, SEO, unchanged calculation
logic and business-claim boundaries. Corrected the directly affected launch
checklist's sitemap count to 23. No blocking findings remain from self-review.
Independent review is required before merge; no deployment is included.

## Founder correction: separate products and remove decorative boxes

30 September 2026: the homepage now places a dedicated Products we install
section immediately after the brand strip. Product catalogue links and all three
category destinations are checked. City links use balanced plain-text rows;
product listings, system-size options, city subsidy figures and calculator
results use open spacing and fine separators instead of decorative boxes.

Lint, Astro/TypeScript and the production build passed. All **38 affected browser
checks passed**, covering homepage order, category links, local destinations,
responsive pages, accessibility and calculator behavior. After balancing the
footer's city rows, **6 city/layout checks passed** at 320/390/768/1440px. Visually
reviewed the brands/products transition, footer, catalogue, city products and
calculator at desktop/mobile widths. Evidence: `.astro/visual-polish/minimal-*`.
Existing local production preview on port 4322 was reused; no deployment.

## Site spacing, buttons and 13 city guides — 30 September 2026

See [SPACING-CITIES.md](SPACING-CITIES.md) for scope, research and implementation.

- `npm run lint`: passed. `npm run check`: 0 errors, warnings or hints.
- `npm run build`: passed; 24 pages (including 13 new city pages and the error
  page), plus existing redirect and machine-readable routes. No dependencies or
  client scripts added.
- Complete browser/output suite: **86 passed** using installed Chrome. After
  the reading-column refinement, **33 affected checks passed**; after the final
  mobile-footer and privacy-action spacing fix, **10 affected checks passed**.
- New checks follow every footer city link, verify all 13 unique titles,
  descriptions and canonicals, check product fragments and internal actions,
  check explicit city-specific WhatsApp messages without opening/sending them,
  and exercise keyboard/no-JavaScript navigation.
- Layout checks cover every page type at 320, 390, 768 and 1440px, including long
  city and button labels. Existing suite also checks the homepage at 1920px,
  reduced motion, forced colors, text scaling, slideshow/swipes, review motion,
  calculator results, links, form privacy and accessibility. New city templates
  pass WCAG-tagged axe scans on all four widths.
- Visually reviewed desktop/mobile captures and detailed hero, calculator,
  capacity-card, form, footer and contact-link screenshots. Local QA evidence is
  in `.astro/visual-polish/`. Visual review does not establish full accessibility
  conformance or physical handset testing.
- Isolated indexing-enabled build in `.astro/launch-polish/`: verified 23 unique
  public sitemap URLs, all 13 city canonicals and indexing directives, no error
  route in the sitemap, a matching robots sitemap declaration, and no city-page
  module scripts. Normal `dist/` and the local preview retain `noindex`.
- `git diff --check`: passed. Self-review covered scope, preserved business
  claims, shared styles, static routing, links and output behavior.

The normal test command could not start a second Astro preview because an
existing preview owned the workspace lock. That preview was preserved and
verified to serve the new production output at `http://127.0.0.1:4322`. Tests used
an ignored `.astro/polish.playwright.config.ts` override with the same suite and
no server-start step. This is local verification, not deployment or independent
PR approval. No DNS, email, live indexing, analytics or external messaging action
was performed. The existing homepage form remains unconnected as documented.

## Final hero touch-ups

Validated on 2026-09-30 with Node 22.23.3 and installed Chrome. All **64 default
browser/output checks passed**. The production build and Astro/strict TypeScript
passed. New assertions verify matching action/statistic alignment, a 20-60px gap,
inset photographs and exactly three slides at 390/768/1440/1920px. Existing checks
cover motion, keyboard controls, reduced motion, swipe/pinch zoom, image layout
reservation, accessibility, links and review loop continuity.

Visually inspected the hero at those four widths and all three photo crops.
Pause/play SVG icons are removed; accessible text controls appear only on keyboard
focus. Image 4 is excluded from display while its source remains intact. Output
is 2,061,564 bytes. No deployment or account change was performed.

## Single-photo slideshow and quieter controls

Validated on 2026-09-30 with Node 22.23.3 and installed Chrome:

- All 59 default browser/output checks passed on the first run. A new real touch
  gesture regression was then added; all six focused gallery/polish checks passed,
  including a swipe followed by more than one autoplay interval without movement.
- Independent review caught that `touch-action: pan-y` blocked native pinch zoom.
  It now permits `pan-y pinch-zoom`. All six focused tests passed again, including
  an actual two-finger gesture that increases the browser visual viewport scale.
- Formatting lint, Astro/strict TypeScript and the production build passed. The same four photos
  now fade in a single fixed frame, with dot navigation and compact icon controls.
- Tests cover automatic advancement and wraparound, one accessible active photo,
  dot selection, keyboard navigation, touch pause, reduced motion, no-JS fallback,
  hidden scrollbars, absence of caption strips/visible pause text, review hover
  and the existing mobile/accessibility/link/image-reservation regressions.
- Visually inspected the hero and reviews at 390/768/1440px and each of the four
  displayed photos. Captures are in ignored `playwright-report/slideshow/`.
- No external dependency, new CSP permission, deployment or account change.
  Supporting images retain illustrative alt text and are not in the Projects
  archive. The public-launch review-content boundary remains unchanged.

## Gallery, hover and footer pass

Validated on 2026-09-30 with Node 22.23.3 and installed Chrome. The records below
this section describe earlier PRs.

- Formatting lint and Astro/strict TypeScript passed with zero errors, warnings
  or hints; the production build passed.
- The 58-check full run passed 56 checks and exposed a gallery-control overflow
  at 200% text size plus an output-budget overrun. The control now wraps and the
  three new image sets use quality 78 WebP. All 22 affected foundation, gallery
  and polish checks then passed; every default check has a passing result.
- All four launch-mode SEO checks passed with intercepted analytics. The default
  non-indexable, analytics-disabled build was restored afterward.
- Output is 2,433,143 bytes across all pages and image variants, below the
  documented 2.5 MB budget for the enlarged gallery. No external JavaScript
  bundle or dependency was added. The homepage has one CSP-hashed inline module.
- Browser coverage includes 320/390/768/1440/1920px, selected axe A/AA checks,
  keyboard and touch scrolling, no-JS operation, 200% text scaling, forced colors,
  reserved image space, ten accessible reviews, automatic advancement, loop
  continuity, Pause/Resume and dynamic reduced motion. Review seam comparisons
  at 390/1440/3840px still pass.
- New checks verify all four gallery photos and illustrative alt text,
  gallery wraparound and keyboard control, original and repeated review hover
  enlargement without vertical clipping, reduced-motion suppression, sitewide
  removal of diagonal arrows, linked-service hover/focus, and consistent 22px
  WhatsApp artwork with the confirmed click-to-chat destination.
- Visually inspected Home at 390/768/1440px, all five inner pages at 390/1440px,
  footer composition, numbered gallery image crops and hovered reviews at readable
  scale. Captures are local ignored artifacts in `playwright-report/gallery-polish/`.

The user-renamed 2/3/4 PNG files retain their exact original bytes. Generated or
unconfirmed supporting scenes are visibly illustrative and excluded from the
Projects archive. The temporary review content still needs verified permissioned
replacement or removal before public deployment. No deployment was performed.

## Continuous reviews, free services and WhatsApp

Current homepage refresh validated on 2026-09-29 with Node 22.23.3 and installed
Chrome through Playwright. The earlier records below are historical.

- All **51 default tests passed**; all **four
  launch-mode SEO checks passed**. Default non-indexable/analytics-disabled output
  was restored. Production build and formatting passed. Astro/strict TypeScript
  is clean.
- A final photo-only crop adjustment was rebuilt, visually checked and passed
  the focused photo test. Its first rerun was blocked by our manual preview's
  server lock; stopping that preview resolved the local test setup. Current
  default output is approximately 1.22 MB, within the 1.5 MB budget.
- Full-page desktop, tablet and mobile renders were inspected, with reviews and
  controls inspected separately at readable scale. Automated checks additionally
  cover 320/390/768/1440/1920px, no page overflow, selected axe rules, keyboard
  navigation, text scaling, image layout reservation and no-JS use.
- Motion tests confirm automatic advancement, continued movement on hover,
  crossing the seamless loop boundary, Pause/Resume, keyboard focus, touch pause,
  and dynamic reduced motion. There are ten accessible entries; the visual copy
  is inert and hidden from assistive technology.
- The first full run caught a reduced-motion change that stopped motion but did
  not remove the visual copy while the control retained focus. Media-query state
  now updates centrally from its change event. The focused 11-test review suite
  and final 51-test run passed after this fix.
- Inspected all ten largest downloadable photo crops for GPS/address overlays,
  clarity and repeated views. Landscape rendering now requests enough pixels for
  its square frame. A tighter installation-detail crop excludes a distant person.
  This PR does not edit or remove source photographs.
- Every WhatsApp link targets `https://wa.me/919441259786`; a navigation test
  intercepts the destination without sending a message. The local SVG matches
  the official downloaded white glyph byte-for-byte. Loading the site makes no
  WhatsApp requests. Real WhatsApp account reachability/handset handoff is not
  claimed by these local checks.

Independent review identified two motion issues: the internal gutter produced a
visible seam, and an unbounded ultra-wide viewport could exhaust the repeated
content before the cycle ended. The gutter now sits outside a bounded track.
All **14 focused review tests passed**, including byte-identical rendered seam
comparisons at 390/1440/3840px and enough-content checks for each width.
On 2026-09-30, all **18 foundation/polish checks** also passed after these fixes,
including responsive accessibility and image layout reservation. Formatting and
Astro/strict TypeScript were rerun clean.

No deployment was performed. The requested temporary reviews still need verified
replacement or removal before public launch. Separate source-file renames made
in the workspace during this task are excluded from the PR.

## Homepage photo-review follow-up

The founder's follow-up replaces the earlier text-only review strip with 12
photo/text entries and gentle automatic scrolling. Checked locally on 2026-09-29
using Node 22.23.3 and installed Chrome. The earlier PR #9 record below is historical.

- Default production build passed. All 49 browser/output tests passed across the
  full run and focused rerun: the initial run passed 48/49, then all nine review
  tests passed after fixing a test locator that depended on the changing button
  label. Earlier test assumptions were updated for the new inline script and motion.
- Formatting lint passed; Astro/strict TypeScript returned zero errors, warnings
  or hints.
- Four launch-mode SEO checks passed with analytics intercepted locally; the
  default non-indexable, analytics-disabled build was restored afterward.
- Reviewed section screenshots at 390/768/1440/1920px and the downloadable crops.
  Twelve 320/640px WebP photo pairs exclude GPS/address overlays; originals remain
  unchanged. One awkward source crop was replaced during visual review.
- Checks cover photo loading, keyboard scrolling at 320/390/768/1440/1920px,
  touch/manual use without JavaScript, hover/focus pause, Pause/Resume, reduced
  motion, image layout reservation, accessibility and unchanged navigation.
- Scrolling uses a small CSP-hashed inline script, with no new dependency, external
  script file or relaxed CSP. Static output is 1,156,149 bytes, within the existing
  1.5 MB budget.

Temporary positive copy is the requested prelaunch design content, not verified
testimonials. Text and photo authorship need verified replacement/permission or
removal before public deployment. No deployment or account settings were changed.

## Earlier PR #9 validation

Validated locally on 2026-09-29 with pinned Node 22.23.3 and installed Google
Chrome through Playwright (`PLAYWRIGHT_CHANNEL=chrome`, isolated port 4323).
No deployment, DNS, mailbox or analytics account was changed.

## Results

- Formatting lint passed; Astro/strict TypeScript: zero errors, warnings or hints.
- Production build passed: six content pages, custom 404, legacy Reviews redirect,
  sitemap and robots. Default remains non-indexable and analytics-disabled.
- All **48 default browser/output tests passed**.
- All **four launch-mode SEO tests passed** with locally intercepted analytics.
- Static output approximately **932 KB**, within the existing 1.5 MB budget.
  No client JavaScript bundle, dependency or CSP exception added.

## Browser and visual checks

Home: 320, 390, 768, 1440 and 1920px. All five other content pages: 320, 768 and
1440px. Full-page rendered screenshots were inspected for hierarchy, image crop,
header proportions, logo balance, spacing and mobile stacking. About's tablet
photo alignment was refined after visual inspection. Wide Home is bounded to
84rem so type and imagery remain composed on large screens.

Axe found no violations of the selected WCAG A/AA rules. Keyboard skip/focus,
contact navigation, call targets, service fragments, native FAQ controls,
reduced motion, forced colors, no-JavaScript use and 200% text scaling passed.
Every visible link resolves; no empty buttons/links or page-level horizontal
overflow at tested widths. Phone links were checked without placing calls.

New tests cover the 13-entry homepage feedback track, native arrow-key scrolling,
focus exit, mobile touch swipe, reduced-motion snapping disabled, no-JS use,
and the legacy `/reviews/` redirect into `/#reviews`. The feedback track alone
scrolls horizontally. Archive photographs remain separate from feedback text.

Image requests were held back and released at 390/768/1440/1920px: image boxes,
feedback position and footer position were unchanged before/after decoding.
This verifies reserved layout space, not field Core Web Vitals. Inspected the
actual downloadable logo crops and three largest archive derivatives; artwork
is intact and no GPS/address overlays remain. Original assets are unchanged.

Confirmed business facts, qualified warranty, conservative manufacturer wording,
public phone and schema boundaries are covered. No Review/AggregateRating schema.
Six launch sitemap URLs; old review route is noindex and excluded. Preview mode
keeps an empty sitemap. Launch analytics is intercepted in tests; no real beacon.

## Test-run corrections and limits

The first run collided with an unfinished rebuild, briefly producing 404s for
Home (two failures). Tests were rerun only after build completion; all passed.
A malformed arrow from Windows pipe encoding was caught in visual QA and replaced
with an HTML entity. A formatting warning after the final About adjustment was
corrected before final verification.

Only Chrome was tested; no physical handset, Safari or Firefox acceptance is
claimed. Automated accessibility checks do not prove complete WCAG conformance.
Astro static redirects use meta refresh locally; hosting status/redirect behavior,
headers, HTTPS, cache policy, hosted 404 and real analytics/search acceptance still
require an approved deployment and live verification.

## Review and deployment boundary

Self-review covers the complete diff, unchanged originals, minimal scope, content,
responsive behavior and tests. The pushed PR receives a separate code review;
its review record is the authority for findings and final-head disposition.

Temporary comments are explicitly requested design copy, not verified customer
feedback. Replace all 13 entries with verified permissioned statements, or remove
the feedback text before public deployment. Confirm photo publication permissions.
Hosting/domain/email remain separate tasks under [LAUNCH.md](LAUNCH.md).
