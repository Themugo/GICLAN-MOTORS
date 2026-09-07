# KAYAD Lead / CRM Domain — End-to-End Integrity

## Scope

The dealer lead lifecycle is now treated as one canonical business domain covering lead creation, deduplication, stage progression, activity history, notes, hot/archived state, pipeline analytics, dealer dashboards and frontend transport.

## Before

- `Lead` and `LeadActivity` model wrappers were generic shells, while services called nonexistent model methods such as `updateStage()`, `addActivity()`, `createActivity()` and `getLeadTimeline()`.
- Lead activity persistence was referenced but no canonical `lead_activities` schema was present in the repository migration chain.
- Dealer platform code maintained a second lead CRUD implementation using model methods.
- Stage updates could report success without a real workflow/state-machine guarantee.
- Lead creation could race into duplicates across chat, auction and escrow entry points.
- Dealer lead UI still used the broad legacy `dealerAPI` transport.

## Canonical design

### Persistence

- `leads` remains the authoritative CRM record.
- `lead_activities` is the authoritative immutable-ish activity timeline.
- Lead activity references the lead and actor through foreign keys.
- RLS is enabled on both tables; the backend remains the application boundary.

### Creation

`kayad_create_lead_atomic` serializes identical business-key creation with a transactional advisory lock and returns the existing lead when another request already created it.

### Workflow

Supported stages:

`new → contacted → negotiating → test_drive → inspectionBooked → reserved → escrow_started → sold`

`lost` is recoverable to an early sales stage. `sold` is terminal.

`kayad_transition_lead_atomic` locks the lead, validates the transition, updates conversion/lost timestamps, and records the stage-change activity in the same database transaction.

### Activity

All lead timeline writes use the shared DB adapter. Activity metadata is JSONB so existing event producers can attach source-specific information without another persistence model.

### Frontend

`src/services/leadApi.ts` is the canonical frontend transport. `DealerLeadsTab` no longer depends on the broad legacy `dealerAPI` object.

## Verification

- Lead CRM domain validator: **16/16 PASS**.
- Backend syntax checks passed for the changed lead service, timeline service, lead controller and dealer platform controller.
- The available Supabase project `KAYAD EA` currently exposes no public tables and no migration history through the connected Supabase tooling, so the new migration was **not applied to that project** and no false live-database verification is claimed.
