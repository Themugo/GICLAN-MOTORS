-- KAYAD Review Domain: canonical dealer review lifecycle and moderation.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_status_check CHECK (status IN ('pending','approved','rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_reviewer_dealer
  ON reviews(reviewer_id, dealer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_dealer_status_created
  ON reviews(dealer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_created
  ON reviews(reviewer_id, created_at DESC);

DROP POLICY IF EXISTS "select_all_reviews" ON reviews;
CREATE POLICY "select_approved_reviews" ON reviews
  FOR SELECT TO authenticated
  USING (status = 'approved' OR auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "update_own_reviews" ON reviews;
CREATE POLICY "update_own_reviews" ON reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "delete_own_reviews" ON reviews;
CREATE POLICY "delete_own_reviews" ON reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = reviewer_id);
