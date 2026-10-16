# Internal staff WhatsApp enquiry notifications

Release boundary, 16 October 2026: the owner approved PR #31 merge and its normal
production CI deployment after local validation and independent review, with
both WhatsApp flags remaining false. [PR #31](https://github.com/AxeH666/Incetekh-Energy-Systems/pull/31)
records the final commit, deployment and preservation evidence. No remote
migration, Meta setup, credentials or real message is included in this approval.
Both notification flags are `false` in production and preview configuration;
there is no Cron Trigger. Production lead capture continues independently.

The [component plan](WHATSAPP_LEAD_NOTIFICATIONS_PLAN.md) records scope, the
proposed template, required Incetekh-owned assets and current pricing sources.
This guide describes the implemented behavior and the release procedure to use
only after approval. It is not evidence of a live messaging service.

## Storage and delivery

The form saves its enquiry and returns its existing receipt without contacting
Meta or inserting notification jobs. The additive `0002_whatsapp_notifications.sql`
migration adds a nullable queued marker/index to the lead table and four tables:

| Table                       | Purpose                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `whatsapp_dispatch_control` | One configuration fingerprint, global minute slot, UTC daily attempt budget and hold reason |
| `whatsapp_outbox`           | One job per saved enquiry, current outcome and attempt count                                |
| `whatsapp_attempts`         | Up to five durable attempts per enquiry, provider ID and sanitized outcome evidence         |
| `whatsapp_status_events`    | Deduplicated, normalized signed status facts awaiting or completing reconciliation          |

The original `notification_status = 'not_configured'` column is legacy and is
not delivery state. Use the new tables. No customer fields are copied into the
outbox, attempt or event tables. Provider error messages, raw webhooks, inbound
chat text and full outbound payloads are not stored or logged.

Each scheduled execution reconciles up to five status facts, recovers up to five
abandoned attempts, queues up to five new enquiries and sends at most one attempt.
Only enquiries created on or after the fixed activation timestamp qualify. The
source insert plus receipt/retry behavior is unchanged apart from the privacy
notice version. A migration or Meta outage cannot make a successfully stored
enquiry depend on WhatsApp delivery.

Before sending, the Worker verifies the exact template ID, name, language,
approval and category with Meta. A database batch reserves the attempt and daily
budget before the HTTP request. Concurrent runs share a persisted minute slot.
The only destination is the configured staff number; the customer number is a
template parameter, never the destination.

The receiver accepts signed production-apex webhooks only, checks WABA/sender/
recipient, and correlates the returned message ID or random attempt UUID. It
persists the complete normalized status batch before acknowledgement and drains
five facts at a time. Duplicate and out-of-order delivery/read events cannot
downgrade a successful outcome. Pending status facts block retries for that lead.
Webhooks continue to reconcile while sending is off if their separate flag and
configuration remain enabled. There is no customer reply or public resend API.

## Configuration

Use Cloudflare **runtime** bindings, not public Astro build variables. Never put
secrets in Git, command arguments, PR descriptions or logs. Preview must not
receive production Meta secrets or an enabled send configuration.

| Binding                                           | Requirement                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `LEADS_DB` / `LEAD_CAPTURE_ENV`                   | Existing production D1, migration 0002 applied; environment exactly `production`                                           |
| `WHATSAPP_NOTIFY_ENABLED`                         | Explicit `true` only after controlled send approval; default `false`                                                       |
| `WHATSAPP_WEBHOOK_ENABLED`                        | Separate explicit `true`; required for sending and for receiving later outcomes                                            |
| `WHATSAPP_ACCESS_TOKEN`                           | Runtime secret: Incetekh system-user token with assigned assets and messaging plus template-management scopes              |
| `META_APP_SECRET`                                 | Runtime secret: the app secret used to verify raw-body HMAC-SHA256                                                         |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`                   | Runtime secret: independently generated random value of at least 32 characters, also configured at Meta                    |
| `WHATSAPP_STAFF_NUMBER`                           | Runtime secret: opted-in, authorized staff recipient; international digits, no `+`; different from sender                  |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_WABA_ID`   | Exact registered sender asset and subscribed WABA IDs                                                                      |
| `WHATSAPP_TEMPLATE_ID` / `WHATSAPP_TEMPLATE_NAME` | Exact approved five-body-parameter staff template                                                                          |
| `WHATSAPP_TEMPLATE_LANGUAGE`                      | `en_US` for V1                                                                                                             |
| `WHATSAPP_TEMPLATE_CATEGORY`                      | Exact approved `UTILITY` or `MARKETING`; category/cost must be approved even though content remains an internal alert      |
| `WHATSAPP_GRAPH_VERSION`                          | Supported pinned version in `vNN.0` format, verified during setup; local test version is not production evidence           |
| `WHATSAPP_NOTIFY_FROM`                            | Fixed UTC ISO timestamp with milliseconds, e.g. `YYYY-MM-DDTHH:mm:ss.sssZ`; set once for activation, never reset on deploy |
| `WHATSAPP_DAILY_ATTEMPT_LIMIT`                    | Explicit approved integer 1–100, UTC day; no implicit default                                                              |

The first enabled run records a fingerprint of sender, WABA, recipient, template,
category, language, API version, activation cutoff and attempt limit. Changing
any of these holds the existing backlog rather than redirecting or replaying it.
Credential rotation does not change the fingerprint. Do not delete/reset the
control row to bypass a hold. Review any reconfiguration and queued work together
before a separately approved, narrowly scoped migration of that state.

## Outcomes and safe recovery

| Outcome              | Meaning / action                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pending` / `retry`  | Waiting for its due time, minute slot and daily budget                                                                    |
| `sending`            | Attempt durably reserved; after two minutes without evidence it becomes uncertain                                         |
| `accepted`           | Meta returned a message ID; this is not delivery proof. Held/paused acceptance is recorded separately                     |
| `sent`               | Signed sent event received; delivery is still unconfirmed                                                                 |
| `delivered` / `read` | Signed delivery/read evidence, including evidence for an older attempt                                                    |
| `failed`             | Permanent error or five attempts exhausted; manually follow up from the saved enquiry                                     |
| `uncertain`          | Timeout, lost HTTP/database acknowledgement or malformed response; inspect Meta/status evidence and do not blindly resend |

Only explicit transient provider codes `130429`, `131000`, `131016`, `131056`
retry automatically: after 1, 5, 30 and 120 minutes, at most five total attempts.
Other explicit errors stop that job. Credential, template and selected policy
errors also hold the dispatcher. Invalid or missing configuration sends nothing.
Template metadata failures defer sending. API redirects are not followed.

A timeout may mean Meta accepted the message but its response was lost. V1 has
no automatic resend for that case and does not promise exactly-once WhatsApp
delivery. Signed callbacks can still resolve the uncertain attempt using its
UUID. Saved leads remain the source of truth; use the existing twice-daily manual
enquiry review and normal follow-up when alerts are delayed or uncertain.

The daily budget counts reserved attempts conservatively, including a crash
before a send or an ambiguous outcome. Exhaustion delays alerts until the next
UTC day; it does not disable intake. At one attempt/minute, capacity is at most
60 attempts/hour and the configured daily ceiling. Five-item work batches keep
the scheduled path within the Free plan's 50 D1 queries/invocation (at most 48
statements including a provider hold). See [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
This is a code bound, not a measurement of production CPU or quota headroom.
Account quotas are shared: inspect live CPU, rows read/written and storage during
an approved release; do not silently buy capacity or increase this budget.

## Read-only operational checks

Run through an authenticated operator session against the explicitly selected
database. These queries contain no customer names, phones or message bodies.
Do not publish their results or message/attempt IDs publicly.

```sql
SELECT state, COUNT(*) AS jobs FROM whatsapp_outbox GROUP BY state;
SELECT budget_day, attempts_today, halt_reason, next_dispatch_at
FROM whatsapp_dispatch_control WHERE id = 1;
SELECT COUNT(*) AS pending_status_facts FROM whatsapp_status_events
WHERE processed_at IS NULL;
SELECT o.lead_id, o.state, o.attempt_count, a.state AS attempt_state,
       a.http_status, a.error_code, a.acceptance_status,
       a.accepted_at, a.sent_at, a.delivered_at, a.read_at
FROM whatsapp_outbox o LEFT JOIN whatsapp_attempts a ON a.id = o.active_attempt_id
WHERE o.state IN ('failed', 'uncertain', 'sending')
ORDER BY o.updated_at LIMIT 20;
```

The founder owns recipient access/opt-in, token expiry and twice-daily fallback
checks until an actual staff owner is designated. Follow the existing enquiry
retention policy; notification rows are linked to the lead and need explicit
child-first handling in an approved deletion. This component does not add a
destructive cleanup job. Restrict staff device access and review/remove enquiry
messages when their business purpose ends; deleting D1 data does not delete a
message already delivered to WhatsApp. Record the staff-device retention process
before activation. All six public privacy notices now conditionally explain the
data shared with Meta for these internal alerts; no customer marketing consent
is inferred from a site-visit submission.

## Controlled release gates

1. Local validation and independent review passed. The owner approved publishing
   the PR and its automatic Cloudflare preview on 16 October 2026. Keep preview
   sending/webhooks disabled and exclude production Meta credentials.
   The owner subsequently approved merge/production deployment with both flags
   false. No migration, Meta configuration or outbound send accompanies it.
2. Verify the Incetekh-owned Meta assets, staff opt-in, sender/recipient separation,
   exact approved template/category, currency, price and explicit attempt budget.
   Approve costs before any actual message, including synthetic messages.
3. After the appropriate environment approval, record a D1 recovery bookmark and
   schema/count baseline, apply only migration 0002, and verify old rows and
   lead capture remain intact. Never recreate the database or rerun setup 0001.
4. Deploy notification code disabled and verify all existing website/form paths.
   Configure runtime secrets privately. Enable the webhook separately, verify
   its handshake, app/WABA subscription and signed test outcomes. Keep sending
   disabled until these checks and the public privacy disclosure are live.
5. Set the fixed activation cutoff and approved configuration. With separate
   controlled-send approval, add a one-minute Cron Trigger and enable sending for
   one synthetic new enquiry. Check one source row, one job, intended recipient,
   Meta acceptance and signed delivered/read evidence. An accepted API response
   alone does not establish readiness. Check duplicate submission/reconciliation
   without sending a second message, and record quota/CPU usage.
6. Approve ongoing operation only after that evidence, staff ownership and costs
   are accepted. Retain the manual fallback and use a conservative daily cap.

Rollback: set `WHATSAPP_NOTIFY_ENABLED=false`; preserve webhook processing while
outstanding statuses reconcile. Keep the source leads, schema, attempts and
status history. If the whole Worker must roll back, use the recorded pre-release
version; never down-migrate or remove accepted data. Sending can remain off
without affecting the production form. Re-enabling the same configuration does
not replay delivered/accepted/uncertain jobs.

## Validation evidence and limits

### Step 2 readiness after the disabled release

The code release makes the production callback route available, but it must return
503 while `WHATSAPP_WEBHOOK_ENABLED=false`. Meta verification is not expected to
pass in this state. Later, separately approved webhook configuration requires:

- Exact callback `https://incetekhenergy.com/api/whatsapp/webhook`.
- `WHATSAPP_WEBHOOK_ENABLED=true` while keeping `WHATSAPP_NOTIFY_ENABLED=false`.
- The existing production `LEADS_DB` binding and `LEAD_CAPTURE_ENV=production`.
- Correct Incetekh `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_WABA_ID`.
- Runtime secrets `META_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (at least 32
  characters; **not** `META_WEBHOOK_VERIFY_TOKEN`) and `WHATSAPP_STAFF_NUMBER`
  (international digits without `+`). Do not print their values.
- Meta's `messages` webhook field and app subscription to that WABA for delivery
  statuses. No customer-message/reply flow is implemented.

The GET handshake does not query D1 or need a sending token, template or Cron
Trigger. Migration `0002` is still separately required before processing status
POSTs; it is deliberately not applied by this disabled release. No notification
jobs can be created with the flags off and no scheduler installed. Keep manual
enquiry review until the later controlled messaging activation is verified.

### Local implementation checks

Local tests use real Miniflare/workerd D1 with synthetic credentials and a fake
Meta/Turnstile service. They make no real provider request or WhatsApp send.
They cover concurrency, duplicate enquiry receipts, immutable saved fields,
transient/permanent errors, budget exhaustion, template changes, preview and
missing-config isolation, signed/forged/out-of-order/early/batched webhooks,
ambiguous sends, and injected database failures before/after send and at webhook
persistence. The original intake suite still runs without migration 0002.

Verified locally on 16 October 2026 using Node 22.23.3 and Chrome with the local
Wrangler server: `npm run verify` passed formatting, Astro/TypeScript checks
(zero errors/warnings), the production build, all 56 Worker tests and all 127
browser tests. English desktop and Hindi mobile screenshots were also inspected;
the added notice is readable with no horizontal overflow. The six-language
privacy tests passed at mobile and desktop widths. Logs/screenshots remain in
ignored `.wrangler/whatsapp-*` files.

An independent read-only review found no blocking correctness/security issues.
Its documentation finding about foreign-key deletion order is addressed here
and in the production activation guide. `git diff --check` passes. No source
changes were made after that review; documentation was completed afterward.

Local results do not prove Meta account eligibility, template approval,
real-device delivery, production CPU headroom or billing. Those remain controlled
release evidence, and no active notification service is claimed.
