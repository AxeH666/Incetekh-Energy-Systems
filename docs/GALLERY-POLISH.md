# Gallery, hover and footer polish

The founder approved a four-photo floating homepage gallery, review enlargement
on hover, lifting linked headings, removal of diagonal arrows, refined WhatsApp
artwork placement and a more balanced footer across the whole website.

## Current slideshow and controls

The founder subsequently requested one photograph at a time, using the supplied
Adani Solar screenshot as the interaction reference. The sideways hero track,
caption strips, numbered labels, gallery eyebrow, visible pause text and native
scrollbar chrome have been removed.

- Four images occupy the same fixed frame. The active photo changes every five
  seconds with a 700ms fade. Four small dots select individual photos. The gallery
  has no repeated photo list, sideways animation or peek of an adjacent image.
- A compact pause/play icon replaces the gallery text control. Choosing a dot,
  focusing the photos/dots, using arrow keys or swiping pauses automatic playback
  until Resume is selected. Hidden tabs and offscreen photos stop their timer.
- Reduced motion disables autoplay and fading, keeping the dots and keyboard
  navigation. Without JavaScript the original four photos remain in a native
  scrollable, snapping single-photo frame with hidden scrollbar chrome.
- Reviews still move continuously at 45 CSS pixels/second and enlarge on hover.
  Their visible Pause/Resume text is replaced by an accessible icon button, and
  the scrollbar is hidden while touch, trackpad and keyboard scrolling remain.
  The visual duplicate remains hidden from assistive technology with no tab stops.
- All icon controls have accessible Pause/Resume names. Dots have descriptive
  labels, selected state and 44px targets. The homepage still emits one small
  CSP-hashed inline module with no framework or added dependency.
- Existing sitewide link/heading hover lift, arrow removal, WhatsApp proportions
  and the balanced footer remain part of this focused polish component.

## Supplied image provenance

These exact source-file renames were made by the founder; original bytes are
preserved in Git:

| Current path           | Previous basename                                             | Treatment                                             |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `project photos/2.png` | `ChatGPT Image Sep 29, 2026, 03_09_26 PM.png`                 | Generated supporting equipment scene                  |
| `project photos/3.png` | `hf_20260926_083457_6e725e64-f109-428c-8342-21a4e4babfb0.png` | Unconfirmed original/generated/enhanced rooftop scene |
| `project photos/4.png` | `ChatGPT Image Sep 29, 2026, 03_11_42 PM.png`                 | Generated supporting installation scene               |

The founder requested removal of visible caption strips. Each numbered photo
retains descriptive illustrative alt text, and the gallery description identifies
photographs and illustrative supporting imagery. None is attributed to a customer or treated as documentary
Incetekh project evidence. No generic supporting scene is labeled as an Incetekh project. The Projects page still contains only the two original documentary images.

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
