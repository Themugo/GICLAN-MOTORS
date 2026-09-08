# Governance Lifecycle — End-to-End Completion

## Scope

The Governance Studio was previously wired to a real route surface but every governance domain handler except audit logs returned HTTP 501. The authoritative migration already contained the core governance tables, creating a mismatch between schema availability and API availability.

This initiative converges the complete governance path:

**Governance Studio → API → controller → canonical Postgres tables → audited lifecycle transitions → compliance/reporting**

## Implemented

- Activated dashboard aggregation from persisted governance records.
- Activated policy list/detail/create/update lifecycle.
- Activated change request create → submit → approve/reject lifecycle with atomic status guards.
- Activated approval rule list/create/update lifecycle.
- Activated feature lifecycle create/stage transition.
- Activated risk create/status/mitigation lifecycle.
- Activated enterprise standards creation/listing.
- Activated country-rule creation/listing.
- Activated partner-requirement creation/listing.
- Activated release create/status lifecycle.
- Activated decision-register creation/listing.
- Kept audit logs sourced from the canonical audit log table.
- Added data-derived compliance scoring; removed synthetic UI compliance values.
- Added governance report generation from persisted records.
- Added deterministic governance help content without fabricated operational data.
- Added database state constraints, operational indexes, partial uniqueness protections and `updated_at` triggers.
- Added a dedicated validation command.

## State safety

Change approval/rejection and feature/risk/release transitions use conditional updates so stale clients cannot silently overwrite a state that changed between read and write.

## Deployment note

The migration is committed to the repository but was not applied to a live Supabase project during this package build. Live database application remains a deployment operation against the target environment.
