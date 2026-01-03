CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  status text NOT NULL,
  phone text,
  qr text,
  qr_expires_at timestamptz,
  connected_at timestamptz,
  disconnected_at timestamptz,
  disconnected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_tenant_id_idx ON sessions (tenant_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions (status);
