# KAYAD Communications + OTP — End-to-End Completion

## Canonical path
Frontend/API request → canonical communication gateway → provider adapter → delivery ledger → provider callback/webhook → delivery state update → Socket.IO `communicationDeliveryUpdated`.

## Channels
- In-app: authoritative notification + Socket.IO user room.
- Email: SendGrid when configured, otherwise SMTP; disabled provider fails honestly.
- SMS: Africa's Talking canonical provider path; unsupported providers fail closed.
- WhatsApp: Twilio WhatsApp API only; no SMS masquerading or fake fallback.

## OTP
All active phone OTP entry points now use `otp_challenges`:
- hashed codes only
- 10-minute expiry
- five-attempt limit
- locked/expired/verified states
- delivery must succeed before the challenge is reported as sent
- phone verification updates the canonical `users.phone_verified` state

## Delivery ledger
`communication_deliveries` records channel, provider, recipient hash, provider IDs, state, timestamps, error and metadata. Authenticated users can read only their own delivery records; writes remain backend/service-role controlled.

## Webhooks
- `/api/communications/webhooks/status`
- `/api/communications/webhooks/twilio/status`
- `/api/communications/webhooks/sendgrid/events`
- `/api/communications/webhooks/africastalking/status`

All require `COMMUNICATION_WEBHOOK_SECRET`.

## Realtime
Delivery state changes emit `communicationDeliveryUpdated` to `user_<id>`.

## Parallel-path cleanup
- Legacy phone OTP persistence is no longer used for active phone verification.
- Dealer phone verification uses the same OTP challenge service.
- Notification email/SMS delivery converges on the communication gateway.
- Digital payment receipts converge on email/SMS/WhatsApp through the gateway.
- Fake WhatsApp-as-SMS behavior and silent provider fallbacks were removed.

## Verification
- `scripts/validate-communications-otp-e2e.mjs`: 14/14 PASS
- Modified JavaScript files: syntax PASS
- Production Supabase migration applied and verified.
- Full frontend/backend production build remains environment-dependent on the project's declared Node 22.22.2 runtime and installed dependencies.
