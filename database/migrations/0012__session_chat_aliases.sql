CREATE TABLE IF NOT EXISTS session_chat_aliases (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  chat_key text NOT NULL,
  alias text NOT NULL,
  alias_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, alias)
);

CREATE INDEX IF NOT EXISTS session_chat_aliases_chat_key_idx
  ON session_chat_aliases (session_id, chat_key);
