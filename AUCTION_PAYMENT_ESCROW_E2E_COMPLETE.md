# Auction → Payment → Escrow End-to-End Initiative

## Scope
This initiative traced the marketplace transaction path across frontend transport, backend controllers/services, Socket.IO realtime events, and Supabase atomic state transitions.

## Auction / bidding
- Dealer and admin auction start/extend now converge on the canonical lifecycle service and DB RPCs.
- Auction start/extend emits realtime phase/extension/listing updates.
- Duplicate legacy car-controller bid mutation was removed.
- Bids require a verified profile phone; the client no longer supplies the authoritative phone value.
- Admin winner selection converges on canonical atomic auction close.
- Hard reserve settlement remains enforced atomically.
- Canonical frontend auction and bid services cover active auctions, auction reads, bid placement, admin bid reads, suspicious bids, and winner settlement.
- Successful bid responses remain pending until payment confirmation; the selected auction is refreshed from the authoritative read model.

## Payment / escrow
- Payment records are created before the provider is contacted, giving every initiation attempt a durable identity.
- Payment gateway lifecycle remains idempotent and callback-safe; amount mismatches are finalized as failures.
- Vehicle escrow is explicitly bank-transfer custody, not M-Pesa STK.
- Vehicle escrow eligibility is enforced at the payment boundary for private sellers.
- Dealers cannot enable vehicle purchase escrow through listing create/update paths.
- Admin custody configuration has canonical rules/account endpoints.
- Escrow funding verification is an atomic Supabase RPC and is admin-only at the API boundary.
- Funding instructions are exposed through a real escrow endpoint.
- Realtime escrow funding emits buyer/car room events for UI reconciliation.
- Legacy dealer escrow approval/force controls were removed from the active API surface.

## Verification
- Auction domain integrity: 24/24
- Auction bid surface: 6/6
- Auction transport convergence: 5/5
- Payment/Escrow domain: 9/9
- Payment gateway lifecycle: 13/13
- Escrow custody domain: 14/14
- Chat surface convergence: PASS (regression check)
- Dispute integrity: 8/8 (regression check)
- Subscription E2E: 17/17 (regression check)

The inspection workforce validator currently has a pre-existing fixture/schema mismatch (`engine` point-definition category) unrelated to this initiative; it was not altered or falsely certified.

Production Supabase migration `20260909091000_auction_payment_escrow_e2e` has been applied successfully.
