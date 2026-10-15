# Cloudflare Web Analytics and privacy disclosures

**Local follow-up, 15 October 2026:** [lead capture](LEAD_CAPTURE.md) adds separate
Turnstile and D1 disclosures while preserving these analytics paragraphs and
Automatic Setup. Its first disabled branch preview is approved; production
release and capture activation are not.
Earlier statements below about the unconnected form describe PR #28's baseline.
EU analytics exclusion does not disable Turnstile security processing.

Reviewed **14 October 2026**. PR #28 corrected disclosures for the existing
service without changing Cloudflare settings. The owner subsequently approved
merge: the lead-capture planning baseline is main `4bb9f7b`, with a successful
GitHub production build check. That check does not establish the regional/hostname
browser acceptance below. Earlier preview-only approval applied to PR #28;
lead-capture publication has separate, disabled-preview-only approval.

## Confirmed configuration and implementation

**Owner-verified dashboard configuration, 14 October 2026:**

- Cloudflare **Free** plan; Web Analytics enabled for `incetekhenergy.com`.
- Automatic JavaScript injection enabled; data collection confirmed.
- Selected mode: **Enable, excluding visitor data in the EU**. Cloudflare states
  that its snippet is not injected for EU visitors.
- Advanced Web Analytics Rules require Pro or higher; no upgrade or configuration
  change was made.

The agent has not independently inspected the dashboard or tested from an EU
network. [Cloudflare's setup documentation](https://developers.cloudflare.com/web-analytics/get-started/)
confirms the selected mode's injection behavior. The public disclosure now states
this setting in all six languages and qualifies browser transmission with
"Where analytics is enabled". This concerns the analytics script, not all hosting
or security processing, and makes no legal-compliance claim. Do not expand the
dashboard's EU label into a promise about the UK, Switzerland or all of Europe.

Chrome previously showed one injected beacon while
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
not disable Cloudflare Automatic Setup. Empty preview build variables also do
not establish an analytics exclusion.

## Free-plan limits and hostname boundaries

[Cloudflare's limits](https://developers.cloudflare.com/web-analytics/limits/)
give Free plans **zero** advanced Web Analytics rules (Pro has five). The EU
mode is a separate available setup option; it does not require an upgrade.
Free-plan automatic injection covers the zone's subdomains, subject to the
selected EU exclusion and injection prerequisites. Do not instruct the owner to
add a hostname/path exclusion through paid-only rules. No workaround, upgrade
or new integration is part of this PR.

| Host or environment                                                                                   | Established behavior and evidence boundary                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `incetekhenergy.com`                                                                                  | Owner confirms automatic injection and collection with EU exclusion. Earlier Chrome checks saw one beacon but did not record the visitor region; EU behavior still needs a region-specific acceptance check. |
| A proxied preview under `*.incetekhenergy.com`                                                        | Treat it as eligible for the zone's automatic injection. A preview name or `noindex` is not an exclusion. Do not assume one can configure an advanced exclusion on Free.                                     |
| `incetekh-energy-systems.incetekhenergy.workers.dev` and branch/version hosts ending in `workers.dev` | These are outside the `incetekhenergy.com` zone. **Inference:** that zone's automatic setup should not cover them. This is not a measured guarantee that every Workers hostname is analytics-free.           |
| Local build                                                                                           | All generated HTML is tested for absence of an application beacon. This establishes source behavior, not Cloudflare edge behavior.                                                                           |

[Rules documentation](https://developers.cloudflare.com/web-analytics/configuration-options/rules/)
describes zone-wide injection and per-host/path controls.
[Workers routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
and [version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)
place those aliases on `workers.dev`, separate from the custom domain.
The [Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/)
also documents hostname-suffix validation for a site's beacon: `workers.dev`
does not match `incetekhenergy.com`. This supports expecting no ingestion into
that site's property; it does not rule out other account properties, injection
paths or platform behavior. The documentation does not provide account-specific
proof of preview isolation. Inspect live browser responses and the account's Host
dimension before claiming that isolation. An empty report alone is inconclusive.

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

Validation refreshed after the EU clarification on 14 October 2026 (Node 22.23.3,
installed Chrome): formatting lint and Astro/type checks passed (83 files, no
diagnostics); default and indexable production builds passed. All 35 focused
default-mode tests and 19 production-mode privacy/SEO/outbound-link checks passed.
A dummy legacy analytics token was supplied to the production build, confirming
that it cannot inject a script. English desktop and
Telugu mobile analytics sections were visually inspected; automated layout/copy
checks cover all six languages at both widths. These are local results, not
evidence of a production deployment or native-speaker acceptance. Independent
review found no source blocker; its stale plan-status documentation finding was
corrected. All 50 relative links in the affected documentation resolve.

- Test disclosure rendering in English, Telugu, Hindi, Tamil, Malayalam and Kannada
  at mobile/desktop widths, including local builds without an analytics token.
- Check all 145 HTML artifacts contain no application-injected analytics script,
  in default preview and indexable production modes. Include a stale legacy token
  during the production build to verify it cannot add a second script.
- Keep SEO, contacts, CSP, robots, sitemap, error handling and forms covered by
  existing regression checks. Local tests block analytics endpoints and never
  intentionally send a live test beacon.
- Hold merge and production deployment for final owner approval. Automatic branch
  previews for this same PR are explicitly authorized. No manual deployment is
  needed to update the PR.

## Exact owner checks before merge

Record the result, reviewer and date privately where account details are involved;
never paste API tokens, credentials or visitor exports into this public repository.

1. **Access:** list account members/roles who can view analytics and the owners and
   scopes of existing API tokens able to read it. Confirm each access is intended,
   MFA is enabled for human accounts, and who handles analytics/privacy enquiries.
   Inspection does not authorize changing roles or tokens.
2. **Exports:** confirm whether any downloads, GraphQL queries, scheduled exports
   or shared reports exist. If none, record "none confirmed by owner". Otherwise
   record the custodian, destination, recipients, contents, retention/deletion
   period and access controls. No new export is needed. Six months of dashboard
   visibility is not an Incetekh retention policy or a provider deletion guarantee.
3. **Terms:** confirm the account's contracting entity, applicable subscription
   agreement and accepted DPA/version or other applicable processing terms.
   [Cloudflare's published DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)
   is a reference, not evidence of this account's acceptance. Review relevant
   processing roles, subprocessors and transfer terms with the responsible owner
   or adviser. No EU or India-only data residency is claimed.
4. **Language approval:** approve the English disclosure and have a fluent reviewer
   sign off Telugu, Hindi, Tamil, Malayalam and Kannada, especially the EU setting,
   conditional collection and the distinction between analytics IP disposal and
   hosting/security processing. Automated coverage is not translation approval.
5. **Applicable consent/disclosures:** identify the jurisdictions relevant to the
   business and visitors and record the owner's qualified assessment of any
   notice, consent or other requirements. Neither EU exclusion nor cookieless
   measurement alone establishes compliance. Any required banner or changed
   collection needs separate approval; none is added here.

The EU setting and Free-plan rule limit are resolved facts, not pending owner
decisions. Live verification of hostname isolation is still outstanding. The
owner should record the outstanding acceptance evidence; the approved PR #28
merge/build alone does not resolve it.

## Acceptance after an approved production release

1. Confirm the released SHA and corrected `/privacy/` copy in all six languages.
2. From a normal browser on a known non-EU network, verify exactly one analytics
   script and normal collection to the expected property. From a known EU network,
   verify no injected analytics script or RUM request. Record date, region and
   hostname; browser locale, timezone or simulated GPS is not a network-region
   test. Do not change Cloudflare settings to perform these checks.
3. Inspect the production Workers alias and the exact current branch/version URL
   from the build dashboard in a fresh browser, checking both injected HTML and
   network requests to same-origin `/cdn-cgi/rum` and `cloudflareinsights.com`.
   For non-collecting diagnostics, block both collection destinations and label
   that evidence accordingly; blocked requests cannot prove successful ingestion.
   Correlate permitted normal traffic with the dashboard's Host dimension and
   other configured analytics sites. Investigate unexpected beacons or hosts;
   do not buy rules or change settings as part of acceptance.
4. Recheck canonical/robots/noindex behavior separately. Those controls affect
   search indexing, not analytics collection. Curl-only absence is insufficient
   evidence that browser injection is absent.

PR #28's merge/build is recorded above; verify the actual live copy and regional
collection as described here. The newer lead-capture disclosure belongs to the
feature branch and is not released to production.
