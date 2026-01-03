CREATE TABLE IF NOT EXISTS session_messages (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  chat_jid text NOT NULL,
  message_id text NOT NULL,
  from_me boolean NOT NULL DEFAULT false,
  sender_jid text,
  timestamp timestamptz,
  type text,
  text text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_id)
);

CREATE INDEX IF NOT EXISTS session_messages_session_id_idx ON session_messages (session_id);
CREATE INDEX IF NOT EXISTS session_messages_chat_jid_ts_idx
  ON session_messages (chat_jid, timestamp DESC, message_id DESC);
CREATE INDEX IF NOT EXISTS session_messages_tenant_id_idx ON session_messages (tenant_id);
