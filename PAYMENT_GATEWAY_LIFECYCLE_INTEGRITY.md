# KAYAD Payment Gateway & Callback Lifecycle Integrity

## Scope

This initiative makes payment initiation, provider callbacks, retries, status transitions and payment audit records one coherent lifecycle.

## Canonical rules

- `payments` is the authoritative payment record.
- `payment_attempts` records each provider attempt.
- `payment_events` is append-only audit history.
- `webhook_events` provides provider replay protection.
- `checkout_request_id` is unique when present.
- A user cannot create two concurrent pending payments for the same vehicle/type operation.
- Payment status transitions are limited to `pending -> success|failed|cancelled`.
- A successful amount mismatch is never accepted; the payment is finalized as failed and the provider event is closed.
- Vehicle escrow is not funded by M-Pesa STK. It uses the administrator-configured custody bank-transfer flow.
- Package upgrades use the same payment lifecycle and preserve their plan metadata.
- Payment history and transaction summaries use the canonical database adapter rather than a competing model transport.

## Verification

The domain validator is `scripts/validate-payment-gateway-lifecycle.mjs`.

Full frontend Vitest/Vite execution was not claimed in the extracted environment because project dependencies are not installed there.
