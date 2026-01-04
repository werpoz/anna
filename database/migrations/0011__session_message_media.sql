CREATE TABLE IF NOT EXISTS session_message_media (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  chat_jid text NOT NULL,
  message_id text NOT NULL,
  kind text NOT NULL,
  mime text,
  size bigint,
  file_name text,
  url text NOT NULL,
  sha256 text,
  width integer,
  height integer,
  duration integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_id, kind)
);

CREATE INDEX IF NOT EXISTS session_message_media_session_id_idx
  ON session_message_media (session_id);
CREATE INDEX IF NOT EXISTS session_message_media_message_id_idx
  ON session_message_media (message_id);
