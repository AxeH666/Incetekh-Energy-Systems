# Design foundation

## Direction

An editorial, engineering-led composition: strong left alignment, large type,
quiet borders and a real installation photograph. Warm paper and charcoal form
the surfaces; rust is an accent for focus and interaction. No gradients, cards,
decorative motion or generated imagery are needed for the foundation.

The supplied Incetekh logo is displayed intact on white in the shared header and
footer. Optimized versions also identify the social preview, favicon, touch icon
and Organization schema. No recoloring, distortion or invented logo is used.

## Shared rules

- **Type:** self-hosted Manrope Latin variable font; system sans-serif fallback.
  Fluid display sizes use `clamp()`. Body copy stays at least 16px at default
  settings. Small uppercase labels are used sparingly. Headings can wrap under
  text enlargement rather than forcing horizontal scrolling.
- **Layout:** a maximum 84rem container and fluid page gutters. Spacing tokens
  use a small 8px-based scale with 12px for compact details. Composition changes
  follow content fit rather than specific device names.
- **Color:** text uses ink/muted on paper and paper/muted-light on ink. The
  brighter orange is decorative on paper and a focus/accent color on dark.
- **Links:** real destinations, native anchors, visible focus, and 44px minimum
  navigation/call target heights. A skip link moves focus to main. The header
  contact link opens the dedicated enquiry page; phone links open the dialler.
- **Motion:** button color transition and gentle homepage review scrolling;
  disabled for reduced motion. Scrolling pauses on interaction, with a visible
  Pause/Resume control. No carousel dependency.
- **Components:** extract only repeated structure. The layout owns the document;
  the page owns its composition. Add navigation entries only with working pages.

## Images

Use Astro's built-in image pipeline with explicit alt text, dimensions, widths
and sizes. The foundation uses one imported original, generates 480/800/1280px
WebP variants, and reserves the image's display space to avoid layout movement.
The source is not upscaled during image generation. CSS crops its display for
the wide desktop and narrower mobile composition; it does not retouch content.
The homepage photograph loads eagerly. Offscreen imagery is lazy-loaded. The supplied company logo supplies the square social preview. Company/projects also use
the second real rooftop image. Homepage archive photos use actual top-cropped
WebP derivatives to exclude GPS/address overlays; see TESTIMONIALS.md.

Keep originals outside `public/`. Import selected files explicitly; never publish
the full review-photo folder or infer project identities from file names.

## Documentation checked

- [Astro static rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro image handling](https://docs.astro.build/en/guides/images/)
- [Astro styling](https://docs.astro.build/en/guides/styling/)
- [WCAG reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

These informed static output, scoped page styles, responsive assets and checks
down to a 320px viewport. Automated accessibility checks supplement visual and
keyboard inspection; they do not establish full WCAG conformance.

## Pre-deployment refinement

See [POLISH.md](POLISH.md) for current reference research, page hierarchy and
review decisions. Feedback now lives on Home in a native horizontal scroll track;
projects remain documentary proof. Twelve supplied photos accompany temporary feedback; authorship remains unverified.
The old Reviews route redirects to the homepage section.
