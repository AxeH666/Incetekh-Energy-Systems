# Final pre-deployment polish

This focused component starts from fresh main `9ba5466` after PR #8. It preserves
the static Astro architecture, supplied artwork, real project proof and confirmed
business claims. No deployment, DNS, email, analytics activation or later scope.

## Audit and design plan

Before editing, rendered Home at 390, 768 and 1440px and inspected the shared
components and inner pages. Findings: 112px square header logo; overly dominant
manufacturer headline; 480px-plus stacked logo band on mobile; mismatched logo
internal whitespace; cramped tablet service columns; oversized inner-page titles;
and a review teaser pointing away from the homepage.

Briefly rechecked [GE Vernova](https://www.gevernova.com/) and
[Siemens Energy](https://www.siemens-energy.com/global/en/home.html) in Chrome.
Compact brand placement, restrained navigation, differentiated headline scales
and coherent image/text groupings informed the refinement. Both sites' hero media
was incomplete in capture; no claim of a full external visual audit. Their pages
emphasize editorial stories rather than providing a review-carousel pattern to copy.
Reviewed [native overflow accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow)
and [Astro redirects](https://docs.astro.build/en/guides/routing/#redirects) for
focusable scrolling and static-route compatibility.

Plan: audit (complete), refine shared scale and Home composition, validate actual
rendered pages and interactions, then self-review, push one PR, independently
review its pushed diff, address findings, merge and sync main. No deployment.

## Final composition

- Header: 88px desktop height; 88 by 70px logo (80px wide on small screens).
  A centered build-time crop removes only outer white space, retaining the
  complete supplied artwork and its proportions. Navigation aligns vertically
  with the Contact Us action; tablets keep a single row.
- Type: 76px maximum homepage heading, 72px inner-page heading, 48px section
  heading, smaller 40px manufacturer heading. Fluid mobile sizes, bounded copy
  width and an 84rem content limit reduce visual competition on wide screens.
- Rhythm: stronger left alignment in services, roomy stacked tablet service
  content, shorter manufacturer section, no repeated intervening CTA banners.
- Imagery: real rooftop hero remains dominant; secondary installation images
  use 4:3 crops. Source material and evidence are unchanged.
- Manufacturers: compact three-logo row at all widths; Adani/Tata whitespace
  cropped at build time and widths tuned optically, without stretched artwork.
  Existing qualified sales-channel and warranty wording remains adjacent.
- Feedback: 13 centralized temporary entries (ten additional), native horizontal
  scroll with a visible continuation and focus outline, no autoplay or runtime.
  Archive photos are separate from comments. See [TESTIMONIALS.md](TESTIMONIALS.md)
  for the required verified-content replacement before deployment.
- Navigation: About, Services, Projects and Contact Us; footer mirrors the useful
  destinations. Reviews teaser/destination removed; old route redirects to Home.
  Sitemap has six content URLs when indexing is enabled.

See [VALIDATION.md](VALIDATION.md) for checks and limitations. Historical PR #8
notes follow for context; the final decisions above supersede conflicting details.

---

# Earlier pre-deployment polish (PR #8)

One focused refinement from fresh `main` at `29a6daf`, after PR #7. No deployment,
DNS, mailbox, purchase, analytics activation or later-phase system is included.
The founder's latest confirmed wording supersedes the older approximate history
in SCOPE.md: **More than 13 years of experience** and **500+ projects completed**.

## Research before implementation

Inspected the existing source, rendered homepage, all page templates, tests and
all 43 supplied images. The current editorial direction was worth retaining.
Reviewed these current official sites on 2026-09-29. Observations are design
references, not evidence about Incetekh or permission to borrow their claims.

| Reference                                                            | Useful pattern applied                                                                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Tata Power Solar](https://www.tatapowersolar.com/)                  | Distinct project, rooftop and company destinations; installation photography leads to further detail. Keep Projects separate from Reviews and give Services clear subsections.           |
| [Fourth Partner Energy](https://fourthpartner.co/)                   | Separates onsite solar, portfolio, case studies and testimonials. Use a short homepage overview with dedicated destinations instead of duplicating full sections.                        |
| [CleanMax](https://www.cleanmax.com/)                                | Business offering, operating proof, customer evidence and contact form a readable sequence. Use only Incetekh's two confirmed scale/history facts.                                       |
| [Larsen & Toubro](https://www.larsentoubro.com/)                     | Plain business categories and a substantial company/contact footer. Add useful footer navigation instead of decorative links.                                                            |
| [Adani](https://www.adani.com/)                                      | Organizes a broad business by named sectors with imagery at different scales. Separate service detail, project evidence and manufacturer relationships.                                  |
| [Siemens Energy](https://www.siemens-energy.com/global/en/home.html) | Distinguishes products, services and company information, with large editorial headings. Give the manufacturer relationship its own explanation and retain readable service definitions. |
| [GE Vernova](https://www.gevernova.com/)                             | Strong industrial imagery, restrained navigation, clear section changes and a useful footer. Retain real photographs and vary light/dark surfaces without adding motion.                 |
| [SpaceX](https://www.spacex.com/)                                    | Specific navigation and sparse, large-scale composition. Keep one dominant installation photograph and deliberate typography; do not reproduce its video-heavy experience.               |
| [Tesla Energy](https://www.tesla.com/energy)                         | Distinct product sections and action-specific quote/adviser paths. Make the free-site-visit call the primary action and use explicit destination labels.                                 |

Browser inspection covered desktop and narrow layouts where accessible. Tata's
site worked in Chrome despite the text fetch being blocked. Fourth Partner's
browser access was blocked, so its official extracted page was the reference.
Tesla denied browser access; only its accessible official Energy page text was
used. SpaceX's text/navigation loaded while background video was incomplete.
No claim of complete visual QA of those external sites is made.

Technical references checked: [Astro images](https://docs.astro.build/en/guides/images/),
[Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp),
[Google Organization logo guidance](https://developers.google.com/search/docs/appearance/structured-data/organization),
and [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
The existing static architecture and CSP need no relaxation. Local image
derivatives retain intrinsic dimensions; Organization markup gains only the
supplied company logo, not manufacturer affiliation or review claims.

## Information architecture and art direction

- Header: logo links home; About, Services, Projects, Reviews and Contact Us are
  direct destinations. Mobile keeps the four primary text links visible below
  the logo/contact row; no menu script or hidden navigation is necessary.
- Home: solar EPC identity and experience, real rooftop photo with project count,
  brief company introduction, services alongside a second real photo,
  manufacturer sales channels, compact Reviews link, and a free-site-visit CTA.
- About: operating experience, word-of-mouth history and confirmed project count.
- Services: EPC, free visits, performance checks/yield audits and qualified
  warranty, with working in-page navigation. Removed repetitive disclaimers
  while preserving proposal-specific scope and warranty qualifications.
- Projects: two supplied real installation photographs with descriptive captions.
  No invented case studies, capacities, dates, locations or client attribution.
- Reviews: existing three labelled samples and privacy-preserving photo crops
  now have one dedicated page. No duplicate review grid on Home or Projects.
- Contact: phone-first guidance and native FAQs. No unconnected form or email.
- Footer: intact logo, service identity, page navigation, public phone and privacy.

The Incetekh artwork stays intact on white, with the original proportions and
colors. Astro generates a 224px WebP for the shell, a 600px square social JPEG,
64px favicon and 180px touch icon. The same social image supplies the Organization
logo. No image-generation service, artwork redraw or new image library was used.

Waaree, Adani Solar and Tata Power Solar appear at visually balanced sizes in a
dedicated white section. Exact relationship wording: **Incetekh sells relevant
products from Waaree, Adani Solar and Tata Power Solar through dealership and
sales-channel relationships.** Availability, suitability and proposal terms are
explained adjacent to the logos. No exclusivity, ownership, endorsement, tier,
territory or strategic partnership is implied.

## Validation and review

See [VALIDATION.md](VALIDATION.md) for checks and limits. Focused coverage adds
confirmed wording, manufacturer boundaries, real logo resources, service anchor
navigation and all-page action auditing. Existing responsive, accessibility,
privacy, SEO and static-output checks remain in place.

Self-review before push and a separate review of the pushed PR are required.
Review is by the implementing agent, not an external human approval. Preserve
originals and stop after merge and clean-main synchronization. Deployment remains
a separately authorized action under [LAUNCH.md](LAUNCH.md).
