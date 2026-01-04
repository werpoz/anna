CREATE TABLE IF NOT EXISTS session_message_reactions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  chat_jid text NOT NULL,
  message_id text NOT NULL,
  actor_jid text NOT NULL,
  from_me boolean NOT NULL DEFAULT false,
  emoji text,
  reacted_at timestamptz,
  is_removed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_id, actor_jid)
);

CREATE INDEX IF NOT EXISTS session_message_reactions_session_id_idx
  ON session_message_reactions (session_id);
CREATE INDEX IF NOT EXISTS session_message_reactions_message_id_idx
  ON session_message_reactions (message_id);
