# Website polish and city guides

30 September 2026. One component on `polish/site-spacing-city-pages`, based on
current `main` (`5f86b42`). Scope: visual polish across the public site and a
local information page for each of the 13 existing footer cities.

## Design approach and research

Retain Incetekh's typography, real assets, homepage sequence and restrained
paper/green palette. Use the supplied city-page screenshot for its information
sequence: local introduction, products, subsidy, system sizes, process and an
enquiry. Do not copy its branding or unverified local claims.

Sources consulted on 30 September 2026:

- [Nielsen Norman Group: visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/): use proximity and whitespace to group related content. Applied to heading/body spacing, section introductions and action groups.
- [Smashing Magazine: design implementation](https://www.smashingmagazine.com/2017/08/nine-principles-design-implementation/): use shared standards for recurring gutters and controls. Applied through CSS spacing, padding and radius tokens instead of page-by-page values.
- [W3C: target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): preserve adequate target size and separation. Buttons are at least 48px high; navigation and city links at least 44px. This is a design choice above the 24px minimum, not a claim of full WCAG conformance.
- [Official central subsidy rates](https://solar.delhi.gov.in/page/central-subsidy): rechecked the national household rates of ₹30,000, ₹60,000 and ₹78,000. City pages share the existing `centralSubsidy` calculation, exclude commercial connections and water heaters, and state eligibility/approval conditions. No state top-up is included.

## Changes

Founder correction: brands and products are separate homepage sections, with
Products we install immediately below the brand strip. Removed outlined city
chips and decorative boxes from product listings, capacity options and calculator
result cells. Use open layouts, text links and fine dividers. City destinations
and explicit enquiry behavior are preserved. This supersedes the initial boxed
treatments described in the first polish pass.

- Shared content width, responsive section spacing, heading gaps, card padding,
  button sizing and rounded corners. Stronger homepage primary action; consistent
  mobile navigation, footer location targets and focus styles.
- Refined hero/photo proportions, brand row, project story, reviews, calculator,
  capacity cards, free services and site-visit form spacing.
- Aligned company, service, product, project and contact page content; centered
  readable columns for guides, finance, privacy and terms. Shared error shell uses
  the same spacing and buttons.
- `src/data/cities.ts` owns the existing city list and URL helper. One static Astro
  template generates `/solar-in/<city>/` for all 13 cities. Footer city links open
  those pages, with current-page indication. No new client JavaScript or dependency.
- City pages contain product links, qualified subsidy figures, illustrative
  capacities, process steps, city-specific enquiry text and other city links.
  The hero's visit button stays on-page. Only the explicit WhatsApp enquiry opens
  WhatsApp; nothing is sent automatically.
- Unique titles, descriptions and canonical URLs; city routes join the existing
  sitemap only when the existing indexing flag is enabled.

## Content and scope boundaries

Founder follow-up: the footer now states "Serving Andhra Pradesh. Based in
Proddatur." Local site-visit availability still requires confirmation. Every
WhatsApp action includes a draft: shared header/footer buttons use the current
page or city, while product, capacity, booking and service-issue buttons retain
their specific enquiry. Drafts use WhatsApp's documented `wa.me` text parameter
and remain editable; the visitor chooses whether to send. No messaging automation
or form-data transfer was added. Reference: [WhatsApp Help Center](https://faq.whatsapp.com/425247423114725/).

The city list is an enquiry list, not evidence of an office or confirmed service
coverage. Pages identify Proddatur as the base and ask visitors to confirm
availability for their locality. No invented neighbourhood coverage, local
installation counts, timelines, tariff promises or guaranteed subsidy payments.
The 500+ projects and 13+ years are existing company-wide facts, not city totals.

Calculator assumptions and calculations are unchanged. The homepage request
form remains deliberately unconnected, with its existing honest status and
WhatsApp alternative. No booking delivery, backend, deployment, DNS, email or
analytics activation is included.

## Validation

WhatsApp follow-up: lint, Astro check (zero diagnostics), production build and
17 focused tests passed. Coverage includes every rendered page and all 13 cities
without JavaScript, action-specific drafts, product/capacity context, intercepted
click navigation and responsive layout checks. The new test initially expected
generic text on `/reviews/`; corrected it to reflect the existing homepage
redirect, then reran both new tests successfully. Footer screenshots reviewed at
1440px and 390px. No live WhatsApp message was sent or device-app behavior claimed.

Production output, all existing regression tests, new city routing/fragment checks,
responsive layout checks, keyboard/no-JavaScript city navigation and accessibility
scans are part of this component. Visual review covers desktop and mobile page
screenshots, including the new city template. Local screenshots are retained in
`.astro/visual-polish/` (ignored build/QA material).

The normal test command initially encountered an existing Astro preview lock.
The existing preview on port 4322 was preserved and confirmed to serve the newly
built production output. A temporary ignored Playwright config points the same
suite at that preview; it changes no committed test configuration.

Final results are recorded in `VALIDATION.md`. These checks establish local
behavior only; no external enquiry was sent and no live deployment is claimed.
