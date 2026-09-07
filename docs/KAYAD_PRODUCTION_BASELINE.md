# KAYAD_PRODUCTION_BASELINE.md
**Phase 0 - Production Baseline and Feature Freeze**

This is the authoritative technical baseline for all subsequent phases. It synthesizes verified findings from this program's full history (docs/fusion/01-08, docs/PRODUCTION_TRUTH_MAP.md, docs/CRITICAL_USER_JOURNEYS.md, docs/DATABASE_SOURCE_OF_TRUTH.md, docs/ROLE_MATRIX.md, docs/PHASE2_AUTH_AUTHORIZATION.md, docs/PHASE6_PAYMENT_INTEGRATION.md, docs/PHASE7.md, docs/PHASE8.md) plus fresh verification run specifically for this document (deployment config, Node/npm requirements, Redis behavior, E2E infrastructure). Every claim below is either cited to prior verified work or freshly confirmed - nothing here is asserted from assumption. No code was changed to produce this document, per this phase's own "feature freeze" instruction.

---

## 1. System-by-System Inventory (35 Areas)

Status key: REAL (built, connected, working as designed) / PARTIAL (built but incomplete, or built but not connected) / MOCK (frontend demo data only) / UNUSED (exists, unreachable or uncalled) / BROKEN (confirmed defect) / UNKNOWN (not yet verified).

| # | Area | Status | Basis |
|---|---|---|---|
| 1 | Frontend | REAL | React 19/Vite/TS, 174-181 tests passing throughout this program, clean builds |
| 2 | Backend | REAL (code) / UNKNOWN (live behavior) | 1,470 files, syntax-clean, 216 real Jest tests passing; live server hangs on /health and /api/cars in this sandbox (section 6) |
| 3 | API services | PARTIAL | 92 route files, ~1,168 endpoints mounted and reachable (docs/fusion/03-api-map.md); frontend calls only auth + vehicle-list endpoints (2 of 92 route files) |
| 4 | Database | PARTIAL | Core transactional tables real (69/185 models backed); ~116 models (enterprise-platform cluster + CMS) lack tables; two confirmed schema-source conflicts already fixed this program |
| 5 | Supabase migrations | REAL, with a caveat | supabase/migrations/ is authoritative (phase-05-schema-correction.md); backend/db/*.sql is stale/superseded and must never be used as a reference |
| 6 | Authentication | REAL | Backend-authoritative, frontend fully rewired (Fusion Phase 3), 7 dedicated tests verifying real request shapes; cookie SameSite=Lax cross-origin concern unresolved (PHASE2_AUTH_AUTHORIZATION.md) |
| 7 | Authorization/RBAC | REAL (definition) / PARTIAL (coverage audit) | backend/config/roles.js is a genuine, coherent 15-role system; only 1 of 92 route files spot-checked for correct-helper usage (ROLE_MATRIX.md) |
| 8 | Marketplace | MOCK (UI) / PARTIAL (backend) | GET /api/cars now attempted on load with honest fallback to mock (Phase 7); most components still read INITIAL_VEHICLES directly |
| 9 | Vehicle listings | PARTIAL | cars table real and solid; vehicleApi.ts client real and tested; full inspection/seller-identity enrichment not built |
| 10 | Dealer workflows | MOCK (UI) / PARTIAL (backend, extended features missing tables) | dealers core table real; teams/trust-score/subscription tables absent |
| 11 | Seller workflows | MOCK (UI) / PARTIAL (backend) | Shares /api/cars create/update with dealers |
| 12 | Inspection | MOCK (UI) / PARTIAL (backend) | inspection_orders/inspection_packages real; base Inspection/Inspector models lack tables |
| 13 | Auctions | MOCK (UI) / REAL (backend, code-level) | Auction state denormalized on cars, real Redis-backed engine (realtime/auctionEngine.js); confirmed real bug fixed this program (location field), confirmed real race-condition bug fixed this program (Phase 8) |
| 14 | Bidding | MOCK (UI) / REAL (backend, code-level) | bids table real; one race condition found and fixed (Phase 8); reviewController.js/favoriteController.js still use the fake-transaction layer, not yet investigated |
| 15 | Payments | BACKEND ONLY | No frontend UI at all; sophisticated real callback handling (idempotent claim, amount verification) confirmed in Phase 6 |
| 16 | M-Pesa | REAL (code) / UNKNOWN (live credentials) | Real Daraja STK push, IP whitelist, HMAC option, sandbox/production IP lists all confirmed real; live credential validity unknown |
| 17 | Escrow | SPLIT - two parallel systems | /api/escrow (real escrows table, working) vs. /api/escrow-vault (EscrowVault model, no real table at all - Phase 8's headline finding). Unresolved product decision, not yet made |
| 18 | Chat | UNKNOWN | Not independently investigated this program beyond confirming chats/messages tables exist |
| 19 | Notifications | BACKEND ONLY | Real tables/routes confirmed; no frontend consumer found (PRODUCTION_TRUTH_MAP.md) |
| 20 | Admin | MOCK (UI, localStorage-backed) / PARTIAL (backend) | Frontend admin panel never calls the real 64-endpoint /api/admin surface - the widest "looks complete but isn't connected" gap in the product |
| 21 | CMS | BACKEND MOSTLY MOCK | 54 mounted endpoints; only 2 of ~10 expected CMS models have real tables; no frontend consumer |
| 22 | Analytics | BACKEND MIXED | Several route files exist; table backing is mixed (part of the 69/116 split); no frontend consumer |
| 23 | Background jobs | PARTIAL/UNKNOWN | BullMQ + node-cron real dependencies confirmed; live queue behavior unverified - sandbox server-start test showed 30+ Redis connection failures from queue initialization |
| 24 | Redis | PARTIAL | Real dependency (ioredis), designed in-memory fallback when REDIS_URL is empty (confirmed in .env.example's own comment); not provisioned in render.yaml at all - a real gap, newly confirmed this phase (section 4) |
| 25 | Storage | REAL (code) | Cloudinary integration confirmed real (image upload flow, images JSONB shape verified in Phase 5); live credential validity unknown |
| 26 | Deployment | REAL (config exists) / UNKNOWN (live state) | render.yaml (Docker/Render) + vercel.json (frontend) both real and substantial; no live deployment reachable from this environment to verify |
| 27 | Vercel | REAL (config) | Confirmed no API proxy rewrite exists - only SPA fallback (PHASE2_AUTH_AUTHORIZATION.md); genuinely cross-origin topology |
| 28 | Render | REAL (config) | Docker-based web service, health check path, persistent disk for uploads, full env var list confirmed this phase (section 4) - no Redis add-on referenced |
| 29 | Docker | REAL | backend/Dockerfile referenced and real; not independently rebuilt/tested this program |
| 30 | GitHub Actions | REAL | ci.yml, deploy.yml, security.yml, dependabot-auto-merge.yml all present; not independently run/verified this program |
| 31 | Tests (unit) | REAL | Frontend: 181 tests passing. Backend: 216 tests passing (confirmed runnable this program, Phase 0 of this session - corrected an earlier, repeated wrong claim that backend tests couldn't run) |
| 32 | E2E tests | REAL (infrastructure) / UNKNOWN (pass/fail) | Real Playwright setup confirmed this phase (e2e/ - config, tests, accessibility suite) - never run in this program |
| 33 | Monitoring | REAL (dependencies) / UNKNOWN (live state) | Sentry, OpenTelemetry, pino structured logging, PostHog all real dependencies (docs/fusion/01-repository-map.md); no live instance to verify |
| 34 | Security | PARTIAL | Real: IP whitelisting, idempotency, rate limiting, account lockout, CORS allow-list. Unresolved: SameSite cookie cross-origin concern, fake-transaction layer (financial code), full authorization coverage audit |
| 35 | Environment configuration | PARTIAL | Full production env var list now confirmed (section 4); Redis gap identified; .env.example exists and is thorough |

---

## 2. Mock/Demo/Dead-Code/Duplication Findings (Consolidated)

Already established, cited rather than re-derived:

- Mock data: data/mockVehicles.ts, data/mockAuctions.ts - the primary data source for nearly the entire UI.
- Demo data: backend DEMO_ACCOUNTS (3 roles: buyer/dealer/seller) - genuinely gated behind VITE_ENABLE_DEMO, not always-on (Fusion Phase 3).
- Duplicated types: src/types.ts vs src/types/index.ts - UserProfile genuinely duplicated (2 conflicting definitions); Vehicle is correctly re-exported, not duplicated (phase-04-vehicles.md section 3, correcting an earlier imprecise claim).
- Duplicated role definitions: fixed this program (Phase 2) - was a real, silent role-identity collapse (individual_seller to buyer, superadmin to admin), now resolved with dedicated regression tests.
- Duplicated business logic: services/paymentService.js's confirmPayment()/failPayment() are confirmed dead code, duplicating the real paymentCallback.service.js flow (Phase 7) - flagged, not deleted (9-step verification not yet run).
- Dead/unused code: services/auction.service.js deleted this program after full verification (phase-01-results.md); inspectionBusinessCenter/, digitalInspection/ deprecated (real, unfinished work, not obsolete - kept, not deleted).
- Frontend orphans: 5 components + 2 route aliases already removed in prior sessions (8,522 lines), confirmed still absent.
- Incomplete integrations: vehicleApi.ts built and tested but only wired into the top-level vehicle list (Phase 7) - auctions, bids, escrow, inspections, admin all remain unconnected.
- Frontend-only state representing business data: the entire admin panel (escrow rules, home/auction page config) is localStorage-only with no backend equivalent called.
- Backend functionality not consumed by frontend: CMS (54 endpoints), notifications, analytics, the full "enterprise platform" cluster (~421 endpoints) - all reachable, none called by the UI.
- TODO/FIXME items: systematically checked this phase. Frontend: 0 matches. Backend: exactly 8 files, all sharing one consistent, deliberate pattern - `/* .populate("X") - TODO: use separate query */` - marking places where a Mongoose `.populate()` call was commented out during the Supabase migration and never replaced with a separate query. Affected files: `escrowAnomalyDetectionService.js`, `fraudDetectionService.js`, `leadService.js`, `organizationService.js`, `escrowAuditService.js`, `auctionIntegrityService.js`, `bidSecurityService.js`, `disputeCron.js`. This is a real, concrete gap - these functions likely return objects with unpopulated relation fields (e.g. `escrow.buyer` as a bare ID rather than a populated user object) where calling code may expect the populated shape, a plausible source of subtle `undefined`-access bugs in fraud detection, escrow anomaly detection, and lead management specifically. Not fixed this phase - flagged as a real, bounded P1 item (section 3).

---

## 3. P0 / P1 / P2 Classification

### P0 - Blockers (must resolve before any production launch)
1. Escrow system split (Phase 8): escrow_vaults has no real table; a real product decision is required before any escrow-vault-based flow (OTP release, admin refund via that path) can function at all.
2. Fake transaction layer (Phase 7/8): utils/supabaseSession.js provides zero real atomicity; affects bidController.js, escrowVaultController.js, reviewController.js, favoriteController.js. One concrete race condition already found and fixed (bid confirmation); the underlying pattern remains unaddressed elsewhere.
3. Cookie SameSite=Lax cross-origin concern (Phase 2): if confirmed against live Vercel+Render, the entire login flow may not persist a session for real users. Not yet live-verified.
4. Redis not provisioned in render.yaml: if production genuinely lacks Redis, background-job/queue-dependent behavior - and possibly server responsiveness itself, per this sandbox's own observed hang - may not work as designed.
5. MPESA_ENV also not provisioned in render.yaml (found in PHASE1_ARCHITECTURE_HARDENING.md): production would silently default to "sandbox" mode - including sandbox-level M-Pesa IP whitelisting - unless set manually outside this repository's deployment config. Same category of risk as #4: a behavior-critical variable with no startup validation to catch its absence.
6. No live, reachable database anywhere in this program's environment: every fix and finding in this entire program is evidence-based against static schema/code analysis, never confirmed by a live run. This is the single largest source of residual uncertainty in every other finding.

### P1 - Hardening (should resolve before scaling, not necessarily before initial launch)
1. Full backend authorization audit - only 1 of 92 route files spot-checked for correct permission-helper usage.
2. payment_attempts/refund processing/reconciliation-tool wiring left incomplete (Phase 6/7).
3. Admin panel disconnection - real backend exists, frontend doesn't call it.
4. mapBackendCarToVehicle()'s unconstrained-column-to-strict-union casts (condition, bodyStyle, transmission, fuelType) - a named, undertested risk (Phase 7).
5. Server startup hang observed in this sandbox, never root-caused (Phase 0 of this session).
6. E2E test suite exists but has never been run - unknown pass/fail state.
7. The other 9 of 11 "enterprise platform" schema-vs-model clusters not yet spot-checked (only governance/AI checked; both turned out to have real, differently-named tables, suggesting the true unbuilt-model count may be lower than 116).
8. 8 backend files have unresolved `.populate()`-to-separate-query TODOs from the Supabase migration (`escrowAnomalyDetectionService.js`, `fraudDetectionService.js`, `leadService.js`, `organizationService.js`, `escrowAuditService.js`, `auctionIntegrityService.js`, `bidSecurityService.js`, `disputeCron.js`) - fraud detection and escrow anomaly detection are among the affected files, giving this more than cosmetic weight despite being framed as a TODO cleanup item.

### P2 - Cleanup (safe to defer indefinitely without functional risk)
1. confirmPayment()/failPayment() dead code in paymentService.js - flagged, not removed.
2. UserProfile duplicate type definition in src/types/index.ts.
3. Systematic TODO/FIXME grep across the codebase - done this phase (see section 2 and P1 #8); frontend clean, backend's 8 matches escalated to P1 given the affected files' relevance to fraud/escrow detection.
4. auctions table reference in paymentCallback.service.js (Phase 8 section 2) - presently-unreachable code path, low urgency given it doesn't affect the fixed race condition.

---

## 4. Environment Configuration (Confirmed This Phase)

Node/npm: Node >=20.x (backend package.json engines field), .nvmrc specifies 22. Frontend package.json has no engines field - inherits the same Node version by convention, not enforced. This sandbox runs Node v22.22.2/npm 10.9.7, consistent with .nvmrc.

Required production environment variables (from render.yaml, the authoritative deployment config):
NODE_ENV, PORT, SUPABASE_URL, SUPABASE_SERVICE_KEY, SESSION_SECRET, JWT_SECRET, REFRESH_TOKEN_SECRET, FRONTEND_URL, BACKEND_URL, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, WEBHOIST_EMAIL, ADMIN_EMAIL.

Notably absent from render.yaml: any REDIS_URL/REDIS_HOST variable. .env.example documents Redis as optional with an in-memory fallback when unset - but this sandbox's own server-start test (Phase 0 of this session) showed the live process hanging on basic requests alongside repeated Redis connection failures, which is not obviously consistent with a clean, complete in-memory fallback for every Redis-dependent code path (queues in particular). This inconsistency is not resolved in this document - flagged as a P0 item (section 3) requiring live investigation, not assumed safe either way.

Production/staging differences: not independently audited this phase - NODE_ENV=production is the only environment-branching value confirmed in render.yaml; whether a staging environment exists at all is unknown.

---

## 5. Dependency Map of Critical Workflows (Text Form)

```
Buyer bid flow:
  Frontend (mock UI) -x-> [not connected]
  Real path: bidController.placeBid
    -> initiatePayment() [paymentService.js] -> mpesaService.stkPush()
    -> payments row (pending) + payment_attempts row (Phase 7)
    -> M-Pesa callback -> mpesaIpWhitelist -> validateMpesaCallback
    -> idempotencyCheck -> webhook dedupe check (Phase 6)
    -> paymentCallback.service.js.handleMpesaCallback()
    -> amount verification -> payments row (success) -> payment_events logged
    -> bids row (paid) -> cars row (currentBid/highestBidder, race-condition-safe as of Phase 8)
    -> escrows row created (if purchase type, gated on seller verification)

Escrow release flow (SPLIT - see P0 #1):
  Path A (real): /api/escrow -> escrowController.js -> escrows table (works)
  Path B (no table): /api/escrow-vault -> escrowVaultController.js -> EscrowVault model -> escrow_vaults (DOES NOT EXIST)

Auth flow (real, connected):
  AuthModal.tsx -> authApi.ts -> POST /api/v1/auth/login (credentials: include)
    -> authController.js -> httpOnly cookie set (SameSite=Lax - see P0 #3)
    -> AuthContext.tsx -> role-mapped (1:1 preserved, Phase 2) -> protected UI

Vehicle listing flow (partial):
  App.tsx mount -> vehicleApi.getCars() -> GET /api/cars
    -> carController.getCars() -> Supabase query (location field fixed, Phase 6)
    -> mapBackendCarToVehicle() -> vehicles state (falls back to mock on any failure, Phase 7)
```

---

## 6. Confirmed Live-vs-Mocked Summary

| System | Live/Connected | Mocked/Disconnected |
|---|---|---|
| Authentication | Live (frontend<->backend fully wired) | - |
| Vehicle list (top-level) | Live-attempted, mock-fallback | Falls back honestly when unreachable |
| Auctions, bidding, escrow, inspections, admin config | - | Fully mocked in UI, real backend code exists but not called |
| Payments, M-Pesa, CMS, notifications, analytics | Backend real | No frontend UI at all |
| Live database | - | None reachable anywhere in this program's environment |
| Live deployed backend | - | None reachable - server-start behavior only tested in this sandbox, with an unresolved hang |

---

## 7. What This Baseline Does Not Cover (Explicit)

Chat (system 18) was not independently investigated beyond table existence. TODO/FIXME items were not systematically grepped. Docker image build/run was not independently tested. GitHub Actions workflows were not independently executed. E2E tests were not run. Staging-vs-production differences were not audited beyond the single NODE_ENV branch point found in render.yaml. These are named as open scope for a future phase, not silently assumed complete or safe.
