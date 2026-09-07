# KAYAD Auction Domain Integrity

This initiative treats auctions as one end-to-end domain: discovery, live bidding, payment confirmation, automatic bidding, settlement, admin controls, dealer controls, fraud detection, and frontend transport.

## Canonical architecture

- Auction state is stored on `cars` (`auction_status`, `auction_start_time`, `auction_end`, `current_bid`, `bids_count`, `highest_bidder_id`, etc.).
- `backend/services/auctionLifecycle.service.js` is the single lifecycle service for start, extend, and close.
- Database row locking/RPCs are authoritative for start, extend, bid placement, payment confirmation, auto-bidding, and settlement.
- `src/services/auctionService.ts` is the canonical frontend auction transport.
- `src/services/bidApi.ts` is the canonical frontend bid transport.
- Legacy `api.exports` auction/bid compatibility methods remain available for unrelated code, but the active auction surfaces use the canonical services.

## Lifecycle rules

1. Start requires a minimum 24-hour duration and starting bid of at least KES 1,000.
2. Ended auctions cannot be restarted through the lifecycle service.
3. Extensions are 1–72 hours, with a maximum of three dealer/admin extensions.
4. Manual bids are authenticated, self-bid protected, time-checked, increment-checked, and persisted as `pending` until M-Pesa confirmation.
5. Payment confirmation is atomic and only a confirmed bid can move the market.
6. Automatic bidding and final settlement use database row locks.
7. A configured `hard` reserve prevents a sale when the highest confirmed bid is below the reserve.
8. Auction close is one canonical path used by timer, admin, and dealer controls.

## Removed contradictions

- Removed the unused duplicate `carController.placeBid` mutation engine.
- Removed the duplicate dealer auction-extension route implementation.
- Removed the duplicate `v_applied` declaration in the bid-payment migration.
- Fixed dealer/admin lifecycle operations to share the same atomic rules.
- Fixed the bid payment path so the STK request uses the bidder's verified profile phone rather than an arbitrary request-body number.
- Corrected auction fraud-detection queries to use the real `carId` relationship and canonical dealer/user identifiers.
- Removed the legacy live-page duplicate payment step: bid placement already initiates the real M-Pesa STK request, so opening a second 5% payment modal would have created a conflicting payment flow.

## Verification

Run:

```bash
node scripts/validate-auction-domain-integrity.mjs
```

The validator covers backend syntax, lifecycle convergence, canonical frontend transport, migration integrity, reserve settlement, and duplicate-engine removal.
