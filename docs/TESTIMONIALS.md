# Temporary testimonial content

The founder explicitly authorized short, positive temporary review copy and the
use of supplied customer/project photos while the verified Excel review sheet
is unavailable. This updates the earlier omission decision; it does not make
the sample copy verified evidence.

`src/data/review-samples.ts` is the single replacement source. `Testimonials.astro`
renders it on the dedicated `/reviews/` page. Home and navigation link to it. All three examples carry a visible
**Sample copy — not a verified review** label. The section explains that the
people pictured are not attributed authors. There are no names, star ratings,
review schema, dates, capacities, savings or technical outcomes.

## Image treatment

Source files in `review pictures/` are the images ending `1.41.24 PM.jpeg`,
`1.41.25 PM.jpeg`, and `1.41.31 PM.jpeg` (each 1200×1600). Only their top 1200×1200
area is rendered into 400px/800px square WebP derivatives using Astro's image
pipeline. The GPS/address overlay starts below that crop. Originals are unchanged
and are not copied into the public build. Inspect every derivative after changing
crop settings; CSS-only cropping would leave the original private overlay downloadable.

## Replacement when the spreadsheet arrives

1. Check each actual statement against the source row, attribution and permission.
2. Confirm whether a photograph belongs to that review and is approved for use.
   Do not infer this from a filename, GPS label or visual similarity.
3. Replace the sample data with the verified wording and permitted attribution.
4. Remove preview/sample labels only for entries that have completed those checks.
5. Update the tests and evidence register to reflect real verified records.

Until then, preserve the visible sample disclosures. These examples must never
be cited as real customer endorsements or included in review/rating structured data.
