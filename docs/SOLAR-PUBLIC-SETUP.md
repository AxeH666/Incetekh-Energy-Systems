# Solar Preview production setup

The owner requested public website deployment on 18 October 2026. PR41 deployed
the simplified flow and Waaree reference layout at merge `f8ef1e9`. Cloudflare
build `a766e4f2-47df-4767-bb8d-ddd3d4fa7dd8` succeeded; homepage/contact/preview
returned 200, the new module markup was present, runtime configuration was false,
and the private saved-review URL returned 404. The unrestricted Google key must
not be installed in a public browser. No new Google calls were made for this release.

## Credential status and remaining usage approval

1. **Saved; owner-confirmed restrictions.** A separate browser key with website restriction `https://incetekhenergy.com/*`
   and API restrictions **Maps JavaScript API** and **Places API (New)** only.
   Save it locally with `powershell -File scripts/Set-SolarOwnerBrowserKey.ps1 -Production`.
   The hidden prompt writes a separate Windows-user-encrypted file under
   `.codex/secrets/incetekh-solar-production`; it makes no API calls and prints no key.
   `-Check -Production` checks local readability only, not Google restrictions.
2. **Owner confirmed** the separate server credential is restricted to **Solar API only**.
   It must remain a runtime secret, never a browser/build value. Cloudflare's
   shared egress does not provide a dedicated IP to put in a static-IP restriction.
3. **Pending:** approve ongoing usage limits. Proposed initial trial: **10 assessment bundles/day,
   100/month**, each with at most one Insights, one Data Layers and two GeoTIFF
   calls. A separate bounded live launch test and representative residential roof
   are needed. Maps loads and Places searches are billed/controlled separately:
   application assessment counters do not limit direct browser API use. Verify
   applicable provider quotas and billing alerts before public enablement.

The production browser key's local readability was verified; Google Console
restrictions are owner-reported, not independently dashboard-verified. No key is
printed or committed. The production D1 export was restored locally with integrity
`ok`; rehearsing migrations 0003/0004 preserved all three existing enquiries and
the one email-outbox row. The protected export and hash evidence remain ignored
locally. The remote migrations have not yet been applied.

Shared-imagery verification: lint, 126-file type check, production build and 88
Worker tests passed. The full browser run passed 185 cases; its single synthetic
funnel module-list omission was fixed, and all six targeted raster/funnel checks
passed. The separate real local-Worker routing check passed. Independent review
found and resolved tiepoint ambiguity and undersampled roof-mask gaps. The final
implementation uses full intersected-cell checks and strict matching image grids.

## Deployment preparation

Keep both Solar flags false until the above inputs and live checks are resolved.
Use existing authorized Cloudflare access; install only verified credentials.
Verify a recoverable D1 export/point and rehearse the existing additive migrations
0003/0004 before applying them. Preserve existing enquiries/receipts/outbox and
compare their hashes before/after. Install a verified-unused Solar rate namespace
(3/minute), exact allowed origin and explicit limits, plus the existing production
Turnstile public key. Existing lead/email keys, limits, cron and cutoff stay fixed.

Before public launch enable both `SOLAR_PREVIEW_ENABLED` and
`SOLAR_MATCHED_IMAGERY_ENABLED` in the controlled acceptance environment. Verify
the actual Maps/Places restrictions, matched imagery, roof identity, panel overlay,
Before toggle, mobile layout and normal enquiry handoff. Do not claim this was
done based on synthetic tests. A missing address, neighbour, missing coverage,
unsupported image/grid or failing mask must produce a manual-visit fallback.

Rollback disables Solar only. Keep additive schema, usage counters and enquiries.
No private retained SS Mall imagery becomes a public fixture. Privacy, attribution
and retention requirements in SOLAR-PREVIEW.md remain applicable.

Official guidance: [Google key restrictions](https://developers.google.com/maps/api-security-best-practices),
[Solar coverage limitations](https://developers.google.com/maps/documentation/solar/coverage).
