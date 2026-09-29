# Homepage feedback and replacement

The final polish brief explicitly requests ten additional temporary comments and
natural presentation without visible sample labels. That instruction supersedes
the earlier labelled preview. The follow-up request pairs 12 supplied photos with 12 founder-authorized illustrative
entries in `src/data/review-samples.ts`, rendered once on Home by
`Testimonials.astro`. They are not source testimonials or verified endorsements.
The section retains `data-review-status="illustrative"` for maintenance/tests.
There are no names, stars, dates, locations, quantified outcomes or review schema.

## Before public deployment

Replace the temporary entries with permissioned, verified spreadsheet statements,
or remove the feedback text from the public build. Unlabelled invented comments
must not be launched as actual customer endorsements. No deployment is authorized
by this PR. Noindex is not a substitute for private preview access control.

Check the source row, exact wording, permitted attribution and photo permission.
Do not infer authorship from filenames, visual similarity or GPS labels. Update
the data, status marker, regression expectations and evidence register together.

## Interaction and photographs

The homepage now presents 12 photo/text entries in one horizontally scrolling
strip. Copy is short, positive and temporary; the pictured people are not verified
authors. Pairing is for the requested prelaunch design only, not source attribution.
No customer names, stars, locations, capacities or performance outcomes are added.

A small Astro-processed, CSP-hashed inline script gently advances the native
scroll region at 25 CSS pixels/second only while visible. Hover and keyboard focus
pause it; touch, wheel and keyboard interactions keep it paused until Resume is
chosen. The visible Pause/Resume control is hidden without JS and with reduced
motion. Reduced-motion users retain manual scrolling. The track stops at the end;
Resume restarts it. No clones, library, autoplay timer or live-region announcements.

Photos are imported directly from `review pictures/`, preserving originals. The
single data file lists all 12 sources and alt text. Portraits use top-square crops;
the two landscape originals use top 2:1 crops, excluding overlays. Astro generates
320/640px WebP derivatives at quality 75. CSS frames them consistently without
stretching; privacy is enforced in downloadable derivatives, not merely CSS.
Inspect all derivatives after changing crop settings. Some photos show different
views of the same installation; no count of distinct customers is implied.

Photo source suffixes in display order (all dated 2026-09-26):

1. `1.41.24 PM.jpeg`
2. `1.41.25 PM.jpeg`
3. `1.41.31 PM.jpeg`
4. `1.41.26 PM (1).jpeg`
5. `1.41.29 PM (2).jpeg`
6. `1.41.32 PM (1).jpeg`
7. `1.41.32 PM (2).jpeg`
8. `1.41.28 PM.jpeg`
9. `1.41.24 PM (1).jpeg`
10. `1.41.33 PM.jpeg`
11. `1.41.26 PM.jpeg` (landscape)
12. `1.41.33 PM (1).jpeg` (landscape)

Animation timing uses elapsed timestamps, following
[MDN requestAnimationFrame guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

`/reviews/` is a static Astro redirect to `/#reviews`, with a fallback link and
noindex. No main/footer Reviews destination or sitemap entry remains. Verify the
chosen host's behavior at launch; local static preview uses a meta refresh.
