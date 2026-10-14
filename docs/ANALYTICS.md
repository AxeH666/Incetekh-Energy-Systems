# Cloudflare Web Analytics and privacy disclosures

Reviewed **14 October 2026**. This component corrects disclosures for the existing
service; it does not enable analytics, deploy, or change Cloudflare settings.

## Confirmed configuration and implementation

The owner confirms Cloudflare Web Analytics is enabled, Automatic Setup is active,
Cloudflare injects the script, and analytics data is being collected. The agent has
not inspected the dashboard. Chrome previously showed one injected beacon while
curl and local artifacts omitted it. The old privacy conditional incorrectly used
an empty build token as evidence that analytics was disabled.

Automatic Setup is the sole script-installation method. Preserve it. The unused
`PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` path and manual layout script have been removed
in this PR to prevent a second beacon if a stale build variable is supplied. No
new flag, token, cookie banner, tracking event or dependency is introduced.
The existing CSP permits the injected script and both same-origin and Cloudflare
collection endpoints; it has not been changed.

The privacy page describes **incetekhenergy.com**, including when viewed locally
or on a non-indexable preview. Disclosure text is not proof that a particular
preview collects analytics. Indexing and injection are independent: noindex does
not disable Cloudflare Automatic Setup. Preview/alias collection exclusions must
be checked through Web Analytics hostname/rules settings, without assuming that
an empty preview build-variable list excludes traffic from edge analytics.

## Official evidence behind the copy

| Topic                     | Provider documentation and disclosure boundary                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection purpose        | [About Web Analytics](https://developers.cloudflare.com/web-analytics/about/) describes visits and browser performance measurements                                                                                                                                                         |
| Reported information      | [Dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/) lists country, host/path, referrer, browser, device and operating system                                                                                                                             |
| Browser measurements      | [RUM beacon](https://developers.cloudflare.com/speed/observatory/rum-beacon/) describes page URLs/referrers, a per-page ID and load/interaction timing; this is not a claim that no identifiers are ever generated                                                                          |
| Storage and IP handling   | The RUM documentation says the beacon does not use browser storage, and the analytics service receives IP addresses through HTTP but discards them without database/log retention. This does not describe all Cloudflare hosting/security processing                                        |
| Cross-site tracking       | [Data collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/) says Cloudflare does not track individual users across customer sites; proxied collection uses `/cdn-cgi/rum` on the site's own origin                                          |
| URL queries and retention | [FAQ](https://developers.cloudflare.com/web-analytics/faq/) says query strings are not logged; unsampled data is retained for seven days, then sampled/aggregated. Six months of data is accessible. Dashboard accessibility is not a promise that all records are deleted after six months |
| Automatic injection       | [Setup documentation](https://developers.cloudflare.com/web-analytics/get-started/) confirms edge injection for proxied sites; no second script should be installed                                                                                                                         |

The public copy avoids broad claims that Cloudflare never receives IP addresses,
that the whole website processes no personal information, or that analytics is
legally exempt from consent in every jurisdiction. Existing enquiry, calculator,
unconnected-form and hosting disclosures stay unchanged.

## Validation and release boundary

Local validation on 14 October 2026 (Node 22.23.3, installed Chrome): formatting
lint and Astro/type checks passed; default and indexable production builds passed.
All 35 focused default-mode tests passed, plus the existing outbound-link check.
All 18 production-mode privacy/SEO checks passed with a dummy legacy analytics
token supplied, confirming that it cannot inject a script. English desktop and
Telugu mobile analytics sections were visually inspected; automated layout/copy
checks cover all six languages at both widths. These are local results, not
evidence of a new deployment or native-speaker acceptance.

- Test disclosure rendering in English, Telugu, Hindi, Tamil, Malayalam and Kannada
  at mobile/desktop widths, including local builds without an analytics token.
- Check all 145 HTML artifacts contain no application-injected analytics script,
  in default preview and indexable production modes. Include a stale legacy token
  during the production build to verify it cannot add a second script.
- Keep SEO, contacts, CSP, robots, sitemap, error handling and forms covered by
  existing regression checks. Local tests block analytics endpoints and never
  intentionally send a live test beacon.
- After a separately approved release, inspect normal browser HTML for one edge
  beacon and the corrected localized privacy copy; confirm collection in the
  existing account without changing its settings. Curl alone is insufficient.
- Hold merge and deployment for owner review. A branch push may itself deploy a
  preview; verify a non-deploying publication route before pushing this PR.

## Unresolved privacy questions before merge

1. Confirm who can access/export analytics, the applicable account terms/data
   processing arrangements, and any retained exports. Do not invent an Incetekh
   retention schedule from Cloudflare's dashboard display window.
2. Confirm Automatic Setup's geographic exclusions and hostname rules, including
   whether Workers aliases or previews are measured. RUM may be processed outside
   a visitor's country; no India-only residency is claimed.
3. Obtain owner/native-speaker review of the five translated disclosures. Build
   checks prove coverage and rendering, not legal or native-language approval.
4. Decide whether applicable visitor jurisdictions require additional disclosures
   or consent. This change reports provider behavior; it is not a legal compliance
   determination and does not add a consent mechanism.

Production will keep its older privacy copy until the owner approves a release.
