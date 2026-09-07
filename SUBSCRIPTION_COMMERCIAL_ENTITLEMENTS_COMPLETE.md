# KAYAD — Subscription & Commercial Entitlements Initiative

Status: COMPLETE

## Scope

This initiative makes dealer subscriptions a real, server-authoritative commercial entitlement domain from plan discovery through payment, activation, usage enforcement, cancellation, reactivation, administration and audit history.

## End-to-end contract

1. Plans are read from the platform configuration catalogue.
2. Dealer upgrade requests resolve the plan server-side and create an M-Pesa payment intent using a signed plan snapshot hash.
3. The browser never supplies price, listing limits, features or duration as authoritative values.
4. M-Pesa callback verifies provider metadata and payment amount before settlement.
5. Subscription activation occurs through an atomic PostgreSQL RPC.
6. The RPC serializes dealer subscription changes and guarantees one active entitlement per dealer.
7. Historical subscriptions remain auditable.
8. Dealer listing creation checks the current entitlement rather than legacy package fields.
9. Cancellation and reactivation use atomic lifecycle RPCs.
10. Admin grant/revoke operations use the same authoritative lifecycle contract.
11. Zero-cost dealer onboarding uses the same grant contract instead of directly mutating package fields.
12. Dealer clients can read their subscription but cannot insert/update subscription rows directly through RLS.
13. Post-registration payment flow waits for verified payment settlement before navigating to listing creation.

## Security controls

- Server-authoritative plan catalogue.
- Plan snapshot integrity hash.
- Payment amount equality check.
- Atomic callback activation.
- Atomic lifecycle operations with advisory transaction locks.
- Partial unique index enforcing one active entitlement per dealer.
- RLS read-only access for dealer subscription history.
- No direct dealer package-field mutation remains in backend business routes.
- Admin-only grant/revoke operations.
- Vehicle escrow remains separate from dealer subscription payments.

## Verification

- JavaScript syntax checks: PASS for all modified backend JS files.
- Dealer commercial controls validator: 9/9 PASS.
- Phase 57 regression validator: 12/12 PASS.
- Subscription domain E2E validator: 17/17 PASS.
- Duplicate-plan scan: no duplicated backend/frontend plan catalogue found outside the authoritative migration configuration.
- Direct dealer package-field write scan: no remaining backend business-route writes found outside model/schema references.
- Subscription 501 scan: no `DEALER_SUBSCRIPTION_UNAVAILABLE` occurrences remain.

A full dependency-backed Vitest/Vite build was not claimed because the supplied working tree does not contain `node_modules`.

## Database deployment note

The Supabase migrations in this initiative must be applied to the KAYAD production/staging database in migration order before enabling paid dealer subscriptions. The ZIP contains the migration chain; this package does not claim that the remote database has already been migrated.
