# KAYAD HARDENING — PHASE 5: DATABASE AND API CONTRACT VERIFICATION

Scope per instructions: no features, no schema redesign, Supabase migrations treated as the authoritative schema throughout. This phase prioritized depth over breadth given the time available: one critical workflow (vehicle listings) was traced completely, end-to-end, against a real database, and a severe, previously-unknown production-breaking bug was found and fixed as a direct result. Full workflow coverage of every item in the instructions' audit list (escrow, bidding, disputes, etc.) was not completed - named honestly below, not glossed over.

---

## Method: real verification, not code-reading alone

A real PostgreSQL 16 database was built from this project's own 24 migration files (one seed-data migration, `seed_demo_vehicles.sql.sql`, was skipped - it has its own real bug, a `text[]` value inserted into a `jsonb` column, unrelated to the fix below and out of this phase's scope to fix since it's demo/seed data, not schema). A real PostgREST instance was run against it, and the backend's actual controller code was executed against that real stack - not mocked, not assumed. This is the same standard of evidence used throughout this project's history when a claim needed to be more than a plausible guess.

---

## CRITICAL FINDING — `GET /api/cars` was completely broken, guaranteed to fail on every real request

This is the exact endpoint `src/services/vehicleApi.ts`'s `getCars()` calls - the one this project's own Phase 3 work connected the real marketplace UI to. Reproduced directly: calling the real controller against a real, correctly-migrated database returns **HTTP 500 on every single call**, unconditionally - not an edge case, not a specific filter combination, the default, no-filter request fails.

### Root cause 1: two wrong field aliases in `backend/utils/fieldMap.js`

`FIELD_ALIASES.cars` mapped the application-level field `brand` to a database column named `make`, and `fuel` to `fuel_type`, and `engine` to `engine_capacity`. All three are wrong - verified directly (`\d cars` against the real, migrated table): the real columns are named exactly `brand`, `fuel`, and `engine` - identical to the app-level names, needing no alias at all. Since `getCars()`'s own `.select()` call always includes `brand`, this alone guarantees a `column cars.make does not exist` (Postgres error 42703) on every request. The same file's `SEARCHABLE_FIELDS.cars` (used for keyword search) had the identical wrong `"make"` reference.

**Likely origin, stated for context, not as an excuse:** `src/services/vehicleApi.ts`'s own file header (written in earlier work on this project) already documented that an older version of that file was "built against `backend/db/schema_clean.sql`, which turned out to be a STALE, SUPERSEDED schema definition." The wrong aliases in `fieldMap.js` are consistent with the same stale-schema source - never corrected here even after the frontend client itself was.

### Root cause 2: the controller's own `.select()` field lists reference a field that doesn't exist or have an alias

Separately, `getCars()`'s two `.select()` calls (the `$text`-search branch and the default branch) both listed a field named `location` - not `city` (which has a real, correct alias to `location_city`) and not `location_city` directly. `location` matches no alias entry and no real column, so it fails with `column cars.location does not exist` once the `make`/`fuel`/`engine` issue above was fixed and this next layer was reached.

### Root cause 3 (found, not exploited by the reproduction above, but a real, separate bug): the `catch` block itself throws a second, masking error

`getCars()`'s `catch` block logs `query`, `pageNum`, `limitNum`, and `sortOption` for diagnostics - but all four were declared with `const`/`let` *inside* the `try` block, which JavaScript does not expose to that same block's own `catch`. The practical effect, confirmed directly while reproducing the bugs above: any real failure inside the `try` block doesn't reach the person reading the logs - it's replaced by a second, unrelated `ReferenceError: query is not defined` thrown from the logging code itself. **This means the two real bugs above have likely been invisible in this project's own error logs the entire time they existed** - the logging meant to reveal the problem was itself broken.

### Fix

- `fieldMap.js`: removed the wrong `brand`/`fuel`/`engine` alias entries (the real columns need none) and fixed `SEARCHABLE_FIELDS.cars`'s `"make"` to `"brand"`.
- `carController.js`: fixed both `.select()` field lists to use `city` (the correct, real alias) instead of `location`.
- `carController.js`: hoisted `query`/`pageNum`/`limitNum`/`sortOption` to be declared before the `try` block, so the `catch` block's own diagnostic logging can no longer throw a second, masking error.

### Verification

Reproduced the original failure first (confirmed `HTTP 500`, `column cars.make does not exist`), applied the three fixes, and reproduced success against the same real database: `HTTP 200`, a real row returned with real, correctly-named columns (`brand`, `location_city`, `auction_status`, etc.) present in the response. Backend's own test suite re-run after the fix: 216/216 passing, unchanged. Frontend typecheck: 0 errors, unchanged.

---

## SECOND CRITICAL FINDING — `POST /api/bids/:id/bid` (place a bid) also fails on every real request, for two separate reasons

Traced next given this project's own auction UI is its most elaborate, recently-worked-on feature. Same method as above: reproduced against the real database, not assumed from reading code.

### A third stale-field bug, same pattern as `GET /api/cars`

`placeBid()`'s own `.select()` calls (4 separate call sites in `bidController.js`, all fetching a bidder's contact details before sending a bid confirmation) requested a column named `notifications` on the `users` table. Confirmed directly (`\d users` against the real, migrated table): no such column exists at all. Since this is a hard SQL error - not a soft, JS-level `undefined` the way a missing object property would be - this alone made every single bid attempt fail immediately, before a bid was ever actually evaluated. Fixed by removing `notifications` from all 4 `.select()` calls - not by adding a new column, per this phase's own "do not redesign the database for convenience" instruction. The code's own existing optional-chained reads (`bidder?.notifications?.sms !== false`) already treat a missing/absent value as "send the notification," so this is a pure bug fix with no behavior change beyond "no longer crashes."

### A missing model method

Once the above was fixed, the same real request failed differently: `Bid.getHighestBid is not a function`. Confirmed directly: this method is called in 2 places in `bidController.js` but was never defined anywhere in this codebase - `models/Bid.js` was a bare, one-line wrapper with no custom methods at all. Implemented using this model's own, already-verified-working `find()`/`sort()`/`limit()`/`lean()` chain (the identical query-construction path already confirmed correct while fixing `GET /api/cars` above) - not new, separate query logic.

### Verification

After both fixes, the same real request against the same real database progressed correctly through bid validation (auction-is-live check, self-bid check, minimum-increment check, the real, now-fixed `getHighestBid` lookup) and reached the point of actually initiating an M-Pesa STK push payment - where it stopped for a reason that is not a bug: this sandbox has no real M-Pesa Daraja API credentials configured, which the code correctly detects and reports (`"M-Pesa not configured — set Daraja keys in Admin Settings"`). This is the correct, expected boundary of what can be verified without real, external payment-provider credentials - not a third bug. Backend test suite re-run after both fixes: 216/216 passing, unchanged.

---

## THIRD FINDING — the real, canonical auction UI never calls any of this backend at all

While tracing the frontend side of the bidding workflow to compare request/response shapes (this phase's own stated goal), found that `AuctionsView.tsx` - the component this project's own most recent work (the `VehicleMarketplace`/`AuctionsView` cutover) promoted to the sole, canonical, shipping implementation - does not make a single real network call to place a bid, anywhere. Its `sessions` state initializes from `INITIAL_AUCTION_SESSIONS` (mock data) and every bid-related action is a local `setSessions(prev => ...)` state update - never persisted, never reaching another user, gone on page refresh.

A separate, real frontend client for this domain does exist (`src/services/auctionService.ts`, wrapping the legacy `auctionAPI` from `src/api/api.exports.ts`, itself flagged as a legacy system in this project's own Phase 2 work) - but it has zero real consumers anywhere in the codebase (confirmed by a direct repository-wide search), and it only implements read operations (`list`/`get`/`active`/`my`) - no bid-placing function exists in it at all, so even reconnecting it would not close this gap on its own.

**Not fixed this phase.** Wiring the real, now-working `POST /api/bids/:id/bid` endpoint into the real `AuctionsView` UI is a substantial integration effort (matching the scale of this project's own Phase 3 vehicle-data work, which took a full, dedicated pass) - attempting it as a rushed addition to a phase already focused on finding and fixing two critical, reproduced backend bugs risked doing both pieces of work poorly. Documented here as the clearest, highest-value next step for this specific domain, with the backend side now confirmed actually functional and ready to be connected to.

---


- **Field names**: audited exhaustively for the `cars` table specifically (the above finding). Not repeated for other tables' alias tables this phase (`users`, `inspector_applications`, `inspection_orders`, `payments`, `escrows`, `user_auth` all have their own `FIELD_ALIASES` entries in the same file, not individually re-verified against real columns this phase - flagged as the clearest, most direct next step given the method that found the `cars` bugs).
- **IDs**: `cars.id` is a real `uuid` with `gen_random_uuid()` default - confirmed via `\d cars`.
- **Foreign keys**: `cars.dealer_id`, `cars.highest_bidder_id` are real, present columns (both correctly aliased). Not verified this phase whether they carry real `REFERENCES` constraints at the database level (schema inspection showed the columns exist and are typed `uuid`; constraint-level enforcement was not separately queried).
- **Nullable fields**: confirmed via `\d cars` - only `id`, `title`, `brand`, `model`, `year`, `price` are `NOT NULL`; everything else (including `mileage`, `fuel`, `vin`) is nullable, consistent with `mapBackendCarToVehicle`'s own defensive `?? 0` / `|| ''` fallbacks in `vehicleApi.ts`.
- **Timestamps**: `created_at`/`updated_at` real, `timestamp with time zone`, confirmed present.
- **Soft deletes**: `cars.deleted_at` and `deleted_by` columns exist (confirmed in the real row returned above) - not verified this phase whether `getCars()` or any other query path correctly excludes soft-deleted rows (the query only filters on `status`/`isDemo`, not `deleted_at` - a real, open question flagged here, not confirmed either way as correct or a bug given time).
- **VIN uniqueness**: `cars.vin` is a plain nullable `text` column with no unique constraint visible in the base table definition from `\d cars` - not confirmed whether a unique index exists elsewhere in the migration set; not verified this phase.
- **Pagination**: confirmed real and bounded - `limitNum` is clamped `1..100` server-side regardless of what a client requests, preventing an unbounded query.
- **Sorting/filtering**: confirmed the query-building logic itself (the `$gte`/`$lte`/`$regex`/`$in`/`$or` translation layer in `_base.js`) works correctly end-to-end now that the two bugs above are fixed - the successful `HTTP 200` response above went through this exact translation path.

---

## Not completed this phase - named directly

Given the depth required to find and properly fix the critical bug above (setting up a real database and PostgREST instance, reproducing failures, isolating root causes across three separate layers), the full breadth of workflows this phase's instructions named was not traced with the same rigor:

- **Auctions/bidding, escrow, inspections, disputes, chat, administration** - not individually traced end-to-end against a real database this phase. Given the `cars` table's own alias table had 3 wrong entries out of 8, and this project's Phase 0 audit already found 162 of 186 total model-to-table mappings point to non-existent tables, it would be a mistake to assume these other workflows are correct without the same direct verification - they are unverified, not confirmed safe.
- **Ownership checks, role constraints, unique constraints (beyond VIN), idempotency, ID/FK constraint-level enforcement** - not audited this phase beyond what's noted inline above.
- **Response-shape comparison against consumers for any endpoint other than `GET /api/cars`** - not performed.

---

## Files changed this phase

- `backend/utils/fieldMap.js` — removed 3 wrong field aliases (`brand`, `fuel`, `engine`), fixed 1 wrong searchable-field reference.
- `backend/controllers/carController.js` — fixed 2 `.select()` field-list references (`location` → `city`), fixed a variable-scoping bug that was masking real errors in this endpoint's own diagnostic logging.
- `backend/controllers/bidController.js` — removed a non-existent `notifications` field from 4 `.select()` calls.
- `backend/models/Bid.js` — implemented the missing `getHighestBid` static method, called in 2 places but never defined anywhere.

No database schema was changed for any of the fixes above - every one was a bug in backend code being wrong relative to the real schema, not the schema needing to change. No frontend files were changed - the vehicle-listing frontend client (`vehicleApi.ts`) was already correct; the auction/bidding frontend was found to be entirely disconnected from any of this backend work (see Third Finding above), which is a real, separate, larger gap, not something this phase's bug-fixing work could or should silently paper over.

STOP per instructions — no new features.
