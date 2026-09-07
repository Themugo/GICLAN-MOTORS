ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

UPDATE support_tickets
SET ticket_number = 'SUP-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6))
WHERE ticket_number IS NULL;

UPDATE support_tickets
SET message_count = jsonb_array_length(CASE WHEN jsonb_typeof(messages) = 'array' THEN messages ELSE '[]'::jsonb END)
WHERE message_count = 0;

ALTER TABLE support_tickets
  ALTER COLUMN ticket_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status ON support_tickets(assigned_to, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_status ON support_tickets(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_first_response ON support_tickets(first_response_at, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_resolution ON support_tickets(resolved_at, created_at);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_tickets_user_read ON support_tickets;
CREATE POLICY support_tickets_user_read ON support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS support_tickets_user_insert ON support_tickets;
CREATE POLICY support_tickets_user_insert ON support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE support_tickets IS 'Canonical KAYAD customer-support case record; ticket lifecycle, SLA, assignment, messages and CSAT live here.';
