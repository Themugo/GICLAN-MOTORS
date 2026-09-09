# KAYAD — Communication Event-by-Event Convergence

## Canonical path
Business event -> communication event service -> communication gateway -> channel/provider -> communication_deliveries -> provider webhook -> delivery state -> Socket.IO user room.

## Covered event families
- Registration and email verification
- Bid confirmation and outbid
- Auction start, extension, winner and loser outcome
- Payment success
- Escrow release/refund
- Inspection booked, assigned, started and completed
- Dispute opened, transitioned and resolved
- Dealer subscription activation
- Support case creation and status updates

## Reliability
- Existing failed delivery records are retried in-place; retries no longer create a second delivery ledger row.
- Delivery state remains authoritative in `communication_deliveries`.
- Provider callbacks reconcile status through the same gateway.
- Communication failures do not roll back successful core business transactions.

## Security
- Communication delivery writes remain server-side.
- User communication history remains protected by RLS.
- OTP/system communications are not blocked by marketing preferences.
- Marketing channel delivery is governed by explicit communication preferences.

## Verification
- `scripts/validate-communication-event-convergence.mjs` verifies all critical event integrations.
- Modified backend JavaScript files pass `node --check`.
- Production Supabase communication control-plane migration is applied and its tables/RLS were verified.
