# Homepage, continuous reviews and WhatsApp

The founder requested automatic floating reviews, clearer photographs without
repeated people, WhatsApp links/logo, and a stronger homepage with the free
services visible before the detailed Services page. In this session the founder
explicitly confirmed **all three are free**: site visits, system performance
checks and annual yield audits.

## Design and implementation

- A dark split hero brings the real installation photograph alongside the main
  statement and WhatsApp action. A concise proof row retains the two confirmed
  history/project figures.
- Three open columns give each free service equal prominence directly below the
  opening section. Each links to its detail on Services. No additional free
  offerings or warranty terms were invented.
- A shorter image/text section explains EPC and the qualified five-year warranty.
  Existing manufacturer relationships and artwork remain intact.
- Ten selected photographs mix six portrait scenes with four installation views.
  Alternate portraits of the same scenes and the former final pair are removed.
  Photos are presented at a smaller, deliberate size. Landscape crops request
  sufficient resolution for the square display rather than stretching a small
  thumbnail. Originals remain unchanged; downloadable derivatives exclude GPS
  overlays. The temporary copy has no verified author/photo association.
- Reviews move at 45 CSS pixels/second and loop continuously. A visual duplicate
  joins the boundary, marked `aria-hidden` and `inert`; assistive technology reads
  ten entries once. Normal hover and vertical page scrolling do not halt movement.
  Pause/Resume, touch, horizontal wheel and keyboard control remain available.
  Reduced motion removes the duplicate and disables automatic movement. No-JS
  visitors get the native scrollable original list. Offscreen/hidden-tab motion
  stops. No dependency or CSP exception was added.
- Header, hero, shared CTA, footer and Contact offer the same ordinary link to
  `https://wa.me/919441259786`. Contact remains in navigation and calls remain an
  alternative. Links do not send messages automatically. No WhatsApp API, embedded
  widget, automation or tracking was added. Account reachability needs owner
  confirmation; tests intercept navigation without contacting the business.

## Current reference research

Research and rendered reference inspection on 2026-09-29 informed composition,
not copied branding, layouts or business claims:

- [GE Vernova](https://www.gevernova.com/): compact navigation, a strong dark opening
  and an action with clear visual priority.
- [Siemens Energy](https://www.siemens-energy.com/global/en/home.html): prominent
  statement, restrained hierarchy and distinct large sections. Some remote media
  did not load in the browser capture.
- [Tesla Energy](https://www.tesla.com/energy): text was available to research;
  browser access was denied, so no successful visual inspection is claimed.
- [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide):
  continuous movement needs a persistent pause mechanism. The visible toggle
  supplies this without requiring the visitor to keep hovering the strip.
- [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934/?locale=en_US)
  and [official brand resources](https://www.meta.com/brand/resources/whatsapp/whatsapp-brand/).
  `public/brand/whatsapp.svg` is the unmodified white digital glyph from the
  official downloaded `WhatsApp-Brand-Resource-Center.zip`, path
  `01_Glyph/01_Digital RGB/03_SVG/Digital_Glyph_White_RGB_2026.svg`.

## Boundary

This is a focused website PR from current main. It does not deploy, enable
analytics, change DNS, set up email or start later-scope work. Temporary reviews
still need verified, permissioned replacements or removal before public launch.
See [TESTIMONIALS.md](TESTIMONIALS.md) and [VALIDATION.md](VALIDATION.md).
