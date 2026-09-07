# KAYAD Inspection Marketplace — Integrity & Activation

Date: 2026-09-07

## Completed

This initiative activates and hardens the dormant inspection marketplace end-to-end without replacing the existing buyer inspection-order subsystem.

### Backend
- Fixed the dormant marketplace services to use the real Supabase compatibility adapter.
- Mounted the canonical `/api/inspection` API path used by the frontend.
- Preserved `/api/inspections` as a compatibility alias.
- Applied provider ownership authorization to provider-private routes.
- Closed customer booking IDOR on booking lookup and cancellation.
- Fixed the booking cancellation controller argument-order defect.
- Bound provider booking mutations to the provider in the URL.
- Bound report creation/read/PDF/share/revoke operations to the owning provider/customer/admin.
- Added provider-aware slot checks and database-level active-slot uniqueness.
- Added missing booking payment fields used by settlement code.
- Added database-level protection against duplicate completed inspection payments.
- Added provider-level starting price maintained from active packages so price sorting uses a real field.
- Removed the provider search filter against the nonexistent `deleted_at` column.
- Added basic non-negative financial integrity constraints.

### Frontend
- Fixed the marketplace API service to unwrap KAYAD's standard `{ success, data }` response envelope.
- Fixed the provider search contract so the UI receives the fields it actually renders plus pagination metadata.
- Removed hard-coded marketplace claims/statistics that were not backed by live data.
- Made the marketplace reachable from the main Inspections view.
- Replaced the dead provider `<a>` navigation with an in-app provider selection flow.
- Provider selection now loads the real provider profile before opening the real booking flow.

## Verification

`node scripts/validate-inspection-marketplace.mjs`

**21/21 PASS**

Existing transaction integrity and marketplace-core validation gates also pass.

The full npm/Vitest/TypeScript suite could not be executed in this packaging environment because the repository requires Node `>=22.22.2`, while the available runtime is Node `22.16.0`, and dependencies are therefore not installed. This is an environment limitation, not reported as a test pass.
