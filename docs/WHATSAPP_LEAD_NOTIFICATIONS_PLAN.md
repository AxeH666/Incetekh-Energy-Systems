# Staff WhatsApp enquiry notifications — V1 plan

Planning baseline: 15 October 2026, `main` at `0b82d8b` (merged PR #30).
Branch: `feat/whatsapp-lead-notifications`. This is the next single component;
the earlier scope exclusion has an explicit owner-authorized exception.

## Current evidence and boundaries

- Confirmed in source: `/api/site-visits` validates origin, rate limit and
  Turnstile, inserts a lead using its unique receipt ID, then returns success.
  Matching retries return the existing receipt; changed payloads return 409.
- Production acceptance was verified and recorded in PR #30. This planning step
  does not repeat production writes or preview setup.
- `site_visit_leads.notification_status` has a CHECK allowing only
  `not_configured`. Preserve that legacy column; new notification tables will
  hold the authoritative delivery state. Do not rebuild the accepted-lead table.
- There is no scheduler, outbound Meta integration or status webhook in the
  current Worker. Existing Miniflare tests run real local D1 with mocked outbound
  requests, which is suitable for this component.
- Unknown: Incetekh-owned Meta portfolio/app/WABA, registered sender, staff
  recipient and opt-in, billing currency/payment method, approved template and
  account-specific access restrictions. Do not borrow another project's assets
  or assume the public customer-contact number is the sender or recipient.
- Deployment, messages (including test messages), paid resources and production
  changes are not approved. Git pushes currently create Cloudflare previews;
  keep work local until a verified no-deploy publishing route or deployment
  approval exists. Do not assume Pages' skip-CI flags apply to Workers Builds.

## Small implementation plan

1. **Keep lead acceptance independent.** Leave the existing save/receipt path
   unchanged. Add an optional queued marker and partial index to the lead table,
   plus separate outbox and attempt tables through one additive D1 migration.
   An indexed scheduled sweep materializes one outbox item per saved lead and
   marks it queued in one D1 batch. A unique lead ID prevents duplicate jobs.
   If the sweep fails, the already-saved lead remains available for the next run.
   Use a fixed activation timestamp to exclude historical/test enquiries; never
   silently backfill existing leads or discard queued leads after an outage.
2. **Send from the existing Worker.** Add a `scheduled` handler, initially with
   sending disabled and no deployed Cron Trigger. After approval, a one-minute
   trigger claims at most one due item using a database lease. Reserve an attempt
   before calling Meta. Configure one staff recipient on the server; never use a
   customer's submitted number as `to`. Pin an explicitly supported Graph API
   version at setup, and send only the approved template and language.
3. **Track and retry conservatively.** Record attempt ID, times, attempt count,
   next retry, sanitized provider code and returned message ID. Distinguish
   pending, in-flight, API-accepted, sent, delivered, read, retryable failure,
   permanent failure and uncertain outcome. An API 200 is not delivery proof.
   Retry documented transient rejections with bounded backoff (proposed 1, 5,
   30 and 120 minutes; five total attempts). Stop on credentials, template,
   policy or recipient errors. A timeout, malformed success response, crash
   after sending or lost database acknowledgement is uncertain: reconcile
   webhooks before any operator-approved resend. Do not promise exactly-once
   WhatsApp delivery; no documented send idempotency guarantee was verified.
4. **Receive delivery evidence securely.** Add `/api/whatsapp/webhook` on the
   same Worker: GET verification-token handshake and POST raw-body
   `X-Hub-Signature-256` validation using the app secret. Validate WABA, sender
   ID and recipient against configuration. Correlate by message ID and a random
   attempt ID in `biz_opaque_callback_data` (not customer data). Persist bounded
   status facts idempotently, tolerate out-of-order events and an event arriving
   before the send response, and never downgrade delivered/read on a late
   failure. Ignore inbound message content and send no automated replies.
   Return non-200 on persistence failure so Meta can retry the webhook.
5. **Validate and release separately.** Local tests cover storage during Meta
   outage, missing notification configuration/schema, concurrent dispatch,
   duplicate form submissions, definite failures, ambiguous outcomes, retry
   exhaustion, duplicate/forged/out-of-order webhooks and disabled-preview
   isolation. Run existing regression checks and review the diff independently.
   Prepare the single PR only when internally complete. After explicit approval:
   apply the additive migration, configure secrets/template/webhook, deploy
   disabled, then enable for one controlled synthetic staff notification before
   ongoing activation. Rollback disables only sending and preserves leads and
   attempt history. No schema down-migration or data deletion.

At one send attempt per minute, initial capacity is 60 attempts/hour; bursts and
retries wait durably. Add a persisted daily attempt ceiling before activation
(proposed 100, to be approved with the budget). Exhaustion delays notifications,
never intake. Keep the current twice-daily manual enquiry check as fallback.
Bound sweep batches and index queries to avoid consuming shared D1 capacity.

## Exact Meta setup required before activation

| Item               | Required setup / evidence                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business ownership | Incetekh-controlled Meta business portfolio, developer app with WhatsApp use case, and WABA/Messaging account. Record IDs and owner; finish any verification/access steps the account actually requires.                                                                                                                                             |
| Sender             | A registered Cloud API business number with approved display name, SMS/voice ownership verification and two-step registration PIN. It must differ from the staff recipient. Prefer an already eligible dedicated sender; any number purchase, migration or Business App coexistence setup needs separate approval.                                   |
| Staff recipient    | One confirmed WhatsApp number in international format and documented permission to receive these internal alerts. Honour opt-out by disabling sending/changing the approved recipient, not by messaging customers.                                                                                                                                   |
| Access             | Incetekh-owned system-user token with assigned app/WABA assets. Sending requires `whatsapp_business_messaging`; template/account management uses `whatsapp_business_management`; portfolio administration may require `business_management`. Keep administrative access out of the runtime token where possible. Record expiry/revocation ownership. |
| Template           | Submit the concrete staff-alert template with synthetic parameter examples and `en_US`; wait for `APPROVED` and inspect the actual category. Request utility review, but do not claim internal messages automatically qualify. A reclassification or paused/rejected template holds sending until reviewed.                                          |
| Webhooks           | Public HTTPS callback at `https://incetekhenergy.com/api/whatsapp/webhook`, verify token, `messages` subscription, and app subscription to the WABA. Retain delivery outcomes when provided; read receipts are not guaranteed.                                                                                                                       |
| Billing            | Verify sold-to country, account currency and payment method. For eligible India businesses, use INR; Meta requires migration of non-INR accounts by 31 December 2026. No payment method, subscription or real message will be activated without approval.                                                                                            |

Proposed template (not submitted or approved):

> Incetekh staff alert: a new website enquiry has been saved. Reference: {{1}}.
> Name: {{2}}. Phone: {{3}}. Area: {{4}}. Requested service: {{5}}.
> Please review this enquiry and follow up through the normal staff process.

Use only receipt, name, phone, bounded area/location and selected service; omit
email and security/IP data. Staff must be authorized to handle enquiry data.
Before enabling this sharing, update the public privacy notice in all six
languages to explain internal notifications through Meta/WhatsApp, and document
staff-device access/retention. Keep full payloads, webhook bodies, tokens and
message content out of logs. Template samples must contain synthetic data only.

Proposed Cloudflare runtime secrets: `WHATSAPP_ACCESS_TOKEN`, `META_APP_SECRET`,
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_STAFF_NUMBER`. Non-secret runtime
configuration: sender phone-number ID, WABA ID, approved template name/language,
pinned Graph version, explicit activation timestamp and `WHATSAPP_NOTIFY_ENABLED`.
Preview sending remains disabled, without production Meta credentials.

## Costs verified on 15 October 2026

Meta's current developer pricing page and linked INR list-rate file are effective
**1 October 2026**. For an Indian recipient, list rates per delivered message are:

| Meta category                 | Per delivered message | 100 deliveries | 1,000 deliveries |
| ----------------------------- | --------------------: | -------------: | ---------------: |
| Utility, if approved          |            INR 0.1150 |      INR 11.50 |       INR 115.00 |
| Marketing, if Meta assigns it |            INR 0.8631 |      INR 86.31 |       INR 863.10 |

These exclude applicable GST/taxes and number/connectivity costs. Recipient
country, account billing currency, actual approved category and any volume tier
determine the invoice. Retried attempts that cause another delivered message can
add cost. No BSP subscription is needed for the proposed direct integration.
The site form does not open a WhatsApp service window with staff: use the approved
template for every alert. Do not budget unlimited free service or in-window
utility messages: the current pricing page supersedes older marketing-page copy.

Reuse Workers/D1; no new paid service is proposed. Cron is an existing Worker
feature. One-minute polling adds about 1,440 scheduled executions/day plus D1
queries, sends and webhook requests. Free D1 includes 5 million rows read and
100,000 rows written/day; shared quotas, indexes and storage still matter. Test
CPU/row usage, inspect account headroom before release and do not upgrade a plan
automatically. A provider outage may delay notifications; it must not consume the
entire shared database allowance or change accepted lead data.

## Primary sources and verification notes

Meta developer pages returned 429 through the search browser, but direct HTTPS
GETs of the official pages and their Markdown variants succeeded. The October
INR rate card was downloaded from Meta's own linked CDN and its India row read;
older third-party pricing summaries were not used as authority. Public research
captures are kept locally under ignored `.wrangler/meta-*`; no credentials or
customer data were used in research.

- [Meta Cloud API get started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)
- [System-user tokens](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens)
- [Messaging policy: opt-in and templates](https://whatsappbusiness.com/policy/)
- [Template category criteria](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization)
- [Current pricing and linked rate cards](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing#rate-cards-and-volume-tiers)
- [Meta pricing FAQ](https://whatsappbusiness.com/resources/faq/)
- [Messages API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api)
- [Webhook handshake and signatures](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint)
- [Message statuses and callback correlation](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status)
- [Webhook retry policy](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- [Provider error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers preview builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)

Planning checkpoint: source and provider research complete; implementation and
local fault tests next. No PR has been pushed, no account setup performed, no
message sent and no deployment/production change made by this component.
