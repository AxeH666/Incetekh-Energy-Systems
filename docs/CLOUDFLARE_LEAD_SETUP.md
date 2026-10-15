# D1 and Turnstile setup worksheet

Prepared 15 October 2026 for the local lead-capture component. **Instructions only:
this worksheet itself creates no resources, secrets, migrations, deployments or
paid plans.** The owner subsequently reported creating the two D1 databases and
production Turnstile widget and approved only a first disabled branch preview.
Work
through this with the owner after setup authorization. Keep capture disabled until
the controlled preview test is approved; production needs separate release approval.

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
- Obtain the **actual stable branch-preview hostname** from Cloudflare. It is not
  yet verified at preview preparation. Do not substitute an old PR URL, the
  production Workers alias, a wildcard or a guessed branch slug. If it is not yet
  allocated, a separately approved disabled preview publication is needed first;
  that publication is not authorized by this worksheet.

## Resource inventory

| Setting                  | Production                            | Controlled preview                                      |
| ------------------------ | ------------------------------------- | ------------------------------------------------------- |
| D1 database name         | `incetekh-site-visits-prod`           | `incetekh-site-visits-preview`                          |
| D1 database ID           | Record the actual UUID after creation | Record a **different** actual UUID                      |
| Runtime D1 binding       | `LEADS_DB`                            | `LEADS_DB`                                              |
| Wrangler location        | Top-level `d1_databases`              | `previews.d1_databases`                                 |
| Migration directory      | `migrations`                          | `migrations`                                            |
| Turnstile widget name    | `Incetekh site visits — production`   | `Incetekh site visits — preview`                        |
| Turnstile mode           | Managed                               | Managed                                                 |
| Turnstile hostname entry | `incetekhenergy.com`                  | Exact verified preview hostname, without scheme or path |
| Pre-clearance            | No / disabled                         | No / disabled                                           |
| Public key               | Production widget sitekey             | Separate preview widget sitekey                         |
| Secret key               | Production widget secret              | Separate preview widget secret                          |

Turnstile hostname entries also authorize their subdomains; they are not an
exact-host firewall. The Worker independently checks the exact URL origin,
browser Origin, Siteverify hostname and `site_visit` action. Do not add the
production Workers alias, parent `workers.dev`, localhost or test keys to these
widgets. No new DNS record, custom hostname or manual tracking script is needed.

## D1 dashboard and migration steps

1. In Cloudflare, open **Storage & databases → D1 → Create database**. Create the
   two named databases above in the existing account and record both actual IDs.
   Check existing inventory first to avoid duplicates.
2. Decide data location before creation if there is a jurisdiction requirement.
   Otherwise use automatic/default placement. A regional placement hint is not
   an India-only residency guarantee; do not make that claim in the privacy notice.
   D1 jurisdiction and location controls have different guarantees.
3. Add each binding to the corresponding Wrangler section after approval, with
   `binding: "LEADS_DB"`, its `database_name`, actual `database_id`, and
   `migrations_dir: "migrations"`. Keep the current entrypoint, assets configuration
   and disabled flags. Do not replace the whole Wrangler file with a dashboard
   snippet. Git-backed configuration must match dashboard bindings.
4. Prepare `wrangler.preview-migrations.jsonc` with the preview database under
   **top-level** `d1_databases`, binding `PREVIEW_DB`, and the same name/ID as
   `previews.d1_databases` in the application configuration. Do not use a production
   ID in that file. The file does not yet exist because no real ID is available.
5. Once that target is approved, apply the checked-in migration using the pinned
   Wrangler from the repository. These commands are for later execution, not a
   build hook:

   ```sh
   npx wrangler d1 migrations apply PREVIEW_DB --remote --config wrangler.preview-migrations.jsonc
   ```

   Production schema application is a separate approved step, using its top-level
   binding in the main config:

   ```sh
   npx wrangler d1 migrations apply LEADS_DB --remote --config wrangler.jsonc
   ```

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

1. Open **Turnstile → Add widget**. Create the two widgets in the inventory table.
2. Select **Managed**. Add only the listed hostname for each environment, without
   `https://`, port, path or `*`. Select **No** for pre-clearance and save.
3. Record each public **sitekey** with its widget and environment. Store each
   **secret key** directly in that environment's Worker runtime Secrets field.
   Do not put secrets in chat, build variables, `.env.example`, source files or Git.
4. No custom action is configured in the dashboard: the browser already sends
   `action: "site_visit"`, and the Worker verifies that response action and host.
   The security script and required CSP origins are already implemented. Leave
   Cloudflare Web Analytics Automatic Setup and EU exclusion unchanged.

## Exact configuration map

On **Workers & Pages → incetekh-energy-systems → Settings → Builds**, select
Production or Previews Base for **build variables**:

| Build variable              | Production                        | Preview                                |
| --------------------------- | --------------------------------- | -------------------------------------- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Production public sitekey         | Preview public sitekey                 |
| `PUBLIC_SITE_INDEXABLE`     | Keep the existing approved `true` | `false` (unset also defaults to false) |

Keep existing build commands and root directory. Never manually override
`WORKERS_CI` or `WORKERS_CI_BRANCH`. A public key change needs a future approved
rebuild to change the generated HTML; a runtime variable with that name cannot
update the static form.

On the Worker's **Settings → Variables and secrets**, choose the correct
Production/Previews Base toggle for runtime secrets. Keep non-secret runtime
variables in the matching Wrangler `vars` / `previews.vars` blocks as well:

| Runtime setting                  | Production                                  | Preview                                                                  |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| `LEAD_CAPTURE_ENABLED`           | String `false` until release approval       | String `false` until controlled preview testing is approved, then `true` |
| `LEAD_CAPTURE_ENV`               | `production`                                | `preview`                                                                |
| `LEAD_ALLOWED_ORIGIN`            | `https://incetekhenergy.com`                | `https://` plus the exact preview hostname, no trailing slash            |
| `TURNSTILE_SECRET_KEY` (Secret)  | Production widget secret                    | Preview widget secret                                                    |
| `RATE_LIMIT_KEY_SECRET` (Secret) | Unique random value, at least 32 characters | Different unique random value, at least 32 characters                    |

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

Select two different account-unique namespace IDs after checking existing usage.
These are identifiers chosen in config, not D1 IDs. The binding is not created by
making a dashboard WAF rule. It is a regional, approximate limiter, not a global
cap; its absence makes the API fail closed. No configuration is activated here.

## Cost and acceptance boundary

D1 on Workers Free currently includes 5 million rows read/day, 100,000 rows
written/day and 5 GB account storage. Quota exhaustion can stop queries, so check
current account consumption. Turnstile Free supports 20 widgets, 10 hostnames per
widget and unlimited challenges. This design uses two widgets and two databases;
it does not request a paid upgrade. Native rate-binding documentation does not
provide a separate price here; verify account plan/billing before activation.

Before enabling production: real preview Turnstile validation and D1 retrieval,
duplicate retry, exact-host denial, owner access, retention/privacy/translation
approval, current quotas and explicit release approval must all be recorded.
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
