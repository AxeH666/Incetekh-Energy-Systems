# Site-visit email notifications

## Status and provider decision — 17 October 2026

Implemented for review, **disabled and not deployed**. Only new eligible D1
enquiries will be emailed to `info@incetekhenergy.com`. The public contact address
remains the owner's confirmed `incetekhenergy@gmail.com`; changing it is separate.
The two disabled WhatsApp variables are untouched.

Confirmed through public DNS on 17 October:

- Apex MX: `mx1.hostinger.com` priority 5 and `mx2.hostinger.com` priority 10.
- Apex SPF: `v=spf1 include:_spf.mail.hostinger.com ~all`.
- `hostingermail-a/b/c._domainkey` CNAMEs point to Hostinger DKIM hosts.
- `_dmarc.incetekhenergy.com`: `v=DMARC1; p=none`.

The owner identifies the existing Hostinger mailbox. Mailbox access, inbound
delivery and spam placement have not been tested in this component. Older
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
3,000/month. A Free account/domain/API key has not been provisioned or verified.
No paid tier, receiving service or automatic upgrade is needed or authorized.
Account quota/plan and inbox delivery must be checked before enabling. Exceeding
the free quota delays or holds notifications; the enquiry stays in D1. Acceptance
by an API does not prove delivery to the mailbox.
[Pricing](https://resend.com/pricing),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[sending domains](https://resend.com/docs/dashboard/domains/introduction).

## Implementation and limits

Privacy notice version `2026-10-17.1` identifies the new conditional disclosure
in all six languages; existing receipt retries retain their stored notice version.
The form still validates Turnstile, rate limits, saves the lead, and returns its
receipt. It makes no email calls or queue writes. Identical receipt retries use
the existing row and never generate another notification.

The scheduled handler discovers up to ten committed leads per run using an
indexed `email_enqueued = 0` marker and an explicit UTC activation cutoff. A D1
transaction inserts the frozen email payload under a unique lead ID and marks
the lead queued. Failed transactions leave it eligible for repair next run.
Migration `0002_site_visit_email.sql` is additive; existing customer fields,
receipts and applied migration `0001` are preserved. It has not been applied
remotely. The legacy `notification_status` column stays inert; use the new outbox.

One email is attempted per run with an atomic two-minute lease. A future
five-minute schedule yields a normal queue-free delay of up to five minutes,
plus provider delivery time. Bursts wait in D1. This uses the existing Worker
and D1, with no new service binding or package dependency.

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

## Exact external setup and release steps (approval required)

No account creation, DNS change, secret upload, migration, real email, merge or
production deployment is authorized by this implementation PR.

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
5. For separately approved activation, set `EMAIL_NOTIFY_SINCE` to the agreed
   activation instant in exact UTC format `YYYY-MM-DDTHH:mm:ss.sssZ`, set
   `EMAIL_NOTIFY_ENABLED=true`, and add production Cron Trigger `*/5 * * * *`.
   Keep these non-secret values in approved deployable configuration so later
   deployments preserve them. Previews stay disabled without a schedule. Allow
   trigger configuration to propagate before verification.
6. Submit one approved synthetic lead through real Turnstile. Confirm the
   receipt, one D1 lead, one `accepted` outbox row and matching Resend ID.
   Confirm arrival in Hostinger, correct details, SPF/DKIM/DMARC results and
   spam placement. Retry the receipt and verify no second email. No real email
   test was performed during this PR.

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

Outbox payloads, provider records and Hostinger mailbox copies contain customer
details. Apply the access, correction/deletion and retention policy in
[PRODUCTION_LEAD_ACTIVATION.md](PRODUCTION_LEAD_ACTIVATION.md) to these copies too.
Include all copies in approved retention reviews; no purge is installed. Restrict
provider/mailbox access and enable MFA. The public privacy notice describes
internal email processing conditionally. Customer details, credentials and raw
provider errors are never logged.

For an approved privacy/retention deletion, pause the dispatcher first and wait
for in-flight scheduled invocations to finish. Verify no active sends remain.
Delete only the approved references' outbox rows **before** their lead rows in
one D1 transaction/batch with bound IDs; the foreign key intentionally blocks
parent-only deletion. Confirm both copies are gone and unrelated leads remain.
Include Resend and Hostinger copies in the approved deletion procedure, subject
to applicable retention requirements. Never delete just an outbox row or reset
the queue marker to resend. For corrections, pause sending and reconcile any
already attempted notification first: editing a frozen attempted payload would
break retry idempotency. No production deletion is performed by this component.
