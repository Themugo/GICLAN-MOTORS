# KAYAD Escrow Dispute Domain — End-to-End Consolidation

Date: 2026-09-07

## Decision

Vehicle-purchase disputes are now a workflow on the authoritative `escrows` record. The old standalone `disputes` model/controller persistence path was removed because the production database source-of-truth audit identified `escrows.status = disputed` plus `disputeReason`, `disputedAt`, and `disputedBy` as the real vehicle-purchase dispute representation.

## Canonical lifecycle

`escrows.status` owns the financial lock:

`pending/funded/vehicle_confirmed/delivered -> disputed -> refunded/released -> closed`

`escrows.disputeWorkflowStatus` owns the case workflow:

`open -> under_review -> mediation -> resolved -> appealed -> under_review`

The workflow state never replaces the financial escrow state. Funds remain in `disputed` until an atomic financial resolution changes the escrow to `refunded` or `released`.

## Persisted dispute data

The escrow now carries:

- title, description, category and priority
- workflow status and assigned officer
- dispute timeline
- evidence metadata and Cloudinary URLs
- internal notes
- mediation details
- resolution details
- appeal details
- last idempotency action key

## Financial controls

`kayad_resolve_dispute_atomic` locks the escrow row and validates the requested decision before changing any financial state.

- Full refund: buyer receives the full escrow amount; seller receives zero.
- Partial refund: refund must be greater than zero and less than the escrow amount; the remainder is seller-side settlement.
- Release/dismiss: seller receives escrow amount less the configured platform commission.
- Split settlement: seller + buyer + platform fee must exactly equal the escrow amount.
- Repeated requests with the same idempotency key are treated as idempotent.

Payment and vehicle settlement updates happen in the same database transaction as the escrow decision.

## UI/API compatibility

The existing `/api/disputes/*` API surface remains available so the existing dispute pages do not require a route migration. Those endpoints now resolve to the escrow-backed service. Dispute detail, evidence, mediation, resolution and appeal screens therefore operate on the same financial record as EscrowView.

## Cleanup

Removed the unused standalone dispute model, evidence model and legacy resolution service. Operations/admin/cron dispute reads were redirected to `escrows` so dashboards no longer query a nonexistent parallel dispute table.
