-- Dealer verification/onboarding integrity
ALTER TABLE dealer_verifications
  ADD COLUMN IF NOT EXISTS otp_hash TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dealer_verifications_user ON dealer_verifications("user");
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_queue ON dealer_verifications(verification_status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealers_approval_queue ON dealers(approved, is_suspended, created_at DESC);

ALTER TABLE dealer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dealer_verification_owner_read ON dealer_verifications;
CREATE POLICY dealer_verification_owner_read ON dealer_verifications
  FOR SELECT USING (auth.uid() = "user");

DROP POLICY IF EXISTS dealer_verification_owner_insert ON dealer_verifications;
CREATE POLICY dealer_verification_owner_insert ON dealer_verifications
  FOR INSERT WITH CHECK (auth.uid() = "user");

DROP POLICY IF EXISTS dealer_verification_owner_update ON dealer_verifications;
CREATE POLICY dealer_verification_owner_update ON dealer_verifications
  FOR UPDATE USING (auth.uid() = "user") WITH CHECK (auth.uid() = "user");

DROP POLICY IF EXISTS dealer_owner_read ON dealers;
CREATE POLICY dealer_owner_read ON dealers
  FOR SELECT USING (auth.uid() = "user");
