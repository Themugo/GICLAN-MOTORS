# KAYAD Production Integration Audit

Date: 2026-09-09

## Completed repair scope

- Vercel routing now proxies `/api/:path*` to `https://api.kayad.space/api/:path*` before the SPA fallback.
- Browser authentication/data transport remains on the KAYAD Express API with HttpOnly JWT cookies.
- Browser Supabase JS/Realtme client duplicates were removed. Supabase remains a backend data/storage dependency only.
- Browser realtime now uses the existing backend Socket.IO server, with credentials enabled and automatic reconnect.
- Socket.IO authentication accepts the backend HttpOnly `token` cookie.
- Auction room joins are validated against real cars and map to the `car_<id>` rooms used by backend auction emitters.
- Private chat room joins require authenticated participation in the requested chat.
- Showroom room join/leave and auction leave contracts are explicit.
- Authentication cookie path covers both `/api` and Socket.IO handshakes.
- Docker context no longer excludes `backend`; the stale `COPY backend/realtime` instruction was removed.
- Backend compatibility facades and atomic auction adapters were restored and verified.
- Legacy duplicate PaymentModal/InternalNotes/chat surfaces were removed in favor of canonical implementations.
- Deployment validators were aligned with the actual architecture instead of stale Supabase-browser assumptions.
- Dependabot auto-merge workflow API call was corrected from the unavailable `getCombinedStatus` method to `getCombinedStatusForRef`.
- Supabase production received additive security/runtime hardening migrations for the car-view RPC and SECURITY DEFINER helper search paths/execute privileges.

## Verification

Targeted static/integration gates passed 15/15:

1. Phase 34 API governance
2. Phase 59 environment contract
3. Phase 60 deployment contract
4. Deployment readiness
5. Frontend runtime contracts
6. Backend runtime contracts
7. Production backend contracts
8. Socket.IO contract
9. Communications initiative
10. Chat convergence
11. UI surface convergence
12. Dispute integrity
13. Subscription domain E2E static gate
14. Supabase migration preflight
15. Marketplace core

Additional backend JavaScript syntax checking passed for the complete backend tree.

## Supabase production verification

The live Supabase project was checked after the hardening migrations. The four targeted helper RPC privilege checks now report:

- `increment_car_views`: anon=false, authenticated=false, service_role=true
- `rls_auto_enable`: anon=false, authenticated=false, service_role=false
- `sync_profile_from_user`: anon=false, authenticated=false, service_role=false
- `update_car_bid_stats`: anon=false, authenticated=false, service_role=false

The ten previously flagged mutable-search-path functions were also verified in PostgreSQL with `search_path=public, pg_temp`.

Supabase still reports informational `RLS enabled, no policy` findings on many tables. Those tables are intentionally backend/service-role mediated in the current architecture; the finding does not mean RLS is disabled.

## Runtime limits of this audit

The execution environment is Node 22.16.0, while the repository deliberately requires Node >=22.22.2. A strict `npm ci` therefore correctly refused to install. A dry-run with engine checking disabled resolved the lockfile successfully, but a full dependency installation timed out in the sandbox. Consequently, a local Vite build/Vitest run was not falsely marked as passed.

Likewise, no Vercel/Render production deployment credentials were available to this working environment, so live deployment smoke tests were not represented as successful. The repository is prepared for the actual CI/deployment environment, which uses Node 22.22.2.


## Production follow-up hardening — 2026-09-09

- Live Supabase advisor review found one externally callable `SECURITY DEFINER` helper (`public.is_admin()`). It was revoked for `public`, `anon`, and `authenticated`; the `ad_slots` admin policy was converged to an inline role check using a scalar subquery.
- Live duplicate-index findings were verified and removed: `idx_cars_search_brand_model` duplicates `idx_cars_brand_model`; `uq_payments_checkout_request_id` duplicates `idx_payments_checkout_request_unique`.
- Remaining RLS-no-policy findings are INFO-level on service-role/backend-mediated tables and were not mass-converted into permissive client policies.
- Public production DNS could not be exercised from the sandbox runtime, so no claim is made that an unauthenticated browser/API smoke test passed from this environment. GitHub/Vercel status for commit `71a7bc04` remained successful before this follow-up.

## Search & Discovery — End-to-End Initiative (2026-09-09)

Implemented and production-applied the seller-defined vehicle identity/search convergence.

- Added `public.vehicle_identities` as the persistent identity registry for seller-created makes/models.
- A `cars` trigger learns a new brand/model automatically when a listing is created; sellers are not blocked by a closed/predefined catalogue.
- Identity names are normalized for matching while preserving the seller's first/observed display identity.
- Listing popularity is tracked and corrected on identity changes; unchanged edits do not inflate counts.
- Search autocomplete now uses the live database identity registry plus live available inventory rather than a hardcoded brand list.
- The main search service now searches across title, brand, model, description, VIN, chassis number, registration number, engine, drivetrain, body type, fuel, transmission, colour, condition and location.
- The primary search bar no longer falls back to hardcoded default brands when live suggestions are unavailable.
- The home/global search input now consumes the same real backend autocomplete source.
- Added `scripts/validate-search-discovery-contract.mjs`; it passes.

Production verification:
- Supabase migration `20260909090001_vehicle_identity_registry` applied successfully.
- Supabase migration `20260909090002_vehicle_identity_trigger_correctness` applied successfully.
- Live identity registry currently contains 0 identities because the production `cars` table currently contains no qualifying inventory rows; this is expected and will populate automatically with the first seller listing.
- TypeScript/full frontend dependency verification remains environment-limited because the sandbox does not have the project's installed node_modules; this is not reported as a pass.
