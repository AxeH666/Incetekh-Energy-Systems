# Business email: preparation only

No mailbox exists yet according to the founder. No provider has been chosen,
account purchased, DNS changed or email sent. Website enquiries currently use
the confirmed phone number. Email setup is a separate, approval-dependent task.

## Decisions needed from the owner

Choose the provider and budget, named mailbox owners, public enquiry address,
any aliases/shared mailbox, and account recovery administrator. Confirm who
already sends mail for this domain and who controls its DNS. Do not publish a
suggested address until it exists and has passed send/receive tests.

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
- Add the verified address to site data, contact/footer markup and structured
  data in one focused follow-up PR; update privacy information if handling changes.

No website form backend, SMTP credentials or business automation is needed for
the current phone-first website.
