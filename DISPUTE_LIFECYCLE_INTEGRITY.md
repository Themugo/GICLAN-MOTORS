# KAYAD — Dispute Lifecycle Integrity

## Scope

This initiative closes the remaining frontend placeholder paths in the dispute workflow and removes redundant, unmounted dispute UI implementations.

## Completed

- Evidence upload uses the canonical `disputeAPI.uploadEvidence` path and enforces the backend's per-evidence-type client size limits before upload.
- Mediation uses the real start/complete endpoints.
- Successful mediation outcomes transition the dispute to `resolved`; an `impasse` remains in mediation for further admin handling.
- Resolution uses the canonical dispute resolution endpoint.
- Appeals use the real submit/review endpoints.
- Evidence item reads now enforce the same party/admin authorization boundary as evidence listing.
- Evidence delete/verify operations are scoped to the requested dispute, preventing cross-dispute evidence mutation.
- Evidence timeline logging no longer dereferences `req.file` when a Cloudinary URL is supplied directly.
- Removed four redundant TypeScript dispute panels under `src/components/features/common/`; the mounted JSX implementations are the canonical UI.

## Verification

- `node --check backend/controllers/disputeController.js` — PASS
- `node scripts/validate-dispute-integrity.mjs` — 8/8 PASS
- Full Vitest could not run in the build sandbox because dependencies are not installed; sandbox Node is `v22.16.0` while the project requires `>=22.22.2`. No test pass is claimed from the sandbox.
