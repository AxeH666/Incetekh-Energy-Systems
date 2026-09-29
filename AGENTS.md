# AGENTS.md

## Project
Incetekh Energy digital visibility project.

The current locked milestone is Phase 1: public website, visibility foundation, deployment, and business email setup.

Read `SCOPE.md` before planning or implementing work.

## Working Style
Treat this repository like a production engineering project.

- Work autonomously inside the locked scope.
- Prefer the smallest correct implementation.
- Use goal-based reasoning rather than waiting for file-by-file instructions.
- Inspect the repository and supplied assets before making implementation decisions.
- Make reasonable, reversible decisions without asking for permission unless missing information would materially change the result.
- Do not overengineer.
- Do not introduce abstractions, services, infrastructure, or dependencies without a concrete need in the current component.
- Do not start later-scope work early.
- Stop when the current component is complete.

## Scope Control
`SCOPE.md` is authoritative for the current milestone.

Do not add:
- WhatsApp automation
- Meta Cloud API
- AI agents
- CRM
- Gemini / Fireworks integrations
- VM infrastructure
- internal automation
- unrelated backend systems
- speculative future architecture

unless the user explicitly changes the scope.

If a proposed improvement belongs to a later milestone, document it briefly if useful and leave it unimplemented.

## Branch / PR Discipline
Follow this workflow:

1. Start from current `main`.
2. Create one branch for one focused component.
3. Plan the component before implementation if it is non-trivial.
4. Implement only that component.
5. Add focused validation/tests appropriate to the change.
6. Review your own diff before pushing.
7. Check for scope creep, unnecessary complexity, regressions, and missing documentation.
8. Push only when the component is internally complete.
9. Do not start the next component until the current PR is independently reviewed and merged.

Never stack PRs.

## Planning
For non-trivial work, explain the plan before implementation.

The plan should cover only what materially matters:
- intended user outcome
- constraints
- relevant assumptions
- minimal architecture / design approach
- validation strategy

Do not produce a bloated implementation plan when the task is simple.

## Design Direction
The site should feel like a premium, established engineering / energy company.

Reference class:
- SpaceX
- Tesla
- Adani
- Siemens Energy
- GE Vernova

Use these only as quality and design references. Do not copy layouts or branding.

Prioritize:
- strong typography
- large, credible imagery
- restrained composition
- whitespace
- clear hierarchy
- engineering credibility
- trust
- project evidence
- performance
- useful calls to action
- minimal, purposeful motion

Avoid:
- generic solar templates
- obvious AI / vibecoded styling
- excessive gradients
- icon-card-heavy layouts
- excessive glassmorphism
- unnecessary animation
- stock-photo-first design
- decorative complexity without purpose

## Truthfulness
Never invent:
- project capacities
- project dates
- project locations
- customer names
- government relationships
- certifications
- partnerships
- installation counts
- performance numbers
- testimonials
- awards
- warranty terms
- service claims

Use supplied evidence or explicitly confirmed information.

If evidence is incomplete:
- omit the claim, or
- mark it clearly for verification

Do not infer certainty from brochures, photos, or filenames when the underlying fact is unclear.

Generated imagery may support the website visually but must never be presented as documentary evidence of a specific Incetekh project.

## Asset Handling
Prefer real Incetekh assets for proof.

Generated or enhanced imagery may be used where appropriate, but preserve the distinction between:
- real project evidence
- enhanced real imagery
- generic generated supporting imagery

Do not relabel generated imagery as a real historical project.

## Implementation Quality
Use sound production defaults.

The website should:
- be responsive
- use semantic markup
- meet reasonable accessibility standards
- load efficiently
- avoid unnecessary dependencies
- use assets efficiently
- have strong SEO fundamentals
- have clear error states where relevant
- be maintainable without over-abstraction

Choose implementation details, libraries, and file structure based on the existing repo and the current component.

## Validation
Validation is part of the component.

Before considering work complete:
- run relevant linting
- run type checks if applicable
- run focused tests where applicable
- run the production build
- manually inspect the affected UX where possible
- fix issues introduced by the change

Do not hand-wave failures.

## Self-Review
Before push, inspect the diff for:

- correctness
- unnecessary complexity
- accidental scope creep
- unsupported claims
- broken responsive behavior
- accessibility issues
- performance regressions
- missing validation
- dead code
- accidental later-roadmap work

Fix findings before pushing.

## Review Findings
If independent review finds a real issue:
- fix it directly
- add regression coverage where appropriate
- keep the fix focused
- revalidate
- do not use the review as an excuse to broaden scope

## Completion
When the current component satisfies its goal and validation passes, stop.

Do not add "while we're here" features.
