# Design foundation

## Direction

An editorial, engineering-led composition: strong left alignment, large type,
quiet borders and a real installation photograph. Warm paper and charcoal form
the surfaces; rust is an accent for focus and interaction. No gradients, cards,
decorative effects are needed for the foundation. The founder subsequently
requested floating photos and review hover lift; the numbered supporting scenes
are explicitly illustrative. See [GALLERY-POLISH.md](GALLERY-POLISH.md).

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
  Contact navigation opens the enquiry page; the primary button opens WhatsApp.
  Phone links remain available.
- **Motion:** subtle link/button lift, review hover enlargement and gentle homepage photo scrolling;
  disabled for reduced motion. Continuous looping stops on intentional interaction, with a visible
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

See [SPACING-CITIES.md](SPACING-CITIES.md) for the 30 September spacing/button
refinement and city-page design, research, implementation and content boundaries.

See [POLISH.md](POLISH.md) for current reference research, page hierarchy and
review decisions. Feedback now lives on Home in a native horizontal scroll track;
projects remain documentary proof. Ten supplied photos accompany temporary feedback; authorship remains unverified.
The old Reviews route redirects to the homepage section.

## Approved homepage order (30 September 2026)

The built-in language menu sits beside WhatsApp in the header. Its native-script
labels, understated green selection and keyboard focus retain the existing visual
language. Regional pages share these layouts, with more line height and smaller
mobile hero type for long words. See [LANGUAGES.md](LANGUAGES.md) for routing,
translation maintenance and editorial review status.

Hero and project slideshow; prominent centered Trusted brands section; separate Products we install section; project/EPC story (From planning to the rooftop); reviews; solar-size calculator; efficiency/capacity choices; free services and after-installation care; site-visit form; shared footer.

The brand section follows the founder's large-logo reference: centered heading,
Waaree left, Tata Power Solar's horizontal wordmark in the center, and Adani right.
The Tata wordmark is displayed with a responsive CSS crop from the supplied logo;
original assets are preserved. All three marks scale down together on mobile.

The brand row shows each existing logo once. Immediately below it, Products we install presents panels, inverters and water heaters as open columns with catalogue links. Brand relationships and proposal-dependent availability/warranty qualification remain visible. Product/system options use whitespace and fine rules; city links are plain text, with no outlined chips. The free-services heading reflects care after installation while retaining the free pre-installation visit. Calculator behavior, gallery/review motion and deferred form delivery are unchanged. Keyboard navigation proceeds from the review track into the calculator's Residential control.
