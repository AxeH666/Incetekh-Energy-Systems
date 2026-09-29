# Pre-deployment polish

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
