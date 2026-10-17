# Incetekh Energy — Phase 1 Scope

## Milestone
Digital visibility and marketing foundation.

## Objective
Build a production-quality public website and supporting visibility stack that presents Incetekh Energy as an established, credible solar EPC business and improves discoverability, trust, and lead generation.

Incetekh Energy has an operating history of approximately 15 years and has historically relied heavily on word of mouth. The current milestone is to turn that offline credibility into a strong digital presence.

## In Scope

### Public website
- Premium public-facing marketing website
- Responsive desktop and mobile experience
- Clear presentation of Incetekh's history, capabilities, services, project experience, and trust signals
- Real Incetekh project imagery wherever available
- Carefully selected supporting/generated imagery where real imagery is missing
- Contact and lead-generation paths
- Strong basic SEO structure
- Production-ready deployment

### Company credibility
Use supplied evidence to present:
- company history
- solar EPC capability
- real project/installations
- testimonials
- government / PSU / commercial work where supported
- certifications, empanelments, partnerships, or dealership relationships where supported
- free site visits
- 5-year warranty
- system performance checks
- annual yield audits

Do not publish any claim unless it is supported by supplied material or explicitly confirmed by the user.

### Visibility setup
- Connect the website to `incetekhenergy.com`
- HTTPS / production deployment
- Google Search Console readiness
- Google Analytics or equivalent analytics setup
- sitemap and robots configuration
- basic structured data where appropriate
- basic local/technical SEO foundation

### Business email
Business email is part of Phase 1, but should be handled as a separate component from the website implementation.

Expected outcome:
- professional domain email addresses
- correct DNS records
- SPF / DKIM / DMARC where supported
- reliable send/receive setup

Final provider and mailbox list should be decided before implementation.

## Design Direction

The website should feel like an established engineering and energy company, not a generic solar installer template.

Reference class:
- SpaceX
- Tesla
- Adani
- Siemens Energy
- GE Vernova
- other high-quality global industrial / technology companies

Do not copy any site directly.

Prioritize:
- strong typography
- large photography
- restrained layout
- generous whitespace
- clear information hierarchy
- engineering credibility
- project proof
- trust
- performance
- useful calls to action
- minimal, purposeful motion

Avoid:
- generic solar-company templates
- obvious AI / vibecoded appearance
- excessive green gradients
- generic sustainability icon cards
- excessive glassmorphism
- unnecessary animation
- stock-photo-heavy presentation
- invented statistics
- invented case studies
- invented customer names
- exaggerated claims

## Asset Rules

### Real project material
Real Incetekh photos, brochures, certificates, testimonials, and project records are the preferred source of truth.

### Enhanced imagery
Real images may be enhanced for:
- exposure
- sharpness
- crop
- perspective
- composition
- color balance
- noise
- background cleanup

The underlying installation and project identity must remain truthful.

### Generated supporting imagery
Generated imagery may be used for generic supporting visuals such as:
- technicians working
- engineering inspection
- technical detail
- generic rooftop scenes

Generated imagery must not be presented as documentary evidence of a specific Incetekh project.

## Out of Scope

Do not build any of the following in this milestone unless the scope is explicitly changed:

- WhatsApp automation
- Meta Cloud API integration
- AI customer-service agents
- CRM
- internal business automation
- Gemini API integration
- Fireworks AI integration
- AI inference backend
- production VM / agent infrastructure
- customer database beyond what is strictly needed for simple website lead handling
- complex admin dashboards
- paid-ad campaign systems
- mobile apps
- unrelated business operations tooling

## Execution Model

Use one focused component per branch and PR.

Suggested sequence:

1. Project foundation + design system
2. Homepage
3. About + services
4. Projects / proof / testimonials
5. Contact + lead conversion
6. SEO + analytics + production hardening
7. Deployment + domain connection
8. Business email setup as a separate task/component

Do not stack PRs.

Each new branch should start from fresh `main` after the previous PR is reviewed and merged.

## Definition of Done

Phase 1 is complete when:

- the public website is live on `incetekhenergy.com`
- the site works well on desktop and mobile
- the design matches the agreed premium industrial direction
- all public claims are supported
- real project evidence is used appropriately
- contact / lead paths work
- production build passes
- major accessibility / responsive / performance issues are addressed
- technical SEO basics are in place
- analytics / search readiness is configured
- professional business email is configured
- no Phase 2 automation or AI-agent scope has leaked into the implementation

When these conditions are satisfied, stop.
