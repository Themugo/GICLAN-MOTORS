# KAYAD Communications Provider & Launch Rollout — Complete

## Canonical provider ownership
- Email: Resend
- Kenya SMS/OTP: Africa's Talking
- WhatsApp: Twilio WhatsApp
- In-app: existing KAYAD Socket.IO/Supabase path
- Delivery ledger: `communication_deliveries`

No business workflow is allowed to select SendGrid, SMTP, Twilio SMS, or another email/SMS provider. Provider calls live only in the canonical adapters.

## Launch controls
Two database-backed control layers now govern outbound traffic:

1. `communication_channel_controls` — master switch for email, SMS, WhatsApp.
2. `communication_event_controls` — per-event/per-channel switch.

The admin Communications screen now has Email / Kenya SMS / WhatsApp tabs. Each tab shows its canonical provider, master switch, and every communication event with an individual enable/disable control.

The launch migration intentionally starts with:
- Email master: ON
- SMS master: ON
- WhatsApp master: OFF
- Email events enabled initially: registration, email verification, password reset, dealer submitted/verified, dealer subscription activation, support created/updated, security alert.
- SMS events enabled initially: phone verification and security alert.
- Auction, bidding, payment, escrow, inspection, dispute, saved-search and reminder outbound email/SMS events remain OFF until the admin enables them.
- All WhatsApp events remain OFF.

This allows KAYAD to populate the marketplace first without paying for communications that are not yet commercially required.

## Provider callbacks
- Resend: signed Svix webhook verification using `svix-id`, `svix-timestamp`, `svix-signature` and a raw request body.
- Twilio WhatsApp: Twilio signature verification with shared-secret fallback for controlled migration/testing.
- Africa's Talking: canonical callback reconciliation through the communication ledger.

## Retry/reconciliation
Failed deliveries retain the original delivery ID and are retried through the canonical gateway. Provider callbacks reconcile the same ledger row instead of creating duplicate delivery records.

## Live certification status
The certification runner is:

`npm run validate:communications:providers`

It defaults to `PROVIDER_CERT_CHANNELS=email,sms` because those are the launch channels. WhatsApp can be certified later with:

`PROVIDER_CERT_CHANNELS=email,sms,whatsapp`

Live certification requires provider secrets plus `PROVIDER_CERT_EMAIL` and/or `PROVIDER_CERT_PHONE`. Those real credentials are not available in this build runtime, so no outbound provider message was falsely claimed as sent.

## Verification
- Communication cleanup/provider architecture: PASS
- Communication event convergence: 12/12 PASS
- OTP/provider architecture: 20/20 PASS
- Communications initiative: PASS
- Production rollout-control migration: applied and verified in Supabase
- Existing unrelated support lifecycle validator failures remain: atomic support message and ticket access guard. They pre-date this provider initiative and were not altered or falsely marked fixed.
