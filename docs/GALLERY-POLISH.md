# Gallery, hover and footer polish

The founder approved a four-photo floating homepage gallery, review enlargement
on hover, lifting linked headings, removal of diagonal arrows, refined WhatsApp
artwork placement and a more balanced footer across the whole website.

## Design and behavior

- The opening gallery moves continuously at 30 CSS pixels/second, with staggered
  frames and a glimpse of the next photograph. The real installation leads.
  A persistent Pause/Resume control, keyboard scrolling and touch/manual scrolling
  remain available. All four photos remain reachable without JavaScript.
- Gallery and reviews share one small homepage-only inline script. Review speed
  remains 45 CSS pixels/second. Hover does not stop the stream; each review lifts
  8px and enlarges 3.5%, with vertical space for the shadow. Touch, horizontal
  wheel and keyboard interaction pause until Resume is chosen.
- Repeated visual lists are hidden from assistive technology. They contain no
  links, controls or tab stops. They deliberately remain pointer-hoverable so
  repeated review cards lift just like originals. Reduced motion removes copies
  and automatic scrolling; hidden tabs and offscreen strips stop animating.
- Navigation, text links, service links and buttons lift gently on pointer hover
  and keyboard focus. Reduced motion suppresses these transforms. Touch screens
  keep the normal static presentation and visible focus outlines remain intact.
- Decorative diagonal arrows are removed throughout. WhatsApp uses the existing
  unmodified official glyph at 22px, aligned with the label in a minimum 48px
  control. The confirmed click-to-chat and phone destinations remain unchanged.
- The shared footer uses three balanced columns, clearer company identification,
  smaller telephone type, cleaner navigation and a compact lower copyright row.
  Tablet and mobile stack the same content without hiding navigation.

## Supplied image provenance

These exact source-file renames were made by the founder; original bytes are
preserved in Git:

| Current path           | Previous basename                                             | Treatment                                             |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `project photos/2.png` | `ChatGPT Image Sep 29, 2026, 03_09_26 PM.png`                 | Generated supporting equipment scene                  |
| `project photos/3.png` | `hf_20260926_083457_6e725e64-f109-428c-8342-21a4e4babfb0.png` | Unconfirmed original/generated/enhanced rooftop scene |
| `project photos/4.png` | `ChatGPT Image Sep 29, 2026, 03_11_42 PM.png`                 | Generated supporting installation scene               |

Each numbered photo has a visible "Illustrative image" caption and descriptive
illustrative alt text. None is attributed to a customer or treated as documentary
Incetekh project evidence. The original real hero photograph retains its archive
caption. The Projects page still contains only the two original documentary images.

Astro serves 480/800/1280px WebP derivatives. Original PNGs are not shipped.
The total static-output budget increases from 1.5 MB to 2.5 MB to accommodate
three additional high-resolution scenes and their responsive variants. This is
the complete output across all pages and image variants, not one page download.
No dependency, external asset request or CSP exception was added.

## Reference and boundary

Motion follows the existing [W3C pause guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
and [MDN reduced-motion guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
Earlier visual references and the official WhatsApp source are recorded in
[HOMEPAGE-REFRESH.md](HOMEPAGE-REFRESH.md).

No deployment or account changes are included. The ten temporary review comments
still require verified permissioned replacements or removal before public launch.
Validation results are recorded in [VALIDATION.md](VALIDATION.md).
