CREATE TABLE IF NOT EXISTS session_auth_creds (
  session_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  creds jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_auth_keys (
  session_id text NOT NULL,
  tenant_id text NOT NULL,
  key_type text NOT NULL,
  key_id text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, key_type, key_id)
);

CREATE INDEX IF NOT EXISTS session_auth_creds_tenant_id_idx ON session_auth_creds (tenant_id);
CREATE INDEX IF NOT EXISTS session_auth_keys_session_id_idx ON session_auth_keys (session_id);
CREATE INDEX IF NOT EXISTS session_auth_keys_tenant_id_idx ON session_auth_keys (tenant_id);
