-- Communications integrity: make the active `chats` JSONB message store safe
-- against concurrent writers and prevent duplicate direct conversations.

CREATE UNIQUE INDEX IF NOT EXISTS uq_chats_participants_car
  ON chats (participants, COALESCE(car, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE OR REPLACE FUNCTION kayad_append_chat_message(
  p_chat_id uuid,
  p_sender_id uuid,
  p_text text,
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_chat chats%ROWTYPE;
  v_message jsonb;
  v_message_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
BEGIN
  SELECT * INTO v_chat FROM chats WHERE id = p_chat_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF v_chat."isBlocked" THEN RAISE EXCEPTION 'CHAT_BLOCKED' USING ERRCODE = 'P0001'; END IF;
  IF NOT (p_sender_id = ANY(v_chat.participants)) THEN RAISE EXCEPTION 'CHAT_FORBIDDEN' USING ERRCODE = 'P0001'; END IF;
  IF NULLIF(trim(p_text), '') IS NULL THEN RAISE EXCEPTION 'CHAT_MESSAGE_EMPTY' USING ERRCODE = 'P0001'; END IF;

  v_message := jsonb_build_object(
    'id', v_message_id,
    'sender', p_sender_id,
    'text', p_text,
    'createdAt', v_created_at,
    'seenBy', '[]'::jsonb,
    'attachments', COALESCE(p_attachments, '[]'::jsonb)
  );

  UPDATE chats
  SET messages = COALESCE(messages, '[]'::jsonb) || jsonb_build_array(v_message),
      "lastMessage" = p_text,
      "lastMessageAt" = v_created_at,
      "updatedAt" = v_created_at
  WHERE id = p_chat_id;

  RETURN v_message;
END;
$$;

CREATE OR REPLACE FUNCTION kayad_mark_chat_seen(
  p_chat_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_chat chats%ROWTYPE;
BEGIN
  SELECT * INTO v_chat FROM chats WHERE id = p_chat_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF NOT (p_user_id = ANY(v_chat.participants)) THEN RAISE EXCEPTION 'CHAT_FORBIDDEN' USING ERRCODE = 'P0001'; END IF;

  UPDATE chats
  SET messages = COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN (m->>'sender')::uuid <> p_user_id
          AND NOT (COALESCE(m->'seenBy', '[]'::jsonb) @> jsonb_build_array(p_user_id::text))
        THEN jsonb_set(m, '{seenBy}', COALESCE(m->'seenBy', '[]'::jsonb) || jsonb_build_array(p_user_id::text))
        ELSE m
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(COALESCE(v_chat.messages, '[]'::jsonb)) WITH ORDINALITY AS x(m, ord)
  ), '[]'::jsonb),
  "updatedAt" = now()
  WHERE id = p_chat_id;
END;
$$;

REVOKE ALL ON FUNCTION kayad_append_chat_message(uuid, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_mark_chat_seen(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_append_chat_message(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION kayad_mark_chat_seen(uuid, uuid) TO service_role;
