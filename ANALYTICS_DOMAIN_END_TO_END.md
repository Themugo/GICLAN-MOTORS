# KAYAD Analytics Domain — End to End

## Scope
Canonical executive and sales analytics derived from authoritative PostgreSQL/Supabase data.

## Completed
- Replaced legacy Mongoose aggregation in executive analytics with `backend/services/executiveAnalytics.service.js`.
- Replaced legacy Mongoose aggregation in sales dashboard with the same canonical analytics service.
- Executive metrics now derive from users, dealers, cars, bids, escrows and events.
- Removed hardcoded CAC/LTV assumptions and fixed platform revenue to the configured 5% platform-fee model already represented in the application.
- Added bounded reporting windows (7–365 days).
- Added live Executive Intelligence frontend surface.
- Added canonical frontend analytics transport using `httpRequest`.
- Preserved existing admin-only route protection.

## Verification
- `scripts/validate-analytics-domain.mjs`: 7/7 PASS.
- Backend syntax checks: PASS.
- Full npm/Vitest/build not claimed in the extracted environment because project dependencies are not installed.
