# Financial Ledger & Reconciliation Domain

## Canonical model

`ledger_accounts` and append-only `ledger_entries` are the canonical financial journal. Financial writes use atomic database functions and idempotent `(external_reference, source)` keys.

`reconciliation_reports` and `reconciliation_records` are the canonical reconciliation evidence layer.

## Rules

- Do not write financial events directly to `transaction_ledger`.
- Payment, escrow, subscription, inspection and auction services should post to `ledger_entries` through `ledgerService`.
- Corrections are compensating reversal entries; original ledger entries remain immutable.
- Reconciliation reports are service-owned and not directly exposed to browser roles.
- Legacy `/api/v1/ledger/*` write endpoints are compatibility endpoints only and return `410`.
- Financial reconciliation compares provider/payment/escrow/release records and records evidence per report.

## Verification

Run:

`node scripts/validate-financial-ledger-reconciliation-domain.mjs`

The migration must be applied in the target KAYAD Supabase environment before live reconciliation reports are enabled.
