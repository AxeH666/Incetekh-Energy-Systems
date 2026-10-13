# Business email: current status and preparation

As of 13 October 2026, **incetekhenergy@gmail.com** is the owner-confirmed
public enquiry and administrative address. The contact-correctness release uses
it throughout all six website languages, including complaint links. This is not
proof of the login/recovery address on each service or a delivery test.

The earlier infrastructure audit found the invalid `support@incetekh.com` on
the website and NXDOMAIN for its domain through two public resolvers. The owner
has explicitly replaced it with Gmail. Do not reintroduce the old address.
The release PR records post-merge live verification; no email was sent by the audit.

For `incetekhenergy.com`, public DNS has no MX or apex TXT/SPF answers and no DMARC
record. DKIM provider/selectors and any purchased mailbox subscription are unknown.
`info@incetekhenergy.com` and a possible support mailbox remain proposals, not
operational addresses. DNS is authoritative at Cloudflare; enter future approved
mail records there even if Hostinger supplies the mailboxes. See
[INFRASTRUCTURE.md](INFRASTRUCTURE.md) for evidence and remaining dashboard checks.

## Historical contact decision

The 30 September 2026 instruction to publish `support@incetekh.com` is superseded
by the owner's 13 October confirmation above. Professional email setup remains
a separate component. No account was purchased, DNS changed or email sent.

## Decisions needed from the owner

Choose the provider and budget, named mailbox owners, the confirmed public address,
any aliases/shared mailbox, and account recovery administrator. Confirm who
already sends mail for this domain and who controls its DNS. The current address was explicitly requested by the founder; do not treat its display as delivery verification.

## Setup after approval

Inspect and preserve existing DNS first. Use the selected provider's exact
verification and MX records. Configure SPF for the approved sending services,
enable provider-issued DKIM signing and configure a DMARC policy/reporting
destination appropriate to the verified senders. Do not paste generic DNS
values or store passwords/private signing keys in this repository.

SPF identifies authorized senders, DKIM signs messages, and DMARC checks sender
domain alignment and declares handling/reporting policy. These controls work
together; use the provider's current instructions and verify the resulting
message headers. [Microsoft's authentication overview](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
explains the relationship; it is a reference, not a provider selection.

## Acceptance and website update

- Enable MFA and confirm recovery access for the account owners.
- Test inbound and outbound messages with at least two external mail providers,
  including replies and the chosen aliases/shared mailbox where applicable.
- Inspect received message headers for SPF, DKIM and DMARC results; investigate
  failures before calling setup complete. Check inbox and spam placement.
- Record DNS values, ownership and recovery procedure securely outside the repo.
- Confirm the displayed address matches the configured mailbox; update privacy information if handling changes.

No website form backend, SMTP credentials or business automation is needed for
the current phone-first website.
