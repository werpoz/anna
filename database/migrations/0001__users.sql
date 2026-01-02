CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL,
  password_hash text NOT NULL,
  verification_token text NOT NULL,
  verification_code text NOT NULL,
  verification_token_expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  password_reset_token text,
  password_reset_token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
