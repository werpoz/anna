CREATE TABLE IF NOT EXISTS session_chats (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  chat_jid text NOT NULL,
  chat_name text,
  last_message_id text,
  last_message_ts timestamptz,
  last_message_text text,
  last_message_type text,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, chat_jid)
);

CREATE INDEX IF NOT EXISTS session_chats_tenant_id_idx ON session_chats (tenant_id);
CREATE INDEX IF NOT EXISTS session_chats_session_id_idx ON session_chats (session_id);
CREATE INDEX IF NOT EXISTS session_chats_last_message_ts_idx ON session_chats (last_message_ts DESC);
