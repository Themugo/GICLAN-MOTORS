# KAYAD Transaction Lifecycle Integrity

This update converges the auction/payment lifecycle onto database-authoritative state transitions.

## Included

- Removed stale undefined transaction-session references from bid payment/error paths.
- Replaced application-side auto-bid writes with `kayad_auto_bid_atomic`.
- Added atomic auction close/settlement through `kayad_close_auction_atomic`.
- Winner/loser settlement and car sold-state changes now occur under the same car row lock.
- Admin/dealer auction-ending paths converge on the canonical close service.
- Forced winner/accept-bid paths use the same atomic close operation.
- Refund instructions use the canonical `refunds` ledger with duplicate active-refund protection.
- Refund reconciliation reads `refunds`, not historical payment rows.
- Removed stale undefined transaction-session references from favorites.
- Added transaction-integrity contract validation.

## Verification

Targeted JavaScript syntax checks pass for all changed application files.

`node scripts/validate-transaction-integrity.mjs` passes all checks.

The package also carries the existing Phase 14 refund/reconciliation migration and validation contract so copying this package does not drop that baseline.

The full Vitest suite was not executable in the packaging environment because dependencies were not installed (`vitest: not found`). Run `npm ci` followed by `npm test -- --run` locally/CI before production deployment.
