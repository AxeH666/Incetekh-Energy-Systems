# Site-visit email notifications

## Status and provider decision — 17 October 2026

PR #33 was independently reviewed, merged as `bed13d2`, and deployed with email
disabled. Its additive migration and production secret are installed. The owner
has now approved activation and one controlled synthetic enquiry/email test.
The activation configuration uses `EMAIL_NOTIFY_ENABLED=true`, the fixed cutoff
`EMAIL_NOTIFY_SINCE=2026-10-17T10:26:08.400Z` (15:56:08.400 IST), and Cron Trigger
`*/5 * * * *`. Only enquiries saved at or after this cutoff are eligible; the two
existing enquiries are excluded. Keep the cutoff unchanged across deployments,
pauses and restarts. Preview email remains disabled. The activation PR records
the live deployment and controlled acceptance evidence; configuration alone is
not proof of inbox delivery.

Eligible enquiries are emailed to `info@incetekhenergy.com`. The public contact address
remains the owner's confirmed `incetekhenergy@gmail.com`; changing it is separate.
The two disabled WhatsApp variables are untouched.

Confirmed through public DNS on 17 October:

- Apex MX: `mx1.hostinger.com` priority 5 and `mx2.hostinger.com` priority 10.
- Apex SPF: `v=spf1 include:_spf.mail.hostinger.com ~all`.
- `hostingermail-a/b/c._domainkey` CNAMEs point to Hostinger DKIM hosts.
- `_dmarc.incetekhenergy.com`: `v=DMARC1; p=none`.

The owner confirms Resend domain `notify.incetekhenergy.com` is Verified and a
sending-only, domain-restricted key is installed. The production
`RESEND_API_KEY` secret's name/type was independently verified without reading
its value. Public DNS also confirms Resend DKIM at
`resend._domainkey.notify.incetekhenergy.com` and return-path DNS at
`send.notify.incetekhenergy.com`. Delivery is checked with the one approved test,
with mailbox-owner assistance; see the activation PR for its result. Older
repository observations that the domain had no mail records are superseded.

The owner states Workers Free. Cloudflare's API confirmed a Free **website zone**,
but subscription and email settings reads returned 403 with the available token;
the Workers subscription and email onboarding state remain independently unverified.
A zone plan does not establish the Workers plan.

Cloudflare Email Service was evaluated first. Verified-destination sends are free
on all plans, but the sender must be a routing domain. Routing subdomains are
documented; safe subdomain-only onboarding while retaining Hostinger apex MX was
not established from the available account access/documentation. The reviewed
Workers and REST send interfaces do not document application idempotency for a
timeout after possible acceptance. Cloudflare is not ruled out for being on Free.
[Pricing](https://developers.cloudflare.com/email-service/platform/pricing/),
[limits](https://developers.cloudflare.com/email-service/platform/limits/),
[subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/),
[Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).

**Resend is selected** for its documented 24-hour send idempotency and separate
sending-subdomain setup. Its published Free allowance is 100 emails/day and
3,000/month. Domain verification and key scope are owner-confirmed; DNS and
the production secret binding were checked independently.
No paid tier, receiving service or automatic upgrade is needed or authorized.
Monitor the existing Free account's usage and confirm the controlled inbox test. Exceeding
the free quota delays or holds notifications; the enquiry stays in D1. Acceptance
by an API does not prove delivery to the mailbox.
[Pricing](https://resend.com/pricing),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[sending domains](https://resend.com/docs/dashboard/domains/introduction).

## Implementation and limits

Privacy notice version `2026-10-17.1` identifies the new conditional disclosure
in all six languages; existing receipt retries retain their stored notice version.
The form still validates Turnstile, rate limits, saves the lead, and returns its
receipt. After a new row is committed, `ctx.waitUntil()` starts a background
email dispatch for that specific lead immediately. Email work does not delay or
change the successful receipt. Identical receipt retries use the existing row
and never start another notification.

The scheduled handler discovers up to ten committed leads per run using an
indexed `email_enqueued = 0` marker and an explicit UTC activation cutoff. A D1
transaction inserts the frozen email payload under a unique lead ID and marks
the lead queued. Failed transactions leave it eligible for repair next run.
Migration `0002_site_visit_email.sql` is additive; existing customer fields,
receipts and applied migration `0001` are preserved. It was applied during the
approved PR #33 release after a verified recovery snapshot and in-memory
migration rehearsal. Both existing enquiries survived unchanged. The legacy
`notification_status` column stays inert; use the new outbox.

One email is attempted per invocation with an atomic two-minute lease shared by
the immediate and scheduled paths. New leads do not wait for the five-minute
schedule or older queued enquiries. The schedule remains a recovery path for
missed or failed immediate attempts. Provider processing, throttling and inbox
filtering can still delay delivery; immediate dispatch is not an inbox guarantee.
This uses the existing Worker and D1, with no new binding, dependency or schema.
The existing ten-second provider timeout fits within Cloudflare's thirty-second
background execution window; interruption leaves the saved lead/outbox recoverable.
See [Cloudflare waitUntil](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil).

- Sender: `Incetekh Energy <site-visits@notify.incetekhenergy.com>`.
- Fixed recipient: `info@incetekhenergy.com`; customers are not emailed.
- Plain text includes reference, UTC time, name, normalized phone, optional
  email, location, plan and language. Customer data never controls headers.
- The exact JSON payload and `site-visit/<lead-id>` key are reused after errors,
  restarts or an accepted email whose D1 acknowledgement was lost.
- Transient failures retry after 5, 10, 20, 40 and then 60 minutes; a longer
  provider `Retry-After` is respected. Scheduling can add up to five minutes.
- Permanent 4xx errors enter `failed`. 408, 429 and Resend's concurrent-request
  409 retry; a payload-conflict 409 is held. Provider bodies are not logged.
- Automatic retries stop after 23 hours from the first reserved attempt,
  conservatively inside Resend's 24-hour window. Expired entries become
  `uncertain` on a due run. Long outages and quota exhaustion can require manual
  reconciliation. This is not unlimited exactly-once delivery.
- `accepted` means Resend returned an email ID, not confirmed inbox delivery.
  Check bounces/spam/delivery in Resend and the Hostinger inbox.

Historical enquiries before the cutoff are never queued. Leads saved after the
cutoff during a temporary pause remain eligible on resume. Do not move the
cutoff, switch Resend accounts, delete outbox rows or reset attempted entries
to force a resend: that can bypass deduplication. Key rotation must stay within
the same provider account. Disabling cannot recall an email already in flight.

## Setup and release record

The owner completed Resend setup and secret installation, approved the migration
and disabled PR #33 release, then separately approved activation and one test.
The steps below record that sequence. Do not repeat setup, recreate keys, reapply
migrations or change DNS. No paid change or additional service is authorized.

1. Confirm access to the existing Hostinger mailbox and Cloudflare DNS zone.
   Verify Workers Free and D1 usage in the account dashboard; do not upgrade.
2. Use a Resend **Free** account. Add `notify.incetekhenergy.com` as a sending
   domain; leave receiving disabled. Add only the exact verification/DKIM and
   return-path SPF/MX records issued by Resend for this subdomain in Cloudflare
   DNS. Values cannot be known before Resend issues them. Do not replace apex
   MX/SPF, Hostinger DKIM or existing DMARC. Verify the domain and Free quota.
3. Create a sending-only API key restricted to that domain. After authorization,
   add it as production Worker secret `RESEND_API_KEY` with
   `npx wrangler secret put RESEND_API_KEY`. Never put the value in Git, shell
   arguments or public build variables. Do not add it to previews.
4. Approve the reviewed PR/release. Confirm the migration target is
   `incetekh-site-visits-prod` with only `0001` already applied. Preserve a D1
   recovery/export point under existing access controls. Only after approval,
   run `npx wrangler d1 migrations apply LEADS_DB --remote` for the additive
   migration. Deploy the reviewed commit with email disabled. Check existing
   receipts, D1 counts and website; preserve both false WhatsApp flags.
5. For the now-approved activation, use the fixed cutoff above for
   `EMAIL_NOTIFY_SINCE`, set
   `EMAIL_NOTIFY_ENABLED=true`, and add production Cron Trigger `*/5 * * * *`.
   Keep these non-secret values in approved deployable configuration so later
   deployments preserve them. Previews stay disabled without a schedule. Allow
   trigger configuration to propagate before verification.
6. Submit one approved synthetic lead through real Turnstile. Confirm the
   receipt, one D1 lead, one `accepted` outbox row and matching Resend ID.
   Confirm arrival in Hostinger, correct details, SPF/DKIM/DMARC results and
   spam placement. Retry the same receipt and verify the outbox/provider ID and
   attempt count stay unchanged after a later scheduled run. Do not submit a
   second enquiry to troubleshoot delivery. Check Resend history and the
   Hostinger spam folder against the same reference if delivery is uncertain.
   Record receipt, D1/outbox and mailbox results in the activation PR.

## Operations, recovery and privacy

Continue the existing manual D1 enquiry checks until delivery is validated and
whenever notifications are paused/unhealthy. Check Resend bounces/rejections and
Hostinger spam. Scheduled exceptions expose only `site_visit_email_dispatch_failed`.
During the daily enquiry review, inspect Worker failures and this read-only query:

```sql
SELECT status, count(*) AS total, min(updated_at) AS oldest_update_ms
FROM site_visit_email_outbox GROUP BY status;
```

For an affected reference, inspect only `lead_id`, `status`, `attempts`,
`first_attempt_at`, `next_attempt_at`, `provider_id` and `last_code` first.
Do not export payloads into logs/tickets. Pending leases recover automatically.
For `failed`/`uncertain`, reconcile Resend history and the mailbox by reference
before any manual action. Follow up from the saved enquiry when needed. Never
blindly reset/replay uncertain sends after 23 hours. If quota is exhausted,
preserve records and follow up manually; paid activation needs a separate decision.

To pause, set `EMAIL_NOTIFY_ENABLED=false`, preserving it in the next approved
deployment. Remove the schedule only with release authorization. Do not delete
D1 data, applied migrations, outbox history or Hostinger records for rollback. An older Worker
remains compatible with the additive schema. Do not change capture or Turnstile
to work around notification failures.

Keep the fixed activation cutoff on pause/resume. Cron changes can take up to
15 minutes to propagate; wait for the actual scheduled run rather than adding
manual sends. Check the Worker deployment/build result and scheduled outcomes.
An accepted outbox row proves provider acceptance, not mailbox delivery.
[Cloudflare Cron behavior](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

Outbox payloads, provider records and Hostinger mailbox copies contain customer
details. Apply the access, correction/deletion and retention policy in
[PRODUCTION_LEAD_ACTIVATION.md](PRODUCTION_LEAD_ACTIVATION.md) to these copies too.
Include all copies in approved retention reviews; no purge is installed. Restrict
provider/mailbox access and enable MFA. The public privacy notice describes
internal email processing conditionally. Customer details, credentials and raw
provider errors are never logged.

For an approved privacy/retention deletion, pause the dispatcher first and wait
for in-flight immediate and scheduled invocations to finish. Verify no active sends remain.
Delete only the approved references' outbox rows **before** their lead rows in
one D1 transaction/batch with bound IDs; the foreign key intentionally blocks
parent-only deletion. Confirm both copies are gone and unrelated leads remain.
Include Resend and Hostinger copies in the approved deletion procedure, subject
to applicable retention requirements. Never delete just an outbox row or reset
the queue marker to resend. For corrections, pause sending and reconcile any
already attempted notification first: editing a frozen attempted payload would
break retry idempotency. No production deletion is performed by this component.
