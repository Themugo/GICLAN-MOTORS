# Review Domain — End to End

## Canonical model
`reviews` is the single dealer-review source. Application field aliases map reviewer/dealer/car references to `reviewer_id`, `dealer_id`, and `car_id`.

## Lifecycle
`pending -> approved | rejected`

Public dealer ratings include only approved reviews. A reviewer may submit one review per dealer; the database unique index is the concurrency backstop.

## Backend
- `backend/services/review.service.js` — canonical review lifecycle, enrichment, rating aggregation and moderation.
- `backend/controllers/reviewController.js` — thin HTTP facade.
- `backend/routes/reviewRoutes.js` — canonical public/customer transport.
- `backend/routes/adminRoutes.js` — admin moderation transport.

## Database
Migration `20260907234500_review_domain_end_to_end.sql` adds moderation fields, lifecycle constraint, concurrency index, query indexes and RLS policies.

## Frontend
The legacy `reviewsAPI` compatibility transport remains temporarily for existing consumers, but new review work should use the canonical review service boundary. The existing JSX review form submits `dealer` and `carId`, which the validated backend accepts.
