# Homepage feedback and replacement

Ten founder-authorized temporary entries live in `src/data/review-samples.ts` and
appear on Home. The user requested natural positive prelaunch copy without sample
labels. These are not verified endorsements or statements attributed to the people
photographed. `data-review-status="illustrative"` records this internally. No names,
ratings, locations, quantified outcomes or review schema are added.

Before public deployment, replace the copy with verified, permissioned statements
from the review spreadsheet or remove it. Check photo permission and attribution
separately. Noindex is not access control or authorization to publish draft reviews.

## Motion

The native horizontal region moves at 45 CSS pixels/second and repeats seamlessly.
One runtime visual copy is hidden from assistive technology and inert. There are
ten source entries, not twenty reviews. The loop does not stop at its boundary.
Normal hover and vertical page scrolling continue the movement. Pause/Resume,
keyboard focus, touch and horizontal wheel interaction give explicit control.
The script stops offscreen and in hidden tabs. Reduced motion disables automatic
movement and removes the copy. No-JS readers retain the native original list.

The tiny Astro script is CSP-hashed and adds no library or external requests.
See [HOMEPAGE-REFRESH.md](HOMEPAGE-REFRESH.md) for the design rationale and sources.

## Selected photographs

Six portrait scenes are mixed with four installation details. Repeated portrait
views and the former final pair were removed; selection does not establish the
identity or review authorship of any person. All sources are dated 2026-09-26.

| Entry | Folder          | Filename suffix       | Downloadable crop                    |
| ----- | --------------- | --------------------- | ------------------------------------ |
| 1     | review pictures | `1.41.32 PM (1).jpeg` | Top square                           |
| 2     | review pictures | `1.41.27 PM (1).jpeg` | Top 2:1                              |
| 3     | review pictures | `1.41.23 PM.jpeg`     | Top square                           |
| 4     | review pictures | `1.41.34 PM (2).jpeg` | Top 2:1                              |
| 5     | review pictures | `1.41.33 PM.jpeg`     | Top 2:1, excludes the distant person |
| 6     | project photos  | `1.41.35 PM.jpeg`     | Top square                           |
| 7     | review pictures | `1.41.24 PM.jpeg`     | Top square                           |
| 8     | review pictures | `1.41.28 PM (1).jpeg` | Top 2:1                              |
| 9     | review pictures | `1.41.29 PM (2).jpeg` | Top square                           |
| 10    | project photos  | `1.41.36 PM.jpeg`     | Top square                           |

Astro generates 320/640px WebP derivatives at quality 80. Landscape crops request
the larger rendition because the square CSS frame uses half their width. GPS and
address overlays must be absent from the downloadable files, not merely hidden
by CSS. Check these derivatives after any source/crop change. Originals remain
unchanged outside the published directory.

The old `/reviews/` route redirects to `/#reviews`, remains noindex and stays out
of the sitemap. Main navigation includes About, Services, Projects and Contact.
