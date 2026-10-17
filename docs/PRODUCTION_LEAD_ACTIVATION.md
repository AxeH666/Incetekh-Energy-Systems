# Production lead capture

The activation record below is historical. The 17 October cleanup restores a
lead-capture-only implementation, with privacy notice version `2026-10-17` for
future submissions after an approved release. Existing rows retain their original
notice versions and receipt IDs. The cleanup is not deployed; see the current
[infrastructure note](INFRASTRUCTURE.md) for verified schema and deferred resource
cleanup. The operating and retention policy below is unchanged.

## Release authority and sequence

On 15 October 2026 the owner authorized independent review and merge of PR #29,
verification of healthy production with capture disabled, and a separate controlled
production activation. The owner then delegated the retention/operating policy
decision using Indian requirements and established international guidance.

Independent review of `3e4ad55` found no blockers. PR #29 merged as `78acb87`.
Production build `c56fb610` passed and deployed version
`535217f2-0b1a-4917-90a6-e84c0a2fad4c`. Before activation, all 138 sitemap pages
returned 200 with indexable metadata; sitemap, robots, www redirect, six homepage
forms and 404 handling passed. The deployed capture flag was `false`, no production
D1/rate binding existed, and the API denied submission (403).

This follow-up uses the existing production database and widget. It does not
repeat preview setup, recreate databases, change the preview build fix, add
notifications or introduce a CRM. Publication of this component enables capture;
do not merge it before resource checks, focused validation and independent review.

## Production configuration

| Item                   | Value                                             |
| ---------------------- | ------------------------------------------------- |
| Allowed origin         | `https://incetekhenergy.com`                      |
| Environment            | `production`                                      |
| D1 binding             | `LEADS_DB`                                        |
| Existing database      | `incetekh-site-visits-prod`                       |
| Database ID            | `e5db446c-699e-4e19-8db0-816a3b83f3ad`            |
| Rate namespace         | `2026101502`, separate from preview `2026101501`  |
| Rate policy            | 5 attempts / 60 seconds, regional and approximate |
| Public widget key      | `0x4AAAAAAFXYexC6_XbQNo8g`                        |
| Runtime secret names   | `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_KEY_SECRET`   |
| Privacy notice version | `2026-10-15.1`                                    |

The existing Managed widget authorizes only the apex hostname, with pre-clearance
disabled. Its existing secret was installed only into production; an independent
32-byte random rate secret was installed alongside it. Values were never printed,
committed or written into build variables. Runtime metadata confirmed both secret
names/types while capture stayed disabled.

The production database had no lead schema. Its first and only pending migration,
`0001_site_visit_leads.sql`, was applied on 15 October at 12:39:51 UTC. Verification
found the migration record and zero rows. This is the first production migration,
not a repeat of the completed preview migration. No schema/data was dropped.
Future migrations remain explicit operations, never automatic build hooks.

The production build retains `PUBLIC_SITE_INDEXABLE=true` and uses the production
public widget key. Preview configuration explicitly retains its separate DB/rate
binding and capture `false`. No production secret is copied into Previews Base.

## Operating policy

- Accountable operator: the Incetekh founder/account owner. Check saved enquiries
  twice each business day through authenticated D1 access. There are no automatic
  alerts. Arrange a named backup with least-privilege access before any absence;
  no unverified backup identity or access grant is claimed here.
- Active follow-up: normally 90 days from submission, then stop unsolicited
  follow-up unless the customer asks to continue. A form submission does not opt
  someone into unrelated marketing.
- Unconverted enquiry history: normally at most 12 months from submission. Keep
  access limited to staff handling the enquiry and privacy requests. Review monthly,
  record why any exception is needed, and remove unnecessary records subject to
  applicable legal retention. No automatic purge is installed.
- Ongoing project, warranty, dispute or mandatory legal records follow their
  documented purpose and applicable retention requirement; do not delete these
  solely because the original enquiry is old. Do not keep records indefinitely
  without a reason and next review date.
- Process correction, stop-contact and deletion requests through the published
  phone/email. Verify identity proportionately without collecting extra documents
  by default. Check legal holds before deletion, document any lawful exception,
  and reconcile retained backups/exports after restores.
- Prefer bounded D1 reads over bulk exports. If an export is necessary, use encrypted
  owner-controlled storage, restrict recipients, and remove the working copy within
  30 days unless an ongoing documented need requires it. No export was created
  as part of routine activation.
- Before deleting anything, select the specific receipt IDs, confirm whether each
  is still needed, and use bound parameters. No age-only mass delete or resource
  deletion is authorized by this release. The earlier synthetic preview row is
  preserved.

These periods are the chosen operating policy, not a universal industry standard
or a legal compliance certification. The 90-day contact window limits unnecessary
follow-up; the 12-month history supports enquiries that become projects over a
longer planning cycle and requests about prior communications.

The [ICO storage-limitation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/)
does not prescribe one duration for every kind of data: purpose, justification,
regular review and removal matter. It is used here as international good practice,
not as a claim that UK law automatically applies to this Indian business.

India's final [DPDP Rules 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
have phased commencement. Rules 6 and 8 include one-year retention provisions and
are in the group commencing 18 months after Gazette publication; they are not
already operative on 15 October 2026. Review applicability, security/log retention,
processor contracts and deletion exceptions before their May 2027 commencement.
The public notice expressly preserves applicable legal-retention requirements.
Do not equate a 12-month database policy with full DPDP compliance, or claim Indian
data residency: the existing Cloudflare placement was not changed.

## Verification and rollback

Pre-release validation passed `npm run verify`: formatting, Astro/Worker type
checks, the production build, 36 Worker/configuration tests and 127 browser/model/
artifact tests. An additional indexable build with the production public key
passed all 18 focused privacy/SEO/artifact checks. The SEO test permits only the
exact required Turnstile script and stubs it locally; live security verification
still uses the genuine production widget.

The activation PR records the final reviewed commit, Cloudflare build/version and
live results. Verify all six public keys and indexing, exact production binding
IDs, runtime secret presence, origin/alias rejection and safe responses. Accepted
synthetic submissions require a genuine Turnstile token; a widget test key or
direct database insert is not end-to-end acceptance. Clearly distinguish any
automated-browser challenge limitation from storage/API evidence.

If activation verification fails, return to the recorded disabled production
version `a8815839-4b57-4b33-b1f0-06c523b739ce` using Wrangler rollback or the
deployment API. This version contains the production secrets but leaves capture
disabled and has no D1/rate binding. Verify the live form/API
is closed; metadata alone can precede edge propagation. Keep all D1 data and
resources. Then set the checked-in production flag to `false` in a focused fix so
a later Git deployment cannot inadvertently re-enable capture. Never roll back
by dropping the database, removing accepted leads or copying preview credentials.

Normal source commands are `npm run verify` and `npx wrangler deploy` through the
existing Git integration. Do not replace the build/deploy commands or introduce
paid subscriptions. Local deployment/resource records and synthetic evidence stay
under ignored `.wrangler/`; no identifying enquiry fields belong in PR comments.
