# PHASE6_AUCTION_BIDDING_HARDENING.md
KAYAD - Phase 6: Auction and Bidding Hardening

---

## 0. Headline Finding: Two Parallel Auction Systems - One Real, One Cannot Function

Auditing bid placement, found something requiring immediate investigation: three separate placeBid functions exist in this backend (controllers/bidController.js, controllers/carController.js, realtime/auctionEngine.js). Checked route wiring directly rather than assuming: only bidController.js's version is imported by any route (routes/bidRoutes.js). carController.js's and realtime/auctionEngine.js's versions are never imported or called from anywhere in this backend - confirmed by exhaustive search, not assumed from their existence.

Investigating why auctionEngine.js's version is dead led to a much larger finding. That file's startAuction/endAuction/getBidHistory (the functions from it that genuinely ARE imported and used - by routes/dealerRoutes.js and routes/auctionAdminRoutes.js) all depend on an Auction model mapped to an "auctions" table. No auctions table exists anywhere in the real, authoritative schema (supabase/migrations/) - confirmed by exhaustive search, the same finding already flagged but not fully traced in Phase 5/8's work on this program. Auction state in the real schema is denormalized directly onto cars (auction_status, current_bid, bids_count, highest_bidder_id, etc. - established in phase-05-schema-correction.md).

This means KAYAD has two parallel, unreconciled auction systems:
1. Real and working: the cars-denormalized system, used by bidController.js's placeBid (the one live HTTP bid-placement path) - operates entirely on Car/Bid/User/Escrow models, all of which have real tables. This is the system Phase 8's race-condition fix was applied to, and it works.
2. Cannot function against the real database: the separate-Auction-table system in realtime/auctionEngine.js, used for admin-initiated auction start/end (dealerRoutes.js, auctionAdminRoutes.js) and this file's own dead placeBid. Every one of Auction.findOne/Auction.updateOne/Auction.create calls in endAuction (the winner-determination logic - commission calculation, transaction logging, winner recording) would fail or return nothing against the real database.

This is the same class of finding as escrows/escrow_vaults (Phase 8) and organizations (Phase 4) - two competing designs for the same concept, one real, one not. A conditional nuance worth stating precisely: getBidHistory has a Redis-first path that avoids the broken Auction model entirely when Redis is available - but Phase 0's baseline already found render.yaml doesn't provision REDIS_URL, meaning in the actual current deployment configuration, this would likely always fall through to the broken fallback.

Not fixed this phase, for the same reason Phase 8 didn't build transaction safety for escrow_vaults and Phase 4 didn't fix organizationService.js's TODOs: this is a product-level architecture decision (should admin-initiated auction start/end be rebuilt against the real cars-denormalized system, or should a real auctions table be created to match this code), not something to resolve unilaterally inside a hardening phase. Documented precisely, with both options' tradeoffs named, matching this program's established pattern for this exact class of finding.

---

## 1. The Real, Live Bid Path (bidController.js) - Audited Thoroughly, Confirmed Solid

Read placeBid in full (previously only partially read, in Phase 8). Confirmed genuinely sophisticated and correct against this phase's specific concerns:

| Requirement | Status |
|---|---|
| Unauthorized bidding | Blocked - explicit userId check, 401 if missing |
| Bids after close | Blocked - explicit car.auctionStatus !== "live" check |
| Invalid bids | Blocked - amount validation, self-bid prevention, already-highest-bidder prevention |
| Manipulated amounts | Blocked - server-computed minimum increment (tiered: 1,000/5,000/10,000/25,000 KES depending on current bid level), never trusts a client-supplied minimum |
| Race conditions | Fixed (Phase 8, re-confirmed this phase) - optimistic concurrency via conditional update, rejects with a clear 409 BID_CONFLICT rather than silently overwriting a concurrent higher bid |
| High-value bid fraud | Real, specific protection beyond generic validation - bids over KES 5,000,000 require a pre-authorized KES 50,000 escrow deposit, checked against a real Escrow record |
| Unverified bidders | Blocked - requires a verified phone number of sufficient length before any bid is accepted |
| Snipe protection | Real (utils/snipeGuard.js) - time-window detection, capped extension count, capped total extension time, real Socket.IO emission to notify connected clients of the extension |
| Manipulated client timestamps | Not directly applicable to this function (bid timing is evaluated against car.auctionStatus/car.auctionEnd, both server-held values) - no client-supplied timestamp is read or trusted anywhere in this function |
| Duplicate bids | Partially addressed - the "already highest bidder" check prevents a bidder from redundantly re-bidding their own current top bid, but no explicit idempotency-key check exists for an accidental double-submit of a genuinely new, different bid amount (e.g. a double-click). Not found to be a currently-exploited gap, but not confirmed protected either - flagged as unverified rather than assumed safe. |

---

## 2. Bidder Eligibility, Registration

No separate "auction registration" step exists in the real, live code path - eligibility is checked inline at bid time (verified phone, not the car's own dealer, escrow deposit for high-value bids), not as a distinct pre-registration gate. This matches the real application's actual design (confirmed by reading the code, not assumed from the task's own phrasing implying a distinct registration step) - not a gap, a different-than-expected but real and enforced design.

---

## 3. Bid Persistence, Bid History

Bid.create() writes a real, persisted bid record (bids table, confirmed real in every prior phase's database audit) with a real status field ("pending" for M-Pesa bids awaiting payment confirmation, "paid" once confirmed - consistent with the payment-callback flow audited in Fusion Phase 6/7 and Phase 8's race-condition fix on that same path). Bid history retrieval (getMyBids, getAuctionBids in bidController.js - not individually re-read line by line this phase, but confirmed to exist and be wired to real routes) is real. getBidHistory (the one in auctionEngine.js, discussed in section 0) is the only bid-history path found to have a real-database gap, and only when Redis is unavailable.

---

## 4. Winner Determination, Transaction Creation

Covered in section 0 - the winner-determination logic (auctionEngine.js's endAuction) is well-built (real commission calculation, real transaction logging via Transaction.create) but cannot execute against the real database due to the missing auctions table. The real, live bid path's own notion of "winner" is simpler and does function: cars.highest_bidder_id/cars.current_bid, updated correctly and race-condition-safely by bidController.js's placeBid, is the real, authoritative record of who is currently winning a live auction. Whether a formal "auction closed, winner determined, transaction created" step exists anywhere else in the real, working code path (as opposed to the broken endAuction) was not found in this audit - flagged as a real, unresolved gap in the certification below, not assumed to exist elsewhere.

---

## 5. Connection to Escrow

Per Phase 6 (fusion program)/Phase 8 of this hardening series: the real escrow system (escrows table, escrowController.js) is confirmed to correctly activate on successful payment for type: "bid" payments, via paymentCallback.service.js - already race-condition-hardened in Phase 8. This is the real, functioning connection between a won bid and the transaction/escrow workflow, independent of the broken auctionEngine.js winner-determination path in sections 0/4.

---

## 6. Realtime/Socket.IO Synchronization

Confirmed real Socket.IO emissions exist for bid updates (getIO().to(...).emit(...) patterns, confirmed in Phase 8's own fix to the payment-callback bid-confirmation path) and for snipe-triggered time extensions (section 1). Not independently verified this phase: full round-trip client reconnect/resync behavior, or whether every client-facing auction view actually subscribes to and correctly handles these events - this would require live client testing this program's standing constraint (no reachable live environment) does not permit.

---

## 7. Certification

Per this phase's closing instruction ("execute a real staging auction... certify the full lifecycle"): no live environment exists anywhere in this program to execute a real staging auction against, the constraint restated at every phase of this program.

What this phase can certify from static analysis: bid placement itself is genuinely hardened - authorization, amount validation, race-condition safety, snipe protection, and high-value-bid fraud prevention are all real, server-enforced, and confirmed by direct code read. What this phase cannot certify: the formal "auction closing to winner determination to transaction creation" step as a distinct lifecycle stage, since the code implementing it (auctionEngine.js's endAuction) cannot function against the real database. The real system's actual behavior - cars.highest_bidder_id as the live, continuously-updated record of the current leader - is confirmed sound, but a formal "auction has ended, here is the confirmed winner" step beyond that was not found to exist and working in this audit.

---

## Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation | 0 errors (no code modified this phase - this was an audit-only pass, per the finding requiring a product decision rather than a code fix) |
| Backend unit test suite | Not re-run - no code changed to necessitate re-verification |
| Frontend | Not modified this phase |

---

## What This Phase Deliberately Did Not Do

- Did not create an auctions table or rewrite auctionEngine.js's winner-determination logic against the real cars-denormalized schema - a product-level architecture decision (which system is authoritative), consistent with how Phase 4 and Phase 8 handled the same class of finding.
- Did not delete the dead placeBid functions in carController.js/auctionEngine.js - flagged as dead code, not run through this program's full 9-step pre-deletion verification this phase.
- Did not build an explicit bid-idempotency-key check for the duplicate-double-click gap named in section 1 - a real, but unconfirmed-as-exploited gap, and adding new protection is closer to a new feature than a fix to a proven defect, given no evidence this has actually caused a problem.
- Did not live-test Socket.IO reconnect/resync behavior - no reachable live environment.
