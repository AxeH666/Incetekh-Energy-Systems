# Solar planning and equipment selection

This component adds a homepage estimator and capacity choices, plus a Products page. It preserves the photo slideshow, reviews, free services and existing visual direction. No deployment, remote calculator service, lead database, WhatsApp automation or dependency was added.

## Scope and user confirmation

On 30 September 2026 the founder requested the example's panel/inverter brands and Andhra Pradesh water-heater companies. The planner is explicitly an Andhra Pradesh estimate, not an all-India tariff engine or a claim of nationwide service coverage. Product listings are enquiry options. Manufacturer authorisation, stock, pricing, specific warranty terms and vendor registration are not inferred.

The homepage groups a single monthly-bill slider and four capacity choices into one planning section. A separate free-site-visit form is on the homepage; the founder explicitly deferred email/WhatsApp delivery connection. The existing manufacturer section links to the complete catalogue, and Products appears in the shared header/footer. The added catalogue uses restrained typography and written product descriptions without invented branded imagery.

## Calculation contract

- The customer-facing control is one monthly-bill slider: INR 200 to INR 50,000 in INR 100 steps, starting at INR 2,500. A Residential/Commercial radio switch updates household subsidy eligibility. There is no units-mode selector, editable tariff field or Calculate button. Monthly kWh are estimated as bill / INR 8; the assumption is disclosed beside the slider. Fixed charges, credits and tariff slabs are not modelled.
- Capacity = ceiling(monthly kWh / (4 kWh per kW per day × 30 days)), minimum 1 kW. Whole-kW rounding is a planning choice, not a restriction on actual module capacity.
- Monthly generation = capacity × 120 kWh. Roof allowance = capacity × 10 m²; square feet use 10.7639 ft²/m². Neither output is site-specific or guaranteed.
- The slider always stays within the calculation engine limits. The engine retains its bounded, unit-tested calculation contract; commercial results replace the subsidy tile with conditional 40% written-down-value depreciation, explicitly not a cash subsidy.
- Standard central assistance = ₹30,000 × min(kW, 2) + ₹18,000 × min(max(kW − 2, 0), 1), capped at ₹78,000. This is for a new eligible individual residential rooftop PV system in Andhra Pradesh; no state top-ups, special-category uplifts, expansion claims, RWA calculation or water-heater subsidy are modelled.
- Financial illustrations now use an assumed INR 70,000/kW installed budget (Indian Bank residential lending illustration, not a quote), INR 8/unit, 90% of estimated consumption offset, capped by generation. Simple payback = (budget minus eligible subsidy) / first-year annual savings. Gross 25-year savings sum min(90% consumption, generation declining 0.5% yearly) times INR 8 times 12. No tariff escalation, maintenance, finance, replacement cost or tax saving is included. These modelling choices are disclosed, not forecasts. Appliance profiles have an explicit limited-hours example; no simultaneous operation or backup promise.
- Calculation occurs locally without persistence or network submission. The calculator and hero booking links target the homepage visit form. Existing expert/product links still open WhatsApp. Without JavaScript, the slider and connection switch remain disabled and a labelled 3 kW example remains visible.

## Site-visit form and deferred delivery

`src/components/SiteVisitForm.astro` contains full name, Indian mobile number (+91 optional), optional email, pincode/location and a required plan selector, including water heating and help choosing. Native validation runs before the submit handler. Submitting valid fields explicitly says the request has **not** been sent. No fields are serialized, logged, transmitted or persisted; the page also states that online requests are not available. Without JavaScript the submit button remains disabled. CSP `form-action 'none'` is preserved.

The founder will connect email or WhatsApp later. That later component should replace the local submit handler with the chosen delivery flow, validate destination/security/consent, test actual delivery, update the privacy and availability copy, and adjust CSP only if necessary. No recipient, mailbox, API, credentials or storage was guessed. The independent existing WhatsApp expert link is usable today and does not include form contents.

## Sources checked 30 September 2026

The subsidy is still described as operating by the government sources below. This is a dated editorial check, not a live eligibility or disbursement API. Recheck before launch and when scheme rules change.

- [PIB energy factsheet, 13 August 2026](https://www.pib.gov.in/FactsheetDetails.aspx?id=150868&lang=2&reg=48): ongoing PM Surya Ghar installations and subsidy disbursements.
- [MNRE / PIB, 24 March 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244670&lang=2&reg=3): residential programme, National Portal application and FY 2026–27 objective.
- [Official central subsidy rates](https://solar.delhi.gov.in/page/central-subsidy): ₹30,000/kW first 2 kW, ₹18,000 next kW, ₹78,000 cap. Only central figures used; Delhi local incentives are not applied to Andhra Pradesh.
- [MNRE operational guidelines hosted by Meghalaya's electricity corporation](https://www.meecl.nic.in/wp-content/uploads/2024/08/Annexure-C-Operational-Guidelines-for-the-Implementation-of-PM-Surya-Ghar-Muft-Bijli-Yojana.pdf): standard and special-category schedules, partial-kW examples. The AP-only calculator uses standard rates.
- [MNRE domestic-content clarification](https://cdnbbsr.s3waas.gov.in/s3716e1b8c6cd17b771da77391355749f3/uploads/2024/12/20241202808263895.pdf): domestic-content requirements apply under PM Surya Ghar.
- [NDMC rooftop FAQ](https://online.ndmc.gov.in/solar/FAQs.aspx): indicative 4–5 units/kW/day and 10 m²/kW. We choose 4 as a disclosed planning assumption; square-foot conversion is calculated independently. Delhi-specific net-metering rules are not copied.
- [National Portal](https://pmsuryaghar.gov.in/): user application destination. Direct tool retrieval was unavailable; current status/rates were verified through the government sources above, not through a claimed live portal transaction.

Exact product source URLs live next to each entry in `src/data/products.ts` and are exposed on the Products page. These are manufacturer/supplier sources, not evidence of an Incetekh dealership:

- Waaree official shop: PV module families. Its 2023–24 annual report lists water heaters within solar solutions, but a current heater model range was not verified; the UI explicitly asks customers to confirm it.
- Tata Power renewables and Adani Solar downloads: panel portfolios. No blanket wattage or warranty claims.
- Deye official inverter site, Polycab solar brochures, Enphase India IQ8 launch, Solis India technical brochure, SolarEdge India: inverter categories, with model compatibility qualified.
- NIKSOL water-heaters page: Vijayawada supplier, 100/200 LPD ETC offerings. Its savings/monsoon/temperature claims are not repeated.
- Solariq water-heaters page: Visakhapatnam supplier offering solar water heating. No invented partnership or manufacturer status.

## Validation and release boundary

Focused model tests cover subsidy tiers and calculation boundaries. Browser checks cover keyboard/pointer slider interaction, live results, residential/commercial subsidy, booking anchors, required/invalid form fields, explicit unsent state, no network submission or storage, no-JavaScript behavior, product links and responsive accessibility. Existing gallery, review, navigation, metadata, CSP and static-output checks remain in the suite.

Slider/form follow-up verified on 30 September 2026: lint, Astro/TypeScript (zero diagnostics), production build and all 75 Playwright checks passed. Desktop, tablet and mobile screenshots were inspected at 1440, 768 and 390 px. No deployment or delivery connection was performed.

No publication is authorised by this component. Existing pre-launch testimonial replacement/permission requirements in `TESTIMONIALS.md` remain in force. Final product availability, subsidy eligibility and written equipment terms must be confirmed per project.

## Results and resource follow-up

Founder confirmed support@incetekh.com and the full Proddatur office address on 30 September 2026; shared footer and Contact use that exact information. Pincode and statewide coverage were not supplied, so neither is invented. The regional block invites location-specific enquiries. Footer destinations include a substantive solar guide (residential process, subsidy, maintenance and FAQ), financing page, website terms, and a contact-page complaint section with email and WhatsApp paths. No mailbox provisioning or email delivery test occurred. Visit form delivery remains deferred.

New sources checked: Indian Bank's official PM Surya Ghar loan page (loan amounts, margins, tenure and INR 70,000/kW cost illustration) and Income Tax Department Appendix I, rule 25, May 2026 (40% written-down-value depreciation for solar generating systems). Exact URLs are in solarSources. Tax eligibility is qualified and excluded from the calculator's financial returns. Reference suryasolarhub.com was reviewed for feature coverage; its guarantees, installation data and tariff assertions were not copied.

Results/resources follow-up validated on 30 September 2026: formatting/lint, Astro/TypeScript (zero diagnostics) and production build passed. All 79 browser/model checks passed; after adding the regional enquiry links, all 41 affected footer, responsive, accessibility, link and resource checks passed again. Screenshots of the calculator (home/business), footer, Contact, guide and financing were captured at 390, 768 and 1440 px; the affected layouts were visually inspected. Region links prefill a city-specific WhatsApp availability question, not a claim of an installed project or guaranteed coverage. No deployment, email or WhatsApp message was sent.
