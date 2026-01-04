ALTER TABLE session_messages
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS status_at timestamptz;

CREATE INDEX IF NOT EXISTS session_messages_status_idx ON session_messages (status);
