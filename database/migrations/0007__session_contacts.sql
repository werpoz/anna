CREATE TABLE IF NOT EXISTS session_contacts (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL,
  contact_jid text NOT NULL,
  contact_lid text,
  phone_number text,
  name text,
  notify text,
  verified_name text,
  img_url text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, contact_jid)
);

CREATE INDEX IF NOT EXISTS session_contacts_tenant_id_idx ON session_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS session_contacts_session_id_idx ON session_contacts (session_id);
CREATE INDEX IF NOT EXISTS session_contacts_contact_jid_idx ON session_contacts (contact_jid);
