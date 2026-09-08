-- KAYAD Communications & Support lifecycle hardening
-- Makes the active chat JSONB path atomic and strengthens canonical support/notification data.

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read, created_at DESC);

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

UPDATE support_tickets
SET message_count = jsonb_array_length(CASE WHEN jsonb_typeof(messages) = 'array' THEN messages ELSE '[]'::jsonb END)
WHERE message_count = 0;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created
  ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_queue
  ON support_tickets(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_queue
  ON support_tickets(assigned_to, status, created_at DESC);

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_ticket_status_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_ticket_status_check
  CHECK (status IN ('open','in_progress','waiting_on_user','waiting_on_internal','resolved','closed','escalated'));

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_ticket_priority_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_ticket_priority_check
  CHECK (priority IN ('low','medium','high','urgent'));

CREATE OR REPLACE FUNCTION kayad_append_support_message(
  p_ticket_id uuid,
  p_sender_id uuid,
  p_sender_role text,
  p_content text,
  p_is_internal boolean DEFAULT false,
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ticket support_tickets%ROWTYPE;
  v_message jsonb;
  v_now timestamptz := now();
BEGIN
  IF NULLIF(trim(p_content), '') IS NULL THEN
    RAISE EXCEPTION 'SUPPORT_MESSAGE_EMPTY' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_ticket FROM support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUPPORT_TICKET_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

  v_message := jsonb_build_object(
    'sender', p_sender_id,
    'senderRole', COALESCE(p_sender_role, 'user'),
    'content', p_content,
    'isInternal', COALESCE(p_is_internal, false),
    'attachments', COALESCE(p_attachments, '[]'::jsonb),
    'createdAt', v_now
  );

  UPDATE support_tickets
  SET messages = COALESCE(messages, '[]'::jsonb) || jsonb_build_array(v_message),
      message_count = COALESCE(message_count, 0) + 1,
      first_response_at = CASE
        WHEN p_sender_role NOT IN ('user', 'customer') AND first_response_at IS NULL THEN v_now
        ELSE first_response_at END,
      status = CASE
        WHEN p_is_internal THEN status
        WHEN p_sender_role IN ('user', 'customer') THEN 'waiting_on_internal'
        ELSE 'in_progress' END,
      updated_at = v_now
  WHERE id = p_ticket_id;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION kayad_append_support_message(uuid, uuid, text, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_append_support_message(uuid, uuid, text, text, boolean, jsonb) TO service_role;

COMMENT ON FUNCTION kayad_append_support_message(uuid, uuid, text, text, boolean, jsonb)
IS 'Atomic support-ticket message append. Locks the canonical case row and updates message_count/SLA/status together.';
