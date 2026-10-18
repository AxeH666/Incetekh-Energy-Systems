# Solar Preview production setup

The owner requested public website deployment on 18 October 2026. PR41 deployed
the simplified flow and Waaree reference layout at merge `f8ef1e9`. Cloudflare
build `a766e4f2-47df-4767-bb8d-ddd3d4fa7dd8` succeeded; homepage/contact/preview
returned 200, the new module markup was present, runtime configuration was false,
and the private saved-review URL returned 404. The unrestricted Google key must
not be installed in a public browser. No new Google calls were made for this release.

PR42 added matched imagery and full roof-mask containment at merge
`4e35e207e24d232d7d29ede7ddf4ef69a35bd5b6`. Independent review approved
`dad8583554f9815f87c0e768a4e11417aa64eac0`; Cloudflare production build
`a5cd26a6-a00b-4a57-92ed-8596e8c1e765` succeeded. The deployed preview entry
references the raster chunk, public configuration remains false, ordinary pages
return 200 and the private review path returns 404.

PR43 deployed disabled setup at merge `cb7c12bc008fe771617db52f1ce75cec00ff70c1`;
Cloudflare build `56911db1-78b8-48ee-a3f6-90bf8fe6e194` succeeded. Runtime
bindings, secrets, false flags and empty usage table were verified. All prior
bindings remained unchanged. Its preview deployment had no secrets.

## Credential status and owner usage decision

1. **Saved; owner-confirmed restrictions.** A separate browser key with website restriction `https://incetekhenergy.com/*`
   and API restrictions **Maps JavaScript API** and **Places API (New)** only.
   Save it locally with `powershell -File scripts/Set-SolarOwnerBrowserKey.ps1 -Production`.
   The hidden prompt writes a separate Windows-user-encrypted file under
   `.codex/secrets/incetekh-solar-production`; it makes no API calls and prints no key.
   `-Check -Production` checks local readability only, not Google restrictions.
2. **Owner confirmed** the separate server credential is restricted to **Solar API only**.
   It must remain a runtime secret, never a browser/build value. Cloudflare's
   shared egress does not provide a dedicated IP to put in a static-IP restriction.
3. **Owner-directed uncapped use:** the owner declined the proposed 10/day and
   100/month allowance and said to configure limits later. Google quota and billing
   alert setup is explicitly deferred. Each assessment still makes at most one
   Insights, one Data Layers and two GeoTIFF calls. Google charges have no automatic
   application spending cutoff; direct Maps/Places usage is separate.

The production browser key's local readability was verified; Google Console
restrictions are owner-reported, not independently dashboard-verified. No key is
printed or committed. The production D1 export was restored locally with integrity
`ok`; rehearsing migrations 0003/0004 preserved all three existing enquiries and
the one email-outbox row. The protected export and hash evidence remain ignored
locally. Remote migrations 0003/0004 were applied on 18 October at 11:04 UTC.
Hashes verified all three existing enquiries and the email-outbox row unchanged;
the new usage table is empty. No test enquiry was submitted.

The separate browser key, server key and existing production Turnstile public
key are installed as runtime secrets. The widget's production domain was verified
through Cloudflare. Existing bindings were compared before/after and preserved;
the public config still returns only `{ "enabled": false }`. No Google request
was made. Protected installation and migration evidence is retained locally.

Shared-imagery verification: lint, 126-file type check, production build and 88
Worker tests passed. The full browser run passed 185 cases; its single synthetic
funnel module-list omission was fixed, and all six targeted raster/funnel checks
passed. The separate real local-Worker routing check passed. Independent review
found and resolved tiepoint ambiguity and undersampled roof-mask gaps. The final
implementation uses full intersected-cell checks and strict matching image grids.

Activation validation: lint, type checks, 145-page production build, all 90 Worker
tests and seven focused browser raster/disabled/funnel tests passed. New cases
cover uncapped tracking above former limits, concurrency, rollover, mixed finite
limits, challenge rejection and database failure. Live acceptance is recorded
separately after deployment; these automated results use synthetic providers.

## Public activation

Production configuration enables both Solar flags with `unlimited` daily/monthly
limits, as explicitly directed by the owner. Usage is still counted before every
assessment bundle, including failed attempts; failure to record usage blocks the
provider call. Missing, zero or malformed limits fail closed. Finite positive
limits remain supported for later configuration, without resetting counters.
Namespace `2026101801` stays at 3 attempts/minute per IP for burst protection,
separate from lead namespaces `2026101501`/`2026101502`. The account inventory
contained one Worker with only the production lead rate binding; repository
preview configuration contains only its separate lead binding. The exact allowed
origin is `https://incetekhenergy.com`. Preview deployments remain disabled and
receive no production Solar credentials. Existing lead/email keys, limits, cron
and cutoff stay fixed.

The launch verification will use up to three Maps loads, two Places search sessions
with at most five Autocomplete
requests and one Essentials detail lookup each, and one Solar assessment bundle
on SS Mall. No new enquiry/email is part of that test. This is part of the latest
uncapped public-release direction, not a reuse of exhausted private-test budgets.
Provider quotas/alerts are deferred; a representative residential roof remains
unverified. No claim of universal coverage or survey-grade accuracy is made.

After the reviewed activation deploy, verify
the actual Maps/Places restrictions, matched imagery, roof identity, panel overlay,
Before toggle, mobile layout and normal enquiry handoff. Do not claim this was
done based on synthetic tests. A missing address, neighbour, missing coverage,
unsupported image/grid or failing mask must produce a manual-visit fallback.

Rollback disables Solar only. Keep additive schema, usage counters and enquiries.
No private retained SS Mall imagery becomes a public fixture. Privacy, attribution
and retention requirements in SOLAR-PREVIEW.md remain applicable.

### Map interaction correction

The owner reported a successful live rooftop preview, followed by losing the
panels and repeated human checks when clicking the map to zoom. Map clicks had
been treated as new selections even while a preview was loading or displayed.
Those clicks now leave the confirmed preview intact. To select another roof,
choose another address or use “Panels don't match my roof” before tapping a roof.
Moving an unsubmitted pin reuses the current human check; a consumed token is
reset only for a retry or another explicit assessment. A successful preview hides
the check. No security verification is bypassed and no automatic Google retry is
introduced. Progress, expiry and failure messages appear beside confirmation.

Saved live SS Mall data replayed through the real page and Worker CSP rendered
nine reference-module panels without browser errors or new provider requests.
This replay and the owner's successful attempt do not establish residential
coverage, physical-device acceptance or the corrected live interaction by
themselves; verify zooming and explicit reselection after the correction deploys.

Official guidance: [Google key restrictions](https://developers.google.com/maps/api-security-best-practices),
[Solar coverage limitations](https://developers.google.com/maps/documentation/solar/coverage).
Usage is pay-as-you-go; Google recommends daily quotas for cost control:
[Solar usage and billing](https://developers.google.com/maps/documentation/solar/usage-and-billing).
