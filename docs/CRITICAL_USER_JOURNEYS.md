# CRITICAL_USER_JOURNEYS.md
**KAYAD — Phase 0 Protection Document**

Purpose: identify what must not break before any refactoring begins. Every journey below states its current real status — most are frontend-mock-only, and that is stated plainly rather than implied to be more complete than it is.

---

## 1. Buyer Journey: Discover to Sign In to Bid to Escrow

Steps: Marketplace/Gallery, Vehicle Detail, Sign In (if needed), Auction Lot, Place Bid, Win, Escrow Payment, Handover.

Current reality:
- Discover/Vehicle Detail: frontend mock data only (`data/mockVehicles.ts`) — real, tested backend client exists (`vehicleApi.ts`) but is not wired to any UI.
- Sign In: real, backend-authoritative (Phase 3).
- Auction Lot/Bid: frontend mock data only (`data/mockAuctions.ts`). Backend has a real-looking realtime auction engine (`realtime/auctionEngine.js`, Redis-backed) — not connected to the frontend, not live-tested this program.
- Escrow: frontend mock data only. Backend escrow state machine exists — not connected, not live-tested.

Protection requirement: any future work connecting real vehicle/auction data to the UI must not silently drop the rich mock-data experience (auction badges, escrow eligibility, inspection status) that currently works end-to-end in the demo. `phase-04-vehicles.md`/`phase-05-schema-correction.md`/`phase-06-field-alias-fix.md` already establish that real backend data can now supply most of this (auction state is denormalized on `cars`, seller data is already populated via an existing join) — the remaining honest gap is full inspection detail and the exact shape-mapping work, not a fundamental data-availability blocker.

Critical API endpoints: `POST /api/v1/auth/login`, `GET /api/cars`, `GET /api/cars/:id`, `/api/bids`, `/api/escrow`.

---

## 2. Dealer Journey: Sign In to List Vehicle to Manage Inventory to Respond to Leads

Steps: Sign In (as dealer role), Dealer Dashboard, Create/Edit Listing, View Leads, Respond.

Current reality:
- Sign In: real.
- Everything after: frontend mock data only (`DealersView.tsx`, `DealerProfileModal.tsx`). Backend has `dealerController.js`, `/api/dealer`, `/api/dealer-platform` (29 + 28 endpoints) — real-looking, not connected, not live-tested.
- Extended dealer data (teams, trust scores, subscriptions): backend models exist but no corresponding database table (`phase-02-database.md`).

Protection requirement: do not assume dealer-extended-feature tables can be safely created without a deliberate schema decision — this is exactly the kind of "missing table" gap this program has repeatedly found is more nuanced than it first appears (see the governance/AI schema-mismatch pattern in `phase-05-schema-correction.md` — a differently-named real table may already exist for some of this and just not be discovered yet).

Critical API endpoints: `/api/dealer`, `/api/dealer-platform`, `/api/leads`.

---

## 3. Private Seller Journey: Sign In to List Vehicle to Track Offers

Steps: Sign In (as seller/individual_seller role), Seller Platform, Create Listing, Track Interest.

Current reality: frontend mock data only (`PrivateSellerPlatform.tsx`, `PrivateSellerDashboardView.tsx`). Shares `/api/cars` create/update with dealers on the backend side.

Protection requirement: the frontend's "seller" role concept doesn't cleanly map to the backend's `individual_seller` — Phase 3's role-mapping function already handles this for auth; any future work connecting the seller listing flow must account for the same mismatch, not assume it's resolved just because login works.

---

## 4. Admin Journey: Sign In (Admin) to Configure Platform to Audit Trail

Steps: Sign In as admin, Admin Panel, Configure escrow rules / home page / auction page, Changes take effect.

Current reality: frontend entirely local-state (localStorage-backed config in `HomePageAdminPanel.tsx`, `AuctionPageAdminPanel.tsx`, `escrowRulesConfig.ts`). The backend has a real, substantial admin API (`/api/admin`, 64 endpoints — the single largest route file in the entire backend) that the frontend admin panel does not call at all.

Protection requirement: this is the widest gap between "looks complete" and "is actually connected" in the whole product. The frontend admin experience is fully functional as a local demo — any future connection work must not break the current, working local-config UX before the backend equivalent is confirmed to actually work end-to-end. The admin route itself is correctly role-gated at render time (Phase 2 fix, `phase-01-results.md`) — that protection must be preserved through any refactor.

Critical API endpoints: `/api/admin/*` (64 endpoints, not yet audited individually for what's real vs. stub).

---

## 5. Financial Flows (Highest-Risk Category)

| Flow | Frontend | Backend | Status |
|---|---|---|---|
| Escrow deposit/release | Mock UI, full 6-step visual flow | `escrowStateMachine.js`, `/api/escrow`, `/api/escrow-vault` | Backend real-looking, unconnected, unverified live |
| M-Pesa payment | No frontend UI exists at all | `mpesaService.js`, `mpesaAuth.service.js`, `mpesaB2C.service.js`, real STK-push-shaped code | Backend-only; real M-Pesa sandbox/production credentials status unknown this baseline |
| Reconciliation | None | `reconciliationService.js` (1,630 lines — one of the largest files in the backend), `reconciliationCron.js` | Backend-only, unverified |
| Per-sale escrow override (admin) | Real, working, tested (built this program) | Frontend-local only — does not call any backend escrow-config endpoint | This is a genuine frontend-only feature layered on top of frontend-mock data; protect this UX, but be aware it has no backend equivalent yet |

Protection requirement: no financial-flow code should be modified without first confirming (a) whether it's reachable by any real user path today (mostly: no), and (b) whether a live database/M-Pesa sandbox exists to test against before deploying a change (currently: no). This is the category where "looks implemented" is least trustworthy without live verification — treat every backend financial file as unverified-in-practice regardless of how complete the code reads.

---

## 6. Authentication Flow (Verified Real, Protect Carefully)

Steps: Open Auth Modal, Enter credentials / demo login, Backend validates, httpOnly cookie set, `/me` confirms session, Frontend state updates, Protected UI unlocks.

Status: Real, tested, working (Phase 3) — the one fully-connected flow in this product. 7 dedicated tests verify actual request shapes.

Protection requirement: this is the flow most recently changed and most load-bearing for everything downstream (route protection depends on it). Any future change must re-run `AuthModal.test.tsx` and confirm the httpOnly cookie / `credentials: 'include'` pattern is preserved — removing it would silently break session persistence with no visible error until a user tries to stay logged in across a refresh.

Critical API endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/demo-login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`.

---

## 7. Auction Flow (Backend Looks Substantial, Unverified Live)

Steps: Browse auctions, View lot, Verify bidder, Place bid, Auction ends, Win/lose, Escrow.

Status: Frontend fully mock (extensive, tested, polished demo experience built across many prior sessions). Backend has a real, Redis-backed realtime engine (`realtime/auctionEngine.js`) with anti-sniping protection, confirmed via direct code read to be more sophisticated than an earlier duplicate that was correctly identified and deleted (`services/auction.service.js`, `phase-01-results.md`).

Protection requirement: the frontend's mock auction experience (timer auto-transition to "Awaiting Settlement", bid validation, escrow handoff with corrected winning-amount handling) represents substantial, already-hardened UX logic from this program's own earlier phases — this must not be discarded in favor of a real backend connection until the backend's live behavior is actually confirmed to match or exceed it.

Critical API endpoints: `/api/cars` (auction state is denormalized here per Phase 5's correction), `/api/bids`, `/api/auction-admin`, `/api/auction-integrity`.

---

## 8. Database Dependencies Requiring Protection

- No schema changes should be made against `backend/db/*.sql` — it is confirmed stale/superseded. Any real schema work must target `supabase/migrations/`.
- The `location` to `location_city` and other `FIELD_ALIASES` entries in `backend/utils/fieldMap.js` are now load-bearing for correct query translation — this file should be treated as sensitive to changes, given how much of the query-translation correctness depends on it being accurate (two real bugs were already found and fixed here this program).
- No live database exists to migrate against — any schema change proposal must be validated by static cross-referencing (the same method Phase 5/6 used) until a real, reachable Supabase project exists.

---

## 9. Summary Risk Table

| Journey | User-facing completeness | Real backend connection | Financial risk if broken |
|---|---|---|---|
| Authentication | High (real) | Yes | Medium — session/access control |
| Buyer discovery/browse | High (mock) | No | Low (no real money moves) |
| Auction/bidding | High (mock) | No | Low currently, High once connected |
| Escrow | High (mock) | No | High once connected |
| M-Pesa | None (no UI) | Backend only | High if ever exposed without verification |
| Admin config | High (mock, local) | No | Low (local-only today) |
| Dealer/Seller listing | Medium (mock) | No | Low currently |

No large refactor should proceed without treating "Escrow" and "M-Pesa" as the two highest-risk categories to touch — both are financial, both are currently unconnected (limiting real-world blast radius today), and both would become high-risk the moment real connection work begins.
