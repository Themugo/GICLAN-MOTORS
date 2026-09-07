# KAYAD Communications Domain — End-to-End Completion

## Scope

This initiative treats direct chat and in-app notifications as one communication domain and audits the complete active path from UI/service to backend/database.

## Completed

- Chat creation contract converged on `recipientId` (matching the frontend validation contract).
- Direct conversations are protected against concurrent duplicate creation with a database uniqueness boundary.
- Chat message append is atomic and row-locked through `kayad_append_chat_message` so concurrent senders cannot lose messages through JSONB read-modify-write races.
- Chat read/seen mutation is atomic through `kayad_mark_chat_seen`.
- Chat creation supports the existing optional initial message without bypassing the canonical message/notification path.
- Notification reads, read-state mutations, deletion and reminder creation now have a canonical frontend service boundary.
- Notification state remains backend-authoritative; socket events are wake-up signals rather than synthetic records.
- Notification unread count uses the backend's authoritative count rather than counting only the current page.
- Legacy non-HTTP notification creation now resolves through the notification service rather than importing an HTTP controller.
- Removed the unused duplicate `backend/communications` implementation and its stale container copy step.
- Removed the legacy frontend `notifAPI` compatibility export.
- Updated stale validation/test references.

## Deferred / Future

- The current chat storage remains the existing JSONB message model. The atomic RPCs make that model safe for concurrent writes without introducing a second messaging schema.
- Realtime delivery remains Socket.IO-backed; the database remains authoritative.
- Email/SMS remain optional notification delivery channels controlled by the existing user preferences.

## Verification

- `scripts/validate-communications-initiative.mjs`: 10/10 PASS.
- `scripts/validate-phase50.mjs`: 11/11 PASS.
- Backend syntax checks passed for the modified communication/notification controllers and services.
