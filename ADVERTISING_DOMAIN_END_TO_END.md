# KAYAD Advertising Domain — End to End

Advertising is now treated as a real persisted platform domain rather than presentation-only content.

- Canonical service: `backend/services/advertising.service.js`
- Admin CRUD: `/api/ads`
- Public delivery: `GET /api/ads`
- Delivery metrics: `POST /api/ads/:id/events`
- Admin reporting: `GET /api/ads/stats`
- Persisted table: `public.ad_slots`
- Public reads are restricted to visible + active ads; optional start/end windows are enforced by the service.
- Admin writes are protected by `protect + adminOnly`.
- UI records real impressions on delivered ads and click events on rail ads.
- No hardcoded advertiser inventory is used.
