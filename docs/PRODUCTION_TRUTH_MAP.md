# PRODUCTION_TRUTH_MAP.md
**KAYAD — Phase 0 Baseline**

This document synthesizes the extensive audit work already completed across `docs/fusion/` (documents 01–07 and phase-01 through phase-06) plus fresh verification run specifically for this baseline. Every status below reflects direct code inspection, not assumption — sources are cited per section. Where something genuinely couldn't be verified, it says so rather than guessing.

---

## 0. The Single Most Important Fact

This repository contains **two fully-built, independently-developed systems that have never been connected**: a mock-data-only React frontend, and a substantial (1,470-file) Express/Supabase backend. Phase 3 of the fusion program connected authentication between them (real, working, tested). Everything else remains disconnected as of this baseline. See `docs/fusion/01-repository-map.md` §0 for the full discovery narrative.

---

## 1. Feature-by-Feature Truth Map

| Feature | Frontend Entry | Backend Route | Controller | DB Table(s) | Status | Known Gaps |
|---|---|---|---|---|---|---|
| **Authentication** | `src/context/AuthContext.tsx`, `src/components/AuthModal.tsx` | `/api/v1/auth/*` | `authController.js` | `users`, `user_auth` | **IMPLEMENTED** (frontend↔backend connected, Phase 3) | Password reset & email/phone verification UI not built; role vocabulary mismatch handled via mapping, not schema alignment (`phase-03-auth.md`) |
| **Vehicle browsing (marketplace/gallery)** | `VehicleMarketplace`, `VehicleCard`, etc. | `GET /api/cars` | `carController.js` | `cars` | **MOCK** (frontend) / **PARTIAL** (backend client built, not wired) | `src/services/vehicleApi.ts` exists, tested, NOT used by any UI component yet (`phase-04-vehicles.md`, `phase-06-field-alias-fix.md`) |
| **Vehicle detail** | `VehicleDetailModal.tsx` | `GET /api/cars/:id` | `carController.js` | `cars` | **MOCK** (frontend) / **PARTIAL** (backend) | Same as above |
| **Auctions (browsing/bidding)** | `src/features/AuctionsView.tsx` | `/api/v1/auctions`, `/api/v1/bids`, `/api/v1/auction-admin`, `/api/v1/auction-integrity` | `auctionController.js`, `bidController.js`, `auctionIntegrityController.js` | `cars` (canonical auction state) + `bids` | **CANONICAL / BACKEND-DRIVEN** | Auction ID is the canonical car ID; lifecycle is stored on `cars.auctionStatus` / `auctionStartTime` / `auctionEnd` / `currentBid`. No separate `auctions` table or in-memory auction engine is used by production paths.
| **Escrow** | `EscrowView.tsx` | `/api/escrow`, `/api/escrow-vault` | `escrowController.js`(?) | `escrows`, `escrow_vaults` | **MOCK** (frontend) / **UNKNOWN depth** (backend) | Backend escrow state machine exists (`escrowStateMachine.js`, confirmed present); not exercised against live data this baseline |
| **M-Pesa payments** | Not present in frontend | `/api/payments`, `mpesaService.js`, `mpesaAuth.service.js`, `mpesaB2C.service.js` | `paymentCallback.service.js` | `payments`, `mpesa_transactions` | **BACKEND ONLY** | Zero frontend integration of any kind; backend M-Pesa code exists but real credentials/sandbox status unverified this baseline |
| **Inspections** | `InspectionsView.tsx`, `PreAuctionInspectionModal.tsx` | `/api/inspections`, `/api/inspector-applications` | `inspectionController.js`(?) | `inspection_orders`, basic `inspection_status` column on `cars` | **MOCK** (frontend) / **PARTIAL** (backend) | Full inspection detail (score, per-area health) lives in a table not yet joined into `/api/cars` responses |
| **Admin panel** | `AdminView.tsx`, `HomePageAdminPanel.tsx`, `AuctionPageAdminPanel.tsx` | `/api/admin` (64 endpoints — largest route file in the backend) | `adminController.js` | Many | **MOCK** (frontend, uses localStorage-backed config) / **IMPLEMENTED-LOOKING** (backend, unverified) | Frontend admin panels (escrow rules, home/auction page config) are entirely local-state, never call the backend `/api/admin` surface |
| **Dealer workflows** | `DealersView.tsx`, `DealerProfileModal.tsx` | `/api/dealer`, `/api/dealer-platform` | `dealerController.js`(?) | `dealers`, extended dealer tables (teams/trust-scores/profiles — **missing tables**, see `phase-02-database.md` §2) | **MOCK** (frontend) / **PARTIAL** (backend, some expected tables don't exist) | |
| **Seller workflows (private)** | `PrivateSellerPlatform.tsx`, `PrivateSellerDashboardView.tsx` | Shares `/api/cars` (create/update) | `carController.js` | `cars` | **MOCK** (frontend) / **PARTIAL** (backend) | |
| **CMS** | None found in frontend | `/api/cms` (54 endpoints — 2nd largest route file) | `cmsController.js` | Only 2 of ~10 expected CMS tables exist (`phase-02-database.md`) | **BACKEND PARTIAL, NO FRONTEND** | |
| **"Enterprise platform" cluster** (VXP, XOS, AI, Governance, Automation, Low-Code, Digital Twin, Command Center, etc.) | None | `/api/vxp`, `/api/xos`, `/api/ai`, `/api/governance`, `/api/automation`, `/api/lowcode`, `/api/digital-twin`, `/api/command-center`, and 7 more (~421 endpoints total, confirmed mounted) | Many | **116 of 185 models expect a table that doesn't exist** (`phase-02-database.md`, independently re-derived, exact match to an old, previously-retracted claim) | **ROUTES REAL, DATA LAYER LARGELY MISSING** | This is the single largest "MOCK/BROKEN" surface in the backend by endpoint count — see risk ranking below |
| **Realtime (Socket.IO)** | Referenced in test mocks only | `socket/` domain folder, wired in `server.js` | — | — | **UNKNOWN** — not investigated this baseline | Flagged for a dedicated integration-map pass |
| **Notifications** | `NotificationAnalyticsRoutes` referenced | `/api/notifications`, `/api/notification-analytics` | `notificationController.js` | `notifications`, `notification_audit` | **BACKEND ONLY** | No frontend consumer found |
| **Media/image upload** | Not directly wired | `/api/upload`, Cloudinary integration (`config/cloudinary.js`) | `carController.js` (image upload flow) | — | **BACKEND ONLY, CONFIRMED REAL** | `images` column is genuinely JSONB with Cloudinary object shape (`phase-05-schema-correction.md`) — real, working-looking upload flow, not exercised live this baseline |
| **Analytics/market intelligence** | Not present | 9+ route files (`vehicleAnalyticsRoutes`, `searchAnalyticsRoutes`, `executiveAnalyticsRoutes`, etc.) | Many | Several exist, several don't (per the 69/116 split) | **BACKEND MIXED** | |

---

## 2. Authentication & Authorization

- **Frontend**: real, backend-authoritative (Phase 3). Passwordless demo picker fully removed. Demo access gated behind `VITE_ENABLE_DEMO`, calls the backend's real demo-login endpoint.
- **Backend**: JWT (httpOnly cookie) + refresh token rotation, account lockout, rate limiting, phone OTP, email verification — all confirmed present in `authController.js`/`authRoutes.js`. Role vocabulary: `user`/`individual_seller`/`dealer`/`admin`/`superadmin` — does not 1:1 match the frontend's own role union (`buyer`/`dealer`/`mechanic`/`bank_officer`/`admin`); handled via an explicit, documented mapping function, not schema-level alignment.
- **Route protection**: `PROTECTED_VIEWS` mechanism in `App.tsx` correctly redirects unauthenticated users to sign-in for `admin`/`dashboard`; the `admin` view is separately role-gated. This is presentational only, per this program's own repeated stated principle — backend `protect` middleware is the real authority, not independently audited for full route coverage this baseline.

---

## 3. Database

- **Two schema sources exist in this repository**: `backend/db/*.sql` (stale, superseded) and `supabase/migrations/*.sql` (real, authoritative — established via a prior session's own cross-referenced evidence trail, confirmed in `phase-05-schema-correction.md`). Any future work must use the `supabase/migrations/` version.
- **No live database is reachable from this account.** `supabase/config.toml` references a real project ID (`jypkhvknfgoqrhwzbdwi`) that does not appear in this account's accessible Supabase projects — it may exist under the project owner's own separate account.
- **69 of 185 models have a real, matching table**; 116 do not (independently re-derived exact match to a previously-retracted old claim — see `phase-02-database.md`). The core transactional path (users, cars, bids, escrows, payments, transactions, messages, notifications, audit logs) is solidly backed. The gap concentrates in the "enterprise platform" cluster and CMS.
- **A Mongoose-compatibility shim** (`backend/models/_base.js`, 705 lines) translates Mongoose-style calls into real Supabase/Postgres queries. Confirmed comprehensive (`$set`, `$regex`, `$ne`, `$gte`/`$lte`/`$gt`/`$lt`, `$in`, `$text`, `$or`, `$and`, `.populate()`, `.distinct()`, `.countDocuments()`). `mongoose` is not an actual dependency — this is deliberate migration-compatibility code, not a live MongoDB dependency.
- **A confirmed field-alias bug was found and fixed this program** (`location` vs. real `location_city` column) that plausibly broke every `GET /api/cars` request — see `phase-06-field-alias-fix.md`. Not live-verified as fixed (no reachable database), but evidence-based with high confidence.
- **A second, confirmed runtime bug was found and fixed**: `.distinct().lean()` chain in `carController.js`'s dealer-type filter throws a real `TypeError` (`phase-05-schema-correction.md`).

---

## 4. Baseline Test/Build Results (run fresh for this document)

| Check | Result |
|---|---|
| Frontend TypeScript (`tsc --noEmit`) | **0 errors** |
| Frontend lint (same command as typecheck, per `package.json`) | **Clean** |
| Frontend test suite (Vitest) | **174/174 passing**, 18 test files |
| Frontend production build (`vite build`) | **Succeeds** |
| Backend syntax validation (`node --check`, all 623 non-`node_modules` files) | **0 errors** |
| Backend dependencies | **Already installed** (1,187 packages) — corrects a claim repeated throughout this program's earlier documents that they were never installed |
| Backend unit test suite (`npm test`, Jest) | **216/216 passing, 10 suites** — genuinely new data this baseline; never previously run in this program |
| Backend live server startup | **Starts and accepts connections** when `JWT_SECRET`/`PORT` are set, but **hangs and does not respond** to `/health` or `/api/cars` requests — the process was observed receiving requests in its logs with no corresponding response, alongside 30+ repeated Redis connection failures (`ECONNREFUSED 127.0.0.1:6379`, no Redis available in this environment). Not root-caused further this baseline — flagged as a real, concrete finding for the next investigation, not silently omitted. |
| Backend integration/E2E tests | **Not run** — `e2e/` folder exists but was not investigated this baseline |
| Live database validation | **Not possible** — no reachable Supabase instance |

---

## 5. Duplicate/Legacy/Dead Code Status (carried forward, not re-audited)

Full detail in `docs/fusion/06-duplicate-map.md` and `07-dead-code-map.md`. Summary:
- `inspectionBusinessCenter/`, `digitalInspection/` — real, substantial, deliberately-built code with zero HTTP entry point anywhere. **DEPRECATE** classification (not deleted — see `phase-01-results.md` for the full reasoning).
- `services/auction.service.js` — confirmed duplicate of the actively-used `realtime/auctionEngine.js`. **DELETED** (`phase-01-results.md`).
- Frontend: 5 orphaned components + 2 dead route aliases, already removed in prior sessions (8,522 lines).
- `src/types/index.ts` vs `src/types.ts` — `UserProfile` has two genuinely conflicting definitions (only one used); `Vehicle` is correctly re-exported, not duplicated (`phase-04-vehicles.md` §3). Not resolved — flagged.

---

## 6. What This Baseline Does NOT Cover (Explicitly)

- Docker, Vercel, Render, CI/CD pipeline configuration — not investigated this baseline despite being requested; `.github/`, `k8s/`, `helm/`, `nginx/` folders are confirmed to exist (`01-repository-map.md`) but their contents were not read.
- Full authorization/permission-check coverage across all 92 backend route files.
- The realtime/Socket.IO layer's actual behavior.
- E2E test suite contents or results.
- Monitoring/observability configuration (Sentry, OpenTelemetry, Grafana) — dependencies confirmed present, not configured or tested.

These are not oversights hidden from the reader — they are the concrete scope for whatever comes after this baseline.
