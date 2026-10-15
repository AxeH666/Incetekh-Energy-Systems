# D1 and Turnstile setup worksheet

Updated 15 October 2026. The owner has approved configuring the existing preview,
applying its migration and running controlled synthetic acceptance tests. Production
release, production migrations and paid resource creation remain unauthorized.
The resource IDs and public keys below are owner-verified. Authenticated D1 reads
confirmed both database identities; the preview migration is applied. Secret values
belong only in Cloudflare runtime Secrets and the owner's credential store.

## Current preview build status — 15 October 2026

The build-variable incident is resolved. Authenticated API inspection found that
this existing branch preview has its **own Worker ID and build trigger**, separate
from the production Worker trigger and the displayed Previews Base settings:

| Resource                         | Verified identifier                    |
| -------------------------------- | -------------------------------------- |
| Preview Worker ID                | `27ac7a5974ef428f9a45b2cc4a937704`     |
| Preview build trigger            | `03b4d965-bef0-4329-9bae-cf80d74e09f5` |
| Production Worker ID (read only) | `fb7deae1c1fa4810970f11cadac3f529`     |
| Production trigger (read only)   | `f803f1c6-4df8-48eb-ad3a-fc5409868a35` |

The preview trigger selects only `feat/site-visit-lead-capture`, runs
`npm run build`, and deploys with `npx wrangler preview`. Its variable map was
empty, matching build `0e5643c4`'s recorded effective environment. The production
trigger selects `main` and uses `npx wrangler deploy`; it was not changed.

Only the preview trigger's environment variables were patched:
`PUBLIC_TURNSTILE_SITE_KEY` to the inventoried preview public key and
`PUBLIC_SITE_INDEXABLE` to string `false`, both non-secret. Read-back confirmed
them. Build `bfa78669-6d74-429d-b033-5f90fb7b6ff2` of `0a863ff` recorded both
values, succeeded, and published `bd539c06-4a23-4aea-9cd5-f9738d37b74e`.
All six live language homepages then contained the correct preview key and
noindex metadata/headers. This establishes the missing effective variables as
the cause; the dashboard's save/copy behavior itself was not established.

The existing Windows User-scoped API token verified as active. It was absent
from the inherited shell environment; explicitly loading it into the process
and using Node **22.23.3** allowed Wrangler 4.151.0 `whoami` and remote migration
listing to succeed. Direct authenticated API requests also succeeded. The earlier
`fetch failed` did not reproduce; no TLS bypass, token rotation or proxy change
was needed, and its original network cause is unknown. Do not print the token:

```powershell
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
node --version # use .nvmrc: 22.23.3
npx wrangler whoami
npx wrangler d1 migrations list PREVIEW_DB --remote --config wrangler.preview-migrations.jsonc
```

For future authorized preview diagnostics, use the [Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/):

1. Read the existing preview at
   `/accounts/{account}/workers/workers/incetekh-energy-systems/previews/feat%2Fsite-visit-lead-capture`.
2. Use its returned `id` in `/accounts/{account}/builds/workers/{id}/triggers`.
   Verify branch filters and `wrangler preview` before any write. Listing only
   the production script tag's triggers missed this branch-specific trigger.
3. Read `/accounts/{account}/builds/triggers/{trigger_uuid}/environment_variables`.
   Compare it with the selected build's `trigger.trigger_uuid` and
   `build_trigger_metadata.environment_variables`; show only public values or
   secret names/presence. PATCH only the two public preview values when needed.
4. After an authorized build, inspect the live HTML in all six languages, exact
   runtime binding identities and the disabled API response. A green build alone
   does not establish correct generated configuration.

The account API also confirmed the preview widget is Managed, has only the exact
preview hostname, and uses `no_clearance`. Both runtime secret names remain
`secret_text`; secret values are neither logged nor included in evidence. D1 has
the applied migration, lead table and created-at index, with no pending migration.
The retained genuine acceptance receipt is still present. See
[the final acceptance record](LEAD_CAPTURE.md#final-preview-recheck--15-october-2026)
for live runtime and regression results and remaining release gates.

## Earlier preview investigation (historical)

The first preview is live at
<https://feat-site-visit-lead-capture-incetekh-energy-systems.incetekhenergy.workers.dev>.
The owner verified deployment `4559a3ae` as Ready. Live checks matched the tested
`b8dc874` homepage, confirmed noindex, an empty widget key and rejected API requests.
Production homepage/privacy/robots snapshots remained identical. GitHub's build
check for `cdfd759b` still reported in progress during that acceptance check.

The initial configured preview was `f2b9e23b-7598-41e0-8bf3-97014d9620d7`, published
with the pinned Wrangler preview command on 15 October 2026. Authenticated API reads
confirmed `main_module: index.js`, `/api/*` Worker-first routing, the preview-only
`LEADS_DB`, rate namespace `2026101501`, exact origin and capture flag `false`.
At that pre-acceptance checkpoint, all six language homepages served the preview
public key and noindex. A same-origin empty POST returned 503 `unavailable`; a
production-origin POST returned 403. The preview table had zero rows. Production settings/deployment metadata and
homepage/privacy/robots hashes were unchanged across this publication.

The owner reported a dashboard warning that this preview was static-assets-only.
API metadata and the live JSON handler proved that the earlier deployment already
had the Worker. The warning's cause is unconfirmed; a dashboard classification
issue is inferred. No Worker code or production changes were needed. Use the
preview-specific CLI secret commands below if the dashboard remains blocked.

The subsequent controlled acceptance window used deployment `19e1c40e`. The owner
completed a real Turnstile submission in a normal browser; remote D1 reads verified
one stored test row. Unchanged retries, conflicting retries, missing/invalid tokens,
input/origin failures, rate limiting and cooldown recovery were checked remotely.
See [the acceptance record](LEAD_CAPTURE.md#controlled-preview-acceptance--15-october-2026)
for results and limits. Deployment `f88f115a` closed the window: capture is disabled
again, while both preview secrets and preview-only bindings are retained. Production
configuration, deployment metadata and checked public pages remain unchanged.

## Values and access needed first

- Use the Cloudflare account that owns Worker `incetekh-energy-systems` and
  `incetekhenergy.com`. Confirm account ownership, recovery and MFA.
- Confirm the **Workers** plan and remaining D1 quota. The website zone's Free
  plan and Web Analytics plan do not establish Workers billing. We need two D1
  databases and two Turnstile Free widgets; no upgrade is required by this design.
  If the dashboard requests paid activation, stop and review with the owner.
- D1 creation/migrations require write authority (D1 Edit for API access); the
  person creating widgets needs Turnstile write access. Secret/config publication
  requires Worker edit/deploy authority. Use the existing authorized dashboard
  session or scoped CLI access; the Worker needs no database password or API token.
- Nominate a lead reviewer and backup, approve retention/export handling and
  six-language privacy/terms. Do not enable public capture before those decisions.
- Use the verified branch hostname in the inventory below. Do not substitute an
  old PR URL, the production Workers alias, a wildcard or a deployment-specific URL.

## Resource inventory

| Setting                  | Production                                                                                        | Controlled preview                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| D1 database name         | `incetekh-site-visits-prod`                                                                       | `incetekh-site-visits-preview`                                                    |
| D1 database ID           | `e5db446c-699e-4e19-8db0-816a3b83f3ad`                                                            | `e38a341f-de7f-48be-9195-917c9695b13a`                                            |
| Runtime D1 binding       | `LEADS_DB`                                                                                        | `LEADS_DB`                                                                        |
| Wrangler location        | Not bound in this preview-only change; top-level binding deferred until production setup approval | `previews.d1_databases`                                                           |
| Migration directory      | `migrations`                                                                                      | `migrations`                                                                      |
| Turnstile widget name    | `Incetekh site visits — production`                                                               | `Incetekh site visits — preview`                                                  |
| Turnstile mode           | Managed                                                                                           | Managed                                                                           |
| Turnstile hostname entry | `incetekhenergy.com`                                                                              | `feat-site-visit-lead-capture-incetekh-energy-systems.incetekhenergy.workers.dev` |
| Pre-clearance            | No / disabled                                                                                     | No / disabled                                                                     |
| Public key               | `0x4AAAAAAFXYexC6_XbQNo8g`                                                                        | `0x4AAAAAAFXbDu-BFz8OltPQ`                                                        |
| Secret key               | Production widget secret                                                                          | Separate preview widget secret                                                    |

Turnstile hostname entries also authorize their subdomains; they are not an
exact-host firewall. The Worker independently checks the exact URL origin,
browser Origin, Siteverify hostname and `site_visit` action. Do not add the
production Workers alias, parent `workers.dev`, localhost or test keys to these
widgets. No new DNS record, custom hostname or manual tracking script is needed.

## D1 dashboard and migration steps

1. Both databases have already been created by the owner. In **Storage & databases
   → D1**, verify their names and IDs against this inventory. Do not create duplicates.
2. Decide data location before creation if there is a jurisdiction requirement.
   Otherwise use automatic/default placement. A regional placement hint is not
   an India-only residency guarantee; do not make that claim in the privacy notice.
   D1 jurisdiction and location controls have different guarantees.
3. Add the preview binding to the corresponding Wrangler section, with
   `binding: "LEADS_DB"`, its `database_name`, actual `database_id`, and
   `migrations_dir: "migrations"`. Keep the current entrypoint, assets configuration
   and disabled flags. Do not replace the whole Wrangler file with a dashboard
   snippet. Git-backed configuration must match dashboard bindings. The production
   database is deliberately unbound in this preview-only configuration.
4. Prepare `wrangler.preview-migrations.jsonc` with the preview database under
   **top-level** `d1_databases`, binding `PREVIEW_DB`, and the same name/ID as
   `previews.d1_databases` in the application configuration. Do not use a production
   ID in that file. This file now exists and targets only the approved preview ID.
5. Preview migration `0001_site_visit_leads.sql` was applied on 15 October 2026 at
   10:21:28 UTC to `e38a341f-de7f-48be-9195-917c9695b13a`. Remote verification found
   the table, created-at index and migration record; there were zero lead rows and
   no pending migrations. The command below is the repeatable migration procedure,
   never a build hook:

   ```sh
   npx wrangler d1 migrations apply PREVIEW_DB --remote --config wrangler.preview-migrations.jsonc
   ```

   Do not run a production migration. A production binding and separate approval
   are prerequisites for any later production schema application.

   Apply [0001_site_visit_leads.sql](../migrations/0001_site_visit_leads.sql) through
   migrations, not by also pasting it into the console. Verify the migration list,
   `site_visit_leads` table and `site_visit_leads_created` index in the intended DB.
   Do not run schema creation twice or add destructive down-migrations.

6. After authorized preview publication, submit synthetic data and have the owner
   retrieve/export that exact row using the bounded queries in
   [LEAD_CAPTURE.md](LEAD_CAPTURE.md#owner-operations-and-privacy-gates). Verify the
   production database count remains unchanged. Sharing the same D1 ID shares data;
   naming something preview does not isolate it. Different future previews sharing
   the preview ID also share synthetic data with each other.

## Turnstile dashboard steps

1. Both widgets have already been created by the owner; do not create duplicates.
2. The preview widget is owner-verified as **Managed**, with pre-clearance disabled
   and only the exact listed preview hostname. Keep that configuration.
3. Record each public **sitekey** with its widget and environment. For this task,
   store only the **preview secret key** in the existing preview's runtime Secrets.
   Leave production secrets and settings untouched.
   Do not put secrets in chat, build variables, `.env.example`, source files or Git.
4. No custom action is configured in the dashboard: the browser already sends
   `action: "site_visit"`, and the Worker verifies that response action and host.
   The security script and required CSP origins are already implemented. Leave
   Cloudflare Web Analytics Automatic Setup and EU exclusion unchanged.

## Exact configuration map

On **Workers & Pages → incetekh-energy-systems → Settings → Builds**, select
Production or Previews Base for **build variables**:

| Build variable              | Production                            | Preview                                |
| --------------------------- | ------------------------------------- | -------------------------------------- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Do not change production in this task | `0x4AAAAAAFXbDu-BFz8OltPQ`             |
| `PUBLIC_SITE_INDEXABLE`     | Keep the existing approved `true`     | `false` (unset also defaults to false) |

Keep existing build commands and root directory. Never manually override
`WORKERS_CI` or `WORKERS_CI_BRANCH`. A public key change needs a future approved
rebuild to change the generated HTML; a runtime variable with that name cannot
update the static form.

The owner confirmed these two preview build variables were saved. The deployment
above used a local build with those same public values; subsequent branch builds
must retain them.

Git build `65fd35fc` for `8d17f1c` passed but emitted an empty sitekey in all six
homepage variants. The owner rechecked the exact **Builds → Previews Base** values
above on 15 October 2026, leaving production and runtime secrets unchanged. Treat
build success and runtime binding checks as insufficient: after a Git-driven
rebuild, verify the preview public key in each generated form, noindex, and disabled
API responses. Keep the latest build/deployment result in PR #29's acceptance
record. Never compensate for a missing build value by copying a production key or
moving a secret into a public variable.

The owner supplied the log for the later build `d6cd2a0f` (`5d6baf1`, preview
deployment `bf5a1559`). It confirms Node 22.23.3, `npm run build`, regeneration of
144 pages in `dist`, and `npx wrangler preview` targeting the correct branch URL.
The log does not report the environment received by Astro. The supplied screenshot
shows Builds / Previews Base, root `/`, the expected commands and public values;
the full Turnstile variable name is clipped in the image. The owner subsequently
copied the full name as `PUBLIC_TURNSTILE_SITE_KEY`, matching the source code.

Local builds of the same commit with and without the public sitekey produced the
expected results in all six languages. Live HTML matched the missing-key artifacts
byte for byte. A further local rebuild into the same output directory, retaining
the existing cache, correctly replaced empty keys when the variable was supplied.
The cache-restoration log alone therefore does not establish a cache defect.
At that checkpoint the effective remote build environment was unverified, so
further speculative builds were paused. The authenticated trigger correction
above subsequently resolved delivery without changing runtime secrets.

After the owner approved one diagnostic run and confirmed the temporary command
was saved, documentation commit `0a863ff` triggered build `0e5643c4`. Unexpectedly,
Cloudflare reported success and created preview deployment `7a5d8e75` at
11:30:13 UTC on 15 October 2026. The owner inspected this build and confirmed its
build command was `npm run build`, its build variables were listed as `None`, and
no diagnostic output ran. This confirms a mismatch between the displayed Previews
Base settings before that build and the build's effective configuration. After a
fresh dashboard reload, the owner saw `npm run build`, `npx wrangler preview` and
both expected public variables. Thus the diagnostic command was not retained;
the public variables are visible after reload, but their presence in the earlier
build remains unverified. The preview still has empty public sitekeys in
all six languages, noindex, disabled capture (503), and its separate D1 and secret
bindings. Production settings, deployment metadata and checked public-page hashes
remain unchanged. Do not treat this run as a successful diagnostic or retry it.

Cloudflare's [Builds API reference](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)
documents separate production and preview triggers, with commands, branch filters
and build variables belonging to each trigger. Its
[preview configuration documentation](https://developers.cloudflare.com/workers/previews/configuration/)
describes creation-time copying for runtime Base secrets; that does not establish
creation-time copying of build commands or build variables. No documented
branch-specific build override was found to explain this result. Compare the saved
preview trigger ID, command, branch filters and public-variable entries with the
build's `trigger.trigger_uuid` and `build_trigger_metadata`. This can distinguish
the current saved configuration from the earlier build configuration without
another run. At that checkpoint the cause of the variable mismatch was unknown;
screenshots alone did not establish a Cloudflare defect or user save error. Wrangler OAuth
access to the trigger-list endpoint was rechecked and denied (HTTP 403, code 10000;
earlier Builds reads returned 12004). The existing API token subsequently provided
the required access, as documented above; no further owner dashboard steps or new
credentials were needed. Production build values and runtime secrets were not
used as a workaround.

For this existing preview, select **Workers & Pages → incetekh-energy-systems →
Preview selector → feat/site-visit-lead-capture → Settings → Variables and secrets**.
Manually enter `TURNSTILE_SECRET_KEY` for the preview widget and a new independent
`RATE_LIMIT_KEY_SECRET`, each with type **Secret**. Do not enter them in Production,
build variables or chat. Updating Previews Base alone does not update this existing
preview. Keep non-secret runtime variables in `previews.vars` as well.

If the dashboard refuses secret entry, run each command separately from this
repository in an authenticated terminal using Node 22.19 or newer. Enter the value
only at Wrangler's hidden prompt, never as a command argument or in chat:

```sh
npx wrangler preview secret put TURNSTILE_SECRET_KEY --name feat/site-visit-lead-capture --worker-name incetekh-energy-systems
npx wrangler preview secret put RATE_LIMIT_KEY_SECRET --name feat/site-visit-lead-capture --worker-name incetekh-energy-systems
```

Use the secret belonging to preview sitekey `0x4AAAAAAFXbDu-BFz8OltPQ`, and a new,
independent random rate-limit secret. Each command creates a new deployment of
this existing preview while retaining its other configuration. Keep capture false;
verify both secret **names** and the disabled flag remotely before enabling tests.
The owner entered both secrets on 15 October 2026; authenticated deployment reads
confirmed both names with type `secret_text`. Values were not read or reported.
Do not substitute ordinary `wrangler secret put`, which does not select this branch
preview.

The production column below is a future setup reference, not a statement that
those variables or secrets are currently installed. Production remains untouched.

| Runtime setting                  | Production                                  | Preview                                                                                          |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `LEAD_CAPTURE_ENABLED`           | String `false` until release approval       | Currently `false`; controlled acceptance completed, enable only for another approved test window |
| `LEAD_CAPTURE_ENV`               | `production`                                | `preview`                                                                                        |
| `LEAD_ALLOWED_ORIGIN`            | `https://incetekhenergy.com`                | `https://` plus the exact preview hostname, no trailing slash                                    |
| `TURNSTILE_SECRET_KEY` (Secret)  | Production widget secret                    | Preview widget secret                                                                            |
| `RATE_LIMIT_KEY_SECRET` (Secret) | Unique random value, at least 32 characters | Different unique random value, at least 32 characters                                            |

Use a secure random generator/password manager for each rate-limit secret; for
example 32 random bytes encoded as 64 hexadecimal characters. Do not reuse a
Turnstile secret. Record keys in the owner's secure credential store.

Previews Base secrets are copied when a preview is created. Later Base changes
do not update existing previews; verify or set the preview's own secrets when
appropriate. Do not import production secret values into Base. Saving runtime
configuration can publish a new Worker version; do it only within the authorized
setup/release step, not merely to collect values for this worksheet.

The endpoint also requires the native rate-limit binding, separately configured
in top-level `ratelimits` and `previews.ratelimits`:

```jsonc
{
  "name": "LEAD_RATE_LIMIT",
  "namespace_id": "<unused positive numeric ID for this environment>",
  "simple": { "limit": 5, "period": 60 },
}
```

The deployed preview namespace is `2026101501`, with five attempts per 60 seconds.
Before publication, authenticated account inventory on 15 October 2026 found no rate-limit
bindings in production, Previews Base or the existing preview using this namespace.
No production rate binding is added by this task. A future production namespace
must be different. Select account-unique namespace IDs after checking existing usage.
These are identifiers chosen in config, not D1 IDs. The binding is not created by
making a dashboard WAF rule. It is a regional, approximate limiter, not a global
cap; its absence makes the API fail closed. Capture remains disabled during setup.

## Cost and acceptance boundary

D1 on Workers Free currently includes 5 million rows read/day, 100,000 rows
written/day and 5 GB account storage. Quota exhaustion can stop queries, so check
current account consumption. Turnstile Free supports 20 widgets, 10 hostnames per
widget and unlimited challenges. This design uses two widgets and two databases;
it does not request a paid upgrade. Native rate-binding documentation does not
provide a separate price here; verify account plan/billing before activation.

Real preview Turnstile validation, D1 retrieval by the engineering session, duplicate
retry, exact-host denial and rate enforcement are recorded. Before enabling
production, owner-role retrieval/export, retention/privacy/translation approval,
logging checks, current quotas and explicit release approval remain required.
Local tests cannot prove those dashboard facts. Only public sitekeys, resource
names/IDs and the preview hostname need to be shared for configuration review;
secret values must remain in Cloudflare and the owner's credential store.

Official references, checked 15 October 2026:
[D1 setup](https://developers.cloudflare.com/d1/get-started/),
[D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/),
[data location](https://developers.cloudflare.com/d1/configuration/data-location/),
[preview D1 isolation](https://developers.cloudflare.com/workers/previews/resources/),
[preview configuration/secrets](https://developers.cloudflare.com/workers/previews/configuration/),
[Turnstile dashboard](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/),
[hostname rules](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/),
[rate binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[Turnstile Free limits](https://developers.cloudflare.com/turnstile/plans/).
