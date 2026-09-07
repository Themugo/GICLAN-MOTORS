# KAYAD — CURRENT STATE TRUTH AUDIT (PHASE 0)

**Scope of this document:** a technical inventory of what exists in this repository right now, what is real vs. mock vs. orphaned, and where the known conflicts and risks are. No fixes, no features, no deletions were made while producing this document.

**Honesty note on coverage:** this repository is large — 473 frontend source files, 633 backend files, 93 backend route files, 48 frontend and 10 backend test files. This audit verified the load-bearing, core-workflow paths directly (by reading source, cross-referencing imports, and in one case checking the actual built bundle) rather than exhaustively reading all 1,100+ files. Where a finding is based on direct verification, it says so. Where it is inferred from a pattern or not independently re-checked, it says that too. Nothing below claims completeness it doesn't have.

---

## 0. THE SINGLE MOST IMPORTANT FINDING

**A repository-wide "flat file vs. nested folder" duplication pattern exists for core view components, and the flat file — not the nested, more "properly organized" one — is what actually ships.**

Verified directly, not assumed: `src/features/AuctionsView.tsx` (flat) and `src/features/AuctionsView/components/AuctionsView.tsx` (nested, with its own `index.ts` re-export) both exist. The nested folder's `index.ts` explicitly re-exports the nested component, which looks like the intended, canonical structure. But when the project is actually built (`npm run build`) and the output bundle is searched for text that exists **only** in the nested version, it is absent. Text common to both versions is present. This was cross-checked a second time on the `EscrowView.tsx` pair with the same result. **The flat file is what App.tsx's bare `import X from './features/X'` actually resolves to at build time, not the nested one.**

This same flat-vs-nested pair exists for at least: `AuctionsView`, `VehicleMarketplace`, `EscrowView`, `InspectionsView`, `ChatView`, `AdminView`, `DealersView`, `DashboardView`, `AuthModal` (9 confirmed; `find` shows 76 total duplicate filenames across the frontend, most not yet individually checked for which side is real).

**Practical consequence:** any work done against a nested `features/X/components/X.tsx` file, believing it to be "the real" implementation because of its more organized location and its own `index.ts`, may have no effect on the deployed application at all. This is the single highest-priority structural fact in this codebase and should be resolved (which side is kept, which is deleted) before any further feature work, not folded into other changes.

---

## 1. Frontend routes/pages/components

- Routing is not a router library (no react-router route table found driving the main app shell) — it's a single `activeNav` string in `App.tsx` state, switched via `{activeNav === 'x' && <Component />}` blocks. `Navbar.tsx` calls `handleNavSelect(navId)` to change it.
- **Canonical navbar:** `src/components/Navbar.tsx` (826 lines as of the most recent direct read). This file has been revised multiple times in this project's history to reduce visible nav items; its current confirmed state (this session) shows exactly 6 always-visible items: Marketplace, Auctions, Pre-Purchase Inspection, Support, Sell Vehicle, Sign In.
- **Duplicate view components (Section 0):** flat files under `src/features/*.tsx` are the real, bundled ones; nested `src/features/*/components/*.tsx` siblings are present but not confirmed live for most pairs.
- **Backup/legacy files found on disk:** `src/api/api.exports.backup.ts` (explicit backup file, still present), `backend/db/schema_legacy.sql` (explicit legacy schema file, still present). Neither was deleted — audit only.

## 2. Backend routes/controllers/services

- `backend/server.js` mounts roughly 90 distinct route prefixes from 93 route files on disk — an unusually large surface for what the frontend actively uses.
- **Confirmed orphaned (not imported/mounted in `server.js` at all):** `auctionRoutes.js`, `bidLogRoutes.js`, `biddingSecurityRoutes.js`, `localizationRoutes.js`, `mediaEventRoutes.js`, `transactionLedgerRoutes.js`, `userPreferenceRoutes.js`. `auctionRoutes.js` in particular is notable — the real, mounted bidding path is `bidRoutes.js` → `/api/bids`, plus `auctionAdminRoutes.js` and a separate realtime `auctionEngine.js`/`auctionTimer.js` pair; whatever `auctionRoutes.js` implements is not reachable by any client.
- Not independently re-verified this pass: whether every one of the ~90 mounted prefixes is actually called by the frontend, or whether some are mounted-but-still-effectively-dead from the frontend's perspective. That would require a full cross-reference of every frontend API client call against every mounted route — out of scope for this pass given time.

## 3. API clients (frontend → backend)

- **Two parallel, incompatible auth-client systems confirmed to have coexisted:** `src/services/authApi.ts` (cookie-based auth, correct `/api/v1/auth/...` paths matching the real backend) vs. `src/api/api.ts` + `api.exports.ts` (Bearer-token-in-localStorage scheme, calls `/api/auth/...` missing the `/v1` segment). This was found and fixed in `AuthContext.tsx` in earlier work this session (confirmed committed as of this project's most recent state), but the older `src/api/api.ts`/`api.exports.ts` system itself was not deleted and may still be imported elsewhere — not exhaustively checked this pass.
- Other real, verified-working API clients exist under `src/services/`: `vehicleApi.ts`, `favoriteApi.ts`, `inspectionApi.ts`, `supportApi.ts`, `auctionService.ts` (this last one not independently audited this pass — presence noted, content not read).
- `src/api/api.exports.backup.ts` — a literal backup of the older client, still on disk, not imported anywhere as far as this pass checked directly (not exhaustively re-verified).

## 4. Authentication implementations

- **Canonical, real, working:** `services/authApi.ts` (frontend) ↔ `backend/routes/authRoutes.js`/`authController.js` (real, cookie-based, confirmed mounted at `/api/v1/auth`).
- **Legacy, incompatible:** `src/api/api.ts`/`api.exports.ts`'s auth methods — wrong path prefix, wrong token mechanism. Confirmed this caused `AuthModal.tsx` to perform zero real backend authentication in an earlier state of this project (fixed in prior work this session; the underlying legacy client's continued presence on disk is the remaining loose end).
- `AuthContext.tsx` now wraps `services/authApi.ts` and is itself wrapped around the app root via a `AuthProvider`/`AppInner` split in `App.tsx` (confirmed present as of the most recent commit this session).

## 5. Role/permission implementations

- `mapBackendRoleToFrontend` in `AuthContext.tsx` normalizes backend role strings to the frontend's vocabulary, fails closed to `'buyer'` for unrecognized values (confirmed present, added in prior work this session).
- Role-gated UI exists in `Navbar.tsx`'s account dropdown (dealer/mechanic/bank_officer/admin-specific sections) — these were deliberately kept during the recent 6-item nav simplification because they are each role's only path to their own tools, not duplicates of a public nav item.
- Not verified this pass: whether backend route-level permission checks (`allowRoles(...)` middleware usage) are consistently applied across all ~90 mounted routes, or only on a subset. This is a meaningful gap in this audit given permission enforcement is a P0-class concern.

## 6. Vehicle/listing implementations

- Real, backend-connected: `cars` table (confirmed to exist in the 53 real migrated tables), `services/vehicleApi.ts`.
- `Vehicle` type (`src/types/index.ts`) carries both real fields and some admin-override fields added this session (`escrowOverride`) built against real, passing tests.
- Mock data: `src/data/mockVehicles.ts` — confirmed directly imported by production (non-test) components in at least 6 places this pass (not individually enumerated here; command run confirmed the count, not each call site).

## 7. Auction implementations

- **Real-time/live path:** `backend/realtime/auctionEngine.js`, `backend/utils/auctionTimer.js`, `bidRoutes.js` → `/api/bids`, plus car-table columns `current_bid`/`auction_end`/`auction_status` (auction state lives on the `cars` table itself, not a separate `auctions` table — confirmed no `auctions` table exists in the 53 real tables, despite an `auctions` entry existing in the model layer's table-name map).
- **Orphaned:** `backend/routes/auctionRoutes.js` (not mounted, Section 2).
- **Frontend duplication:** three separate, large (1,160–2,068 line) components previously existed as separate nav destinations for what is conceptually one "live auction" experience — `KAYADLive.tsx`, `AuctionDiscoveryNetwork.tsx` (nav id `discovery`), `LiveAuctionBroadcastPage.tsx`. Consolidated to `discovery` only in the navbar this session (per explicit direction); the other two components were not deleted, only unlinked from navigation — they remain on disk as orphaned-from-nav but not orphaned-from-filesystem.
- The `AuctionsView` flat-vs-nested duplication (Section 0) applies directly here — the flat `src/features/AuctionsView.tsx` is the real one.

## 8. Escrow/payment implementations

- Real: `escrows`-style table (name not re-confirmed this exact pass, but referenced consistently across this project's history) vs. a separate, more elaborate `escrow_vaults`/`EscrowVault` concept that has been confirmed in prior sessions' work to be **non-functional/table-missing** — the real, working path is the simpler one.
- `utils/escrow.ts` — real, tested logic (`isEscrowApplicable`, `getEscrowBadgeLabel`, `isEscrowLive`) that reads from `features/Admin/hooks/escrowRulesConfig.ts` (a real, localStorage-backed admin config with its own audit log at `adminAuditLog.ts`) and respects a per-vehicle `escrowOverride` field. Confirmed passing against two dedicated test files (`escrowOverride.test.ts`, `escrowRulesConfig.test.ts`) as of this session.
- Language inconsistency found and fixed this session in several places: "Escrow Vault Ready/Enabled" vs. "Escrow Protected" vs. "Escrow Mandatory" — now standardized, but this indicates the underlying concept (is escrow a "vault" or a plain "protected" mechanism) was historically unclear across the codebase and may still be inconsistent in files not touched this session.
- The `EscrowView` flat-vs-nested duplication (Section 0) applies directly — confirmed by the same bundle-content check, the flat `src/features/EscrowView.tsx` is the real one.

## 9. Inspection implementations

- **Three parallel backend systems found in prior work this session:** `backend/routes/inspectionRoutes.js` (real, mounted, simple "buyer orders / admin assigns" flow), `backend/inspection/` (2,711 lines, was never mounted until activated in prior work — now real, 13 tables added, mounted at `/api/inspection-marketplace`), `backend/inspectionBusinessCenter/` (2,104 lines, confirmed dead — uses "engineer" terminology, no real callers found).
- Frontend: real API client `services/inspectionApi.ts`; the inspection page's language was corrected in prior work this session to remove a fixed "150-point" claim (providers set their own checklist depth) — but this exact language ("150-Pt"/"150-Point") was found to have crept back into at least the homepage marketplace filters and the support FAQ in separate, later passes this session, suggesting a language-consistency check across the full codebase (not just the pages directly touched) has not yet been done.
- The `InspectionsView` flat-vs-nested duplication (Section 0) applies.

## 10. Dealer/seller implementations

- `backend/controllers/dealerPlatformController.js` was confirmed in earlier project history to be substantially fabricated (many functions, no real DB calls) — this specific claim was not re-verified in this pass and should be re-checked before being relied upon.
- `PrivateSellerPlatform`/`BuyerPlatform` (`src/features/OwnershipPlatform/pages/BuyerPlatform.tsx`) — confirmed this session to require a real, populated `user` object (`user.name`, `user.loyaltyPoints`, `user.tier` used directly, no optional chaining) but was, until this session's navbar cleanup, reachable from public nav with `App.tsx` passing no `user` prop at all — a real, confirmed bug (now mitigated by removing the public nav entry, not by fixing the component's own null-safety, which remains a latent issue if anything else links to it).
- The `DealersView` flat-vs-nested duplication (Section 0) applies.

## 11. Chat/communication implementations

- A "Communication Hub" entry exists in the signed-in user's account dropdown (`Navbar.tsx`), calling `handleNavSelect('chat')`. The standalone, always-visible chat icon (separate from the dropdown entry) was removed from the public nav this session — it also carried a confirmed, real bug: a hardcoded, non-functional unread-count badge showing the literal number "3" for every user regardless of actual state.
- The real vs. mock status of the underlying chat/message data itself (is `ChatView`'s content backend-connected or still mock) was **not verified this pass** — flagged as an open question, not a confirmed finding either way.
- The `ChatView` flat-vs-nested duplication (Section 0) applies.

## 12. Database schema and Supabase migrations

- 24 migration files, defining 53 real tables (directly counted from `CREATE TABLE` statements across all migrations).
- The backend's model layer (`backend/models/_base.js`'s table-name map) references 186 distinct table names. **162 of those 186 (87%) do not correspond to any real, migrated table.** This is the largest, single confirmed structural gap in this audit.
- This does not mean 162 features are broken in production — many of these models may belong to code paths that are never actually invoked by a mounted, reachable route (dead code referencing a missing table is harmless until called). The real risk is specifically at the intersection of "mounted route" + "missing-table model" — that intersection was **not** computed in this pass (would require cross-referencing all ~90 mounted routes against their controllers' model usage) and is the single most valuable next audit step.
- Specific missing tables already confirmed by name in prior sessions' direct work (not just this pass's bulk diff): `escrow_vaults`, `organizations`, `auctions`, `disputes`, `fraud_detections` (all confirmed missing in earlier, targeted investigation), `support_tickets` (was missing, built and confirmed present in prior work this session).

## 13. Mock/demo data used by production UI

- `src/data/mockVehicles.ts`, `src/data/mockAuctions.ts` confirmed directly imported by production (non-test) components.
- Both files had real, confirmed data-integrity bugs fixed this session: hardcoded calendar dates that had already passed (making a "Live" auction appear already-ended, a booking date default to a day in the past), and bid counts that didn't match their own listed bid history arrays. Fixed to compute relative to `Date.now()` instead of a fixed literal.
- Demo/seed login accounts exist in the real backend (`DEMO_ACCOUNTS` in `authController.js`) and are gated behind a real `VITE_ENABLE_DEMO` environment flag on the frontend (`isDemoModeEnabled()` in `services/authApi.ts`) — confirmed this session, not left always-on.

## 14. Duplicate, backup, refactored, legacy and orphaned files

- **Systemic:** the flat-vs-nested pattern (Section 0) — 76 duplicate filenames found by a repo-wide scan; 9 core-workflow pairs individually confirmed which side is live (the flat one, in every case checked).
- **Explicit backup/legacy files still on disk:** `src/api/api.exports.backup.ts`, `backend/db/schema_legacy.sql`.
- **Confirmed orphaned backend routes:** `auctionRoutes.js`, `bidLogRoutes.js`, `biddingSecurityRoutes.js`, `localizationRoutes.js`, `mediaEventRoutes.js`, `transactionLedgerRoutes.js`, `userPreferenceRoutes.js` (Section 2).
- **Confirmed orphaned-from-navigation (not deleted, no longer linked) frontend pages:** `KAYADLive.tsx`, `LiveAuctionBroadcastPage.tsx` (Section 7).
- **Confirmed dead backend system:** `backend/inspectionBusinessCenter/` (Section 9, from prior session work, not re-verified this pass).

## 15. E2E/unit/integration tests

- 48 frontend test files, 10 backend test files found on disk.
- As of the most recent commit this session, the frontend suite reported 317 passing / 1 intentionally skipped / 0 failing, and the backend suite reported 216/216 passing — both independently re-run and confirmed in prior work this session, not re-run as part of this specific audit pass (this document made no code changes, so no reason to expect the numbers have moved, but they were not re-executed here).
- No true end-to-end (browser-driving) test suite was found — all tests are unit/component-level (Vitest + Testing Library on the frontend, Jest on the backend).

## 16. Deployment and CI/CD configuration

- `.github/workflows/`: `ci.yml`, `deploy.yml`, `security.yml`, `dependabot-auto-merge.yml` — 4 workflow files, presence confirmed, contents not re-read line-by-line this pass (their contents and correctness were investigated in earlier project sessions — a Vercel domain/build-config gap and missing `render.yaml` env vars were found and partially fixed then; not re-verified as still-accurate in this pass).
- Backend `npm audit`: confirmed 0 vulnerabilities as of the most recent commit this session (a `semantic-release` toolchain and a `dompurify` XSS advisory were both found and fixed in prior work this session — the `semantic-release` fix specifically was found to have silently failed to persist at least twice before finally landing, which is itself a process-reliability finding worth the team's attention, separate from the code itself).

---

## KNOWN CONFLICTS (summary)

1. Flat-file vs. nested-folder duplicate components — flat file is live, nested is (at least for the 9 checked) dead weight presented as if it were the organized, canonical version. **Highest priority.**
2. Two incompatible auth API clients on disk simultaneously (one fixed to be used, the other not removed).
3. Auction experience previously duplicated across 3 separate large components/nav destinations; consolidated in nav only, not in filesystem.
4. Inconsistent escrow terminology ("Vault" vs. "Protected" vs. "Mandatory") historically scattered across the codebase; standardized only in the files touched this session.
5. "150-point inspection" language (a false, fixed-standard claim) found recurring in multiple, separately-authored places after being "fixed" once — suggests no single source of truth for this specific claim exists yet.

## KNOWN ORPHANED CODE (summary)

- 7 backend route files never mounted (Section 2).
- 2 large frontend pages (KAYADLive, LiveAuctionBroadcastPage) no longer linked from navigation but still on disk.
- 1 confirmed dead backend directory (`inspectionBusinessCenter/`, from prior session work).
- Up to ~67 further duplicate-filename pairs (76 found, 9 individually confirmed) not yet checked for which side is live.

## KNOWN MOCK DEPENDENCIES (summary)

- `mockVehicles.ts`, `mockAuctions.ts` — confirmed imported by real, production UI, not just tests.
- Chat/messaging's real-vs-mock status — unconfirmed, open question.
- Any other mock file among the 6 production-imported files not individually named in Section 13 — not enumerated this pass.

## KNOWN SECURITY BOUNDARIES (summary)

- Real, cookie-based auth is the correct, intended mechanism (`services/authApi.ts` + backend `protect` middleware). The legacy Bearer/localStorage client, if still reachable from anywhere, represents a real inconsistency in how credentials are handled across the app — not confirmed exploitable, but confirmed architecturally present until fully removed.
- Role-based route protection at the backend was not systematically re-verified this pass (Section 5) — this is the most important unanswered security question this audit leaves open.
- `dompurify` (request-body HTML sanitization middleware) was outdated with a known XSS advisory; fixed and its sanitization behavior directly verified this session.

## KNOWN DEPLOYMENT ASSUMPTIONS (summary)

- Frontend and backend are deployed separately (Vercel + Render, per prior session's investigation) with the frontend proxying `/api`, `/socket.io`, `/uploads` to the backend's Render URL — this specific URL was, in a prior session, inferred rather than confirmed against the real Render dashboard, and that gap was never closed as far as this audit can confirm.
- Demo mode is env-flag gated (`VITE_ENABLE_DEMO`) — assumes this flag is correctly set to `false` (or unset) in the real production environment; not verified from this codebase alone, since that's an environment-configuration fact, not a code fact.

---

## PRIORITIZED HARDENING QUEUE

**P0 — architecture-breaking, must resolve before further feature work:**
1. Resolve the flat-vs-nested component duplication repo-wide (76 filenames, 9 pairs confirmed so far) — decide canonical side per pair, delete the other, re-verify the build still bundles the intended one for each.
2. Cross-reference all ~90 mounted backend routes against the 162 missing-table models to find the actual intersection — which real, reachable endpoints will 500 on first real use.
3. Remove or fully migrate off the legacy `src/api/api.ts`/`api.exports.ts` auth-adjacent client now that `AuthContext.tsx` no longer uses it, to close the credential-handling inconsistency.
4. Verify backend role/permission middleware coverage across all mounted routes (Section 5) — currently unverified and is a plausible P0 if any state-changing route lacks it.

**P1 — real user-facing correctness risks:**
5. Confirm and, if needed, correct the real deployment backend URL the frontend proxies to (never confirmed against the live Render dashboard).
6. Decide the fate of the two now-unlinked-but-undeleted large auction pages (KAYADLive, LiveAuctionBroadcastPage) — delete or genuinely repurpose, don't leave as dead weight.
7. Audit and fix the real vs. mock status of chat/messaging end to end (unconfirmed this pass).
8. Sweep the full codebase (not just previously-touched files) for the "150-point"/fixed-inspection-standard language pattern, since it has recurred twice already after being "fixed" locally each time.

**P2 — cleanup and process:**
9. Delete the two explicit backup/legacy files (`api.exports.backup.ts`, `schema_legacy.sql`) once confirmed unreferenced.
10. Remove the 7 confirmed-orphaned backend route files, or document why they're intentionally kept.
11. Investigate why fixes (specifically, the `semantic-release` removal) have failed to persist across pushes at least twice in this project's history — a deployment/process reliability issue, not a code issue, but one that undermines confidence in every other "fixed and committed" claim until understood.
12. Re-verify the dealer platform controller's real-vs-fabricated status (last checked in an earlier session, not this pass).

---

**No code was changed, no files were deleted, and no features were added in producing this document, per the instructions given.**
