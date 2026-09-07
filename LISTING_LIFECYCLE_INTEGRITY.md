# KAYAD — Listing Lifecycle Integrity

## Scope

This hardening pass keeps vehicle listing edits, deletion bookkeeping, location persistence, and audit history aligned with the authoritative application/database contract.

## Completed

- Vehicle edit audit events now snapshot the listing **before** mutation, so old/new values are not identical post-save copies.
- Audit comparisons use the application's real listing fields (`brand` and `city`) instead of stale names (`make` and `location`).
- Vehicle edits with `city`/`address` now persist through the real `cars.location_city` mapping instead of attempting to write a nonexistent `location` column.
- Deleting a listing decrements the active `listingCount` only.
- `trialListingsUsed` is no longer decremented on deletion: trial usage represents consumed entitlement, not current inventory.
- Admin listing deletion follows the same entitlement rule as seller deletion.

## Deliberate boundaries

- No new listing tables were introduced.
- No trial entitlement is refunded by deleting a vehicle.
- Listing-limit concurrency is not represented as fixed by application-side counters; that remains a separate database-atomicity concern.

## Validation

Run:

`node scripts/validate-listing-lifecycle-integrity.mjs`
