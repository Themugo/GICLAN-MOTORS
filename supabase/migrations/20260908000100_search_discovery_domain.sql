-- Search & Discovery domain hardening
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS notify_on_new_match boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_created ON saved_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cars_search_status_created ON cars(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cars_search_brand_model ON cars(brand, model);
